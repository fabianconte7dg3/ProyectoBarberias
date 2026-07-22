import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { runInTenantScope } from '../database/tenant/tenant.utils';
import { eq, and } from 'drizzle-orm';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  FilaImportClienteDto,
  FilaImportProductoDto,
  FilaImportServicioDto,
} from './dto/import-filas.dto';

interface JobPayload {
  trabajoId: string;
  tenantId: string;
  tipo: 'clientes' | 'productos' | 'servicios';
  filas: Array<{ rowNumber: number; data: Record<string, any> }>;
}

@Processor('importaciones')
@Injectable()
export class ImportacionesProcessor extends WorkerHost {
  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>
  ) {
    super();
  }

  async process(job: Job<JobPayload>): Promise<any> {
    const { trabajoId, tenantId, tipo, filas } = job.data;
    console.log(`[ImportacionesProcessor] Procesando trabajo ${trabajoId} para tenant ${tenantId} (${tipo})`);

    return await runInTenantScope(this.db, tenantId, async (tx) => {
      let creados = 0;
      let actualizados = 0;
      let erroresCount = 0;
      const detalleErrores: Array<{ fila: number; motivo: string }> = [];

      for (const item of filas) {
        const { rowNumber, data } = item;

        try {
          if (tipo === 'clientes') {
            const dto = plainToInstance(FilaImportClienteDto, {
              nombreCompleto: data.nombrecompleto || data.nombre,
              telefonoWhatsapp: data.telefonowhatsapp || data.telefono || data.celular,
              email: data.email || data.emailfacturacion,
              notasPreferencia: data.notaspreferencia || data.notas,
              aceptaMarketing: data.aceptamarketing === 'true' || data.aceptamarketing === '1' || data.aceptamarketing === true,
            });

            const validationErrors = await validate(dto);
            if (validationErrors.length > 0) {
              const msg = validationErrors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ');
              erroresCount++;
              detalleErrores.push({ fila: rowNumber, motivo: msg });
              continue;
            }

            // Regla de Merge de Clientes: Buscar por telefonoWhatsapp
            const [clienteExistente] = await tx
              .select()
              .from(schema.clientes)
              .where(eq(schema.clientes.telefonoWhatsapp, dto.telefonoWhatsapp));

            if (clienteExistente) {
              // Actualizar SOLO datos editables de contacto
              await tx
                .update(schema.clientes)
                .set({
                  ...(dto.nombreCompleto && { nombreCompleto: dto.nombreCompleto }),
                  ...(dto.email && { emailFacturacion: dto.email }),
                  ...(dto.notasPreferencia && { notasPreferencia: dto.notasPreferencia }),
                  ...(dto.aceptaMarketing !== undefined && { aceptaMarketing: dto.aceptaMarketing }),
                })
                .where(eq(schema.clientes.id, clienteExistente.id));
              actualizados++;
            } else {
              // Crear cliente nuevo
              await tx.insert(schema.clientes).values({
                tenantId,
                telefonoWhatsapp: dto.telefonoWhatsapp,
                nombreCompleto: dto.nombreCompleto,
                emailFacturacion: dto.email || null,
                notasPreferencia: dto.notasPreferencia || null,
                aceptaMarketing: dto.aceptaMarketing ?? false,
              });
              creados++;
            }

          } else if (tipo === 'productos') {
            const dto = plainToInstance(FilaImportProductoDto, {
              nombre: data.nombre || data.producto,
              precioVenta: data.precioventa || data.precio,
              costoCompra: data.costocompra || data.costo,
              stockActual: data.stockactual || data.stock || 0,
              stockMinimo: data.stockminimo || data.minimo || 2,
            });

            const validationErrors = await validate(dto);
            if (validationErrors.length > 0) {
              const msg = validationErrors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ');
              erroresCount++;
              detalleErrores.push({ fila: rowNumber, motivo: msg });
              continue;
            }

            // Regla de Merge de Productos: Buscar por Nombre
            const [productoExistente] = await tx
              .select()
              .from(schema.productos)
              .where(eq(schema.productos.nombre, dto.nombre));

            if (productoExistente) {
              // Actualizar precio, costo y stock mínimo, pero NUNCA pisar stockActual existente
              await tx
                .update(schema.productos)
                .set({
                  precioVenta: dto.precioVenta.toString(),
                  costoCompra: dto.costoCompra.toString(),
                  ...(dto.stockMinimo !== undefined && { stockMinimo: dto.stockMinimo }),
                })
                .where(eq(schema.productos.id, productoExistente.id));
              actualizados++;
            } else {
              // Crear producto nuevo con su stock inicial
              await tx.insert(schema.productos).values({
                tenantId,
                nombre: dto.nombre,
                precioVenta: dto.precioVenta.toString(),
                costoCompra: dto.costoCompra.toString(),
                stockActual: dto.stockActual,
                stockMinimo: dto.stockMinimo ?? 2,
              });
              creados++;
            }

          } else if (tipo === 'servicios') {
            const dto = plainToInstance(FilaImportServicioDto, {
              nombre: data.nombre || data.servicio,
              precioBase: data.preciobase || data.precio,
              duracionMinutos: data.duracionminutos || data.duracion || 30,
            });

            const validationErrors = await validate(dto);
            if (validationErrors.length > 0) {
              const msg = validationErrors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ');
              erroresCount++;
              detalleErrores.push({ fila: rowNumber, motivo: msg });
              continue;
            }

            const [servicioExistente] = await tx
              .select()
              .from(schema.servicios)
              .where(eq(schema.servicios.nombre, dto.nombre));

            if (servicioExistente) {
              await tx
                .update(schema.servicios)
                .set({
                  precioBase: dto.precioBase.toString(),
                  duracionMinutos: dto.duracionMinutos,
                })
                .where(eq(schema.servicios.id, servicioExistente.id));
              actualizados++;
            } else {
              await tx.insert(schema.servicios).values({
                tenantId,
                nombre: dto.nombre,
                precioBase: dto.precioBase.toString(),
                duracionMinutos: dto.duracionMinutos,
              });
              creados++;
            }
          }
        } catch (err: any) {
          erroresCount++;
          detalleErrores.push({ fila: rowNumber, motivo: err.message || 'Error desconocido al procesar fila' });
        }
      }

      // Determinar estado final
      let estadoFinal: 'completado' | 'completado_con_errores' | 'fallido' = 'completado';
      if (erroresCount > 0 && (creados > 0 || actualizados > 0)) {
        estadoFinal = 'completado_con_errores';
      } else if (erroresCount > 0 && creados === 0 && actualizados === 0) {
        estadoFinal = 'fallido';
      }

      // Actualizar estado del trabajo en trabajos_importacion
      await tx
        .update(schema.trabajosImportacion)
        .set({
          estado: estadoFinal,
          filasCreadas: creados,
          filasActualizadas: actualizados,
          filasConError: erroresCount,
          detalleErrores,
          completadoAt: new Date(),
        })
        .where(eq(schema.trabajosImportacion.id, trabajoId));

      return { estado: estadoFinal, creados, actualizados, erroresCount };
    });
  }
}
