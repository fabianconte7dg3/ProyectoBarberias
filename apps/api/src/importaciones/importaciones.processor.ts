import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { runInTenantScope } from '../database/tenant/tenant.utils';
import { eq, sql } from 'drizzle-orm';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  FilaImportClienteDto,
  FilaImportProductoDto,
  FilaImportServicioDto,
  FilaImportCitaHistoricaDto,
} from './dto/import-filas.dto';

interface JobPayload {
  trabajoId: string;
  tenantId: string;
  tipo: 'clientes' | 'productos' | 'servicios' | 'citas_historicas';
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

        // Cada fila corre bajo su propio SAVEPOINT: si una fila dispara un error real
        // de Postgres (ej. el EXCLUDE de citas_historicas por horario solapado), un
        // ROLLBACK TO SAVEPOINT despoisona la transacción para que las filas siguientes
        // se sigan procesando — sin esto, un solo error de DB (no de validación) tumbaría
        // el resto del lote entero, porque runInTenantScope corre todo en 1 transacción.
        await tx.execute(sql`SAVEPOINT fila_import`);
        try {
          if (tipo === 'clientes') {
            const dto = plainToInstance(FilaImportClienteDto, {
              nombreCompleto: data.nombrecompleto || data.nombre,
              telefonoWhatsapp: data.telefonowhatsapp || data.telefono || data.celular,
              email: data.email || data.emailfacturacion,
              notasPreferencia: data.notaspreferencia || data.notas,
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
              // Actualizar SOLO datos editables de contacto (NUNCA aceptaMarketing ni métricas calculadas)
              await tx
                .update(schema.clientes)
                .set({
                  ...(dto.nombreCompleto && { nombreCompleto: dto.nombreCompleto }),
                  ...(dto.email && { emailFacturacion: dto.email }),
                  ...(dto.notasPreferencia && { notasPreferencia: dto.notasPreferencia }),
                })
                .where(eq(schema.clientes.id, clienteExistente.id));
              actualizados++;
            } else {
              // Crear cliente nuevo con aceptaMarketing = false (NUNCA masivo por CSV)
              await tx.insert(schema.clientes).values({
                tenantId,
                telefonoWhatsapp: dto.telefonoWhatsapp,
                nombreCompleto: dto.nombreCompleto,
                emailFacturacion: dto.email || null,
                notasPreferencia: dto.notasPreferencia || null,
                aceptaMarketing: false,
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

          } else if (tipo === 'citas_historicas') {
            const dto = plainToInstance(FilaImportCitaHistoricaDto, {
              telefonoWhatsapp: data.telefonowhatsapp || data.telefono || data.celular,
              servicioNombre: data.servicionombre || data.servicio,
              fecha: data.fecha,
              empleadoNombre: data.empleadonombre || data.empleado,
              estado: data.estado,
              notas: data.notas || data.motivo,
              monto: data.monto,
            });

            const validationErrors = await validate(dto);
            if (validationErrors.length > 0) {
              const msg = validationErrors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ');
              erroresCount++;
              detalleErrores.push({ fila: rowNumber, motivo: msg });
              continue;
            }

            // Cliente y servicio deben existir ya — una cita histórica no crea
            // fantasmas con datos parciales (ver comentario del DTO).
            const [clienteExistente] = await tx
              .select()
              .from(schema.clientes)
              .where(eq(schema.clientes.telefonoWhatsapp, dto.telefonoWhatsapp));

            if (!clienteExistente) {
              erroresCount++;
              detalleErrores.push({ fila: rowNumber, motivo: `No existe un cliente con el teléfono ${dto.telefonoWhatsapp}. Impórtalo primero.` });
              continue;
            }

            const [servicioExistente] = await tx
              .select()
              .from(schema.servicios)
              .where(eq(schema.servicios.nombre, dto.servicioNombre));

            if (!servicioExistente) {
              erroresCount++;
              detalleErrores.push({ fila: rowNumber, motivo: `No existe un servicio llamado "${dto.servicioNombre}".` });
              continue;
            }

            let empleadoId: string | undefined;
            if (dto.empleadoNombre) {
              const [empleadoExistente] = await tx
                .select({ id: schema.usuarios.id })
                .from(schema.usuarios)
                .where(eq(schema.usuarios.nombreCompleto, dto.empleadoNombre));
              if (!empleadoExistente) {
                erroresCount++;
                detalleErrores.push({ fila: rowNumber, motivo: `No existe un empleado llamado "${dto.empleadoNombre}".` });
                continue;
              }
              empleadoId = empleadoExistente.id;
            } else {
              const staffActivo = await tx
                .select({ id: schema.usuarios.id })
                .from(schema.usuarios)
                .where(eq(schema.usuarios.activo, true))
                .limit(2);
              if (staffActivo.length !== 1) {
                erroresCount++;
                detalleErrores.push({ fila: rowNumber, motivo: 'Debes especificar empleadoNombre (hay más de un empleado activo, o ninguno).' });
                continue;
              }
              empleadoId = staffActivo[0].id;
            }

            const inicioEstimado = new Date(dto.fecha);
            const finEstimado = new Date(inicioEstimado.getTime() + servicioExistente.duracionMinutos * 60000);
            const estadoFila = dto.estado || 'completada';

            await tx.insert(schema.citas).values({
              tenantId,
              clienteId: clienteExistente.id,
              empleadoId,
              servicioId: servicioExistente.id,
              notas: dto.notas || null,
              inicioEstimado,
              finEstimado,
              origen: 'importacion_historica',
              estado: estadoFila,
              confirmada: true, // histórica — no aplica el flujo de confirmación
              idempotencyKey: `hist_${trabajoId}_${rowNumber}`,
            });

            if (estadoFila === 'completada') {
              await tx.update(schema.clientes)
                .set({
                  totalAsistencias: clienteExistente.totalAsistencias + 1,
                  ...(dto.monto !== undefined && { totalGastado: (Number(clienteExistente.totalGastado) + dto.monto).toString() }),
                })
                .where(eq(schema.clientes.id, clienteExistente.id));
            } else if (estadoFila === 'ausente_strike') {
              const [citaInsertada] = await tx
                .select({ id: schema.citas.id })
                .from(schema.citas)
                .where(eq(schema.citas.idempotencyKey, `hist_${trabajoId}_${rowNumber}`));

              await tx.update(schema.clientes)
                .set({ ausenciasStrikes: clienteExistente.ausenciasStrikes + 1 })
                .where(eq(schema.clientes.id, clienteExistente.id));

              if (citaInsertada) {
                await tx.insert(schema.inasistencias).values({
                  tenantId,
                  clienteId: clienteExistente.id,
                  citaId: citaInsertada.id,
                  fecha: inicioEstimado,
                });
              }
            }

            creados++;
          }

          await tx.execute(sql`RELEASE SAVEPOINT fila_import`);
        } catch (err: any) {
          await tx.execute(sql`ROLLBACK TO SAVEPOINT fila_import`);
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
