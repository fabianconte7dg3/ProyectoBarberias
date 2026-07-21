import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import { citas, transacciones, usuarios, servicios, detallesTransaccion, productos } from '../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { CobrarCitaDto } from './dto/cobrar-cita.dto';
import { YappyService } from '../yappy/yappy.service';
import { DgiService } from '../dgi/dgi.service';
import { ProductosService } from '../productos/productos.service';
import * as crypto from 'crypto';

@Injectable()
export class TransaccionesService {
  constructor(
    private readonly yappyService: YappyService,
    private readonly dgiService: DgiService,
    private readonly productosService: ProductosService,
  ) {}

  async cobrarCita(citaId: string | null, dto: CobrarCitaDto, user?: any) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    const idempotencyKey = dto.idempotencyKey || `tx_${citaId || 'mostrador'}_${Date.now()}`;

    // 1. Verificación de Idempotencia por idempotencyKey
    const txExistenteKey = await db.query.transacciones.findFirst({
      where: and(
        eq(transacciones.tenantId, tenantId),
        eq(transacciones.idempotencyKey, idempotencyKey)
      ),
      with: {
        detalles: true,
      }
    });

    if (txExistenteKey) {
      // Idempotencia: Devolver la transacción ya procesada sin cobrar ni descontar stock dos veces
      return {
        ...txExistenteKey,
        idempotent: true,
      };
    }

    let cita: any = null;
    let barbero: any = null;
    let subtotalServicio = 0;
    let comisionServicio = 0;

    // 2. Procesar Cita (si aplica)
    if (citaId) {
      cita = await db.query.citas.findFirst({
        where: eq(citas.id, citaId),
        with: {
          barbero: true,
          servicio: true,
        },
      });

      if (!cita) {
        throw new NotFoundException('Cita no encontrada');
      }

      if (user && user.rol === 'barbero' && cita.barberoId !== user.userId) {
        throw new ForbiddenException('No tienes permisos para cobrar citas asignadas a otro barbero.');
      }

      if (cita.estado === 'completada' || cita.estado === 'cancelada') {
        throw new ConflictException(`Esta cita ya fue procesada o cancelada (Estado: ${cita.estado}).`);
      }

      const txExistenteCita = await db.query.transacciones.findFirst({
        where: eq(transacciones.citaId, citaId),
      });

      if (txExistenteCita) {
        throw new ConflictException('Ya existe un cobro registrado para esta cita.');
      }

      barbero = cita.barbero;
      subtotalServicio = Number(cita.servicio.precioBase || 0);
      const pctServicio = Number(barbero.porcentajeComision || 0);
      comisionServicio = (subtotalServicio * pctServicio) / 100;
    } else if (dto.barberoId) {
      // Venta directa de mostrador sin cita: Obtener barbero vendedor si fue asignado
      barbero = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, dto.barberoId),
      });
    }

    // 3. Procesar Productos Adicionales (Descuento atómico de stock)
    const lineasDetalle: {
      tipoItem: 'servicio' | 'producto';
      servicioId?: string;
      productoId?: string;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      comisionAplicada: number;
    }[] = [];

    if (cita) {
      lineasDetalle.push({
        tipoItem: 'servicio',
        servicioId: cita.servicio.id,
        cantidad: 1,
        precioUnitario: subtotalServicio,
        subtotal: subtotalServicio,
        comisionAplicada: comisionServicio,
      });
    }

    let subtotalProductosTotal = 0;
    let comisionProductosTotal = 0;

    if (dto.productosAdicionales && dto.productosAdicionales.length > 0) {
      for (const item of dto.productosAdicionales) {
        // Descuento atómico de stock (lanza BadRequestException si no hay stock)
        const prod = await this.productosService.descontarStockAtomico(item.productoId, item.cantidad, db);

        const precioUnitario = Number(prod.precio_venta || prod.precioVenta || 0);
        const subtotalProd = precioUnitario * item.cantidad;
        const pctComisionProd = Number(barbero?.porcentajeComisionProducto || 0);
        const comisionProd = (subtotalProd * pctComisionProd) / 100;

        subtotalProductosTotal += subtotalProd;
        comisionProductosTotal += comisionProd;

        lineasDetalle.push({
          tipoItem: 'producto',
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario,
          subtotal: subtotalProd,
          comisionAplicada: comisionProd,
        });
      }
    }

    if (!cita && lineasDetalle.length === 0) {
      throw new BadRequestException('Una venta de mostrador debe incluir al menos un producto.');
    }

    const totalFacturado = subtotalServicio + subtotalProductosTotal;
    const comisionBarberoTotal = comisionServicio + comisionProductosTotal;
    const yappyOrderId = dto.metodoPago === 'yappy' ? crypto.randomBytes(6).toString('hex') : null;

    // 4. Insertar Transacción Maestro
    const [nuevaTransaccion] = await db.insert(transacciones).values({
      tenantId,
      citaId: cita ? cita.id : null,
      idempotencyKey,
      metodoPago: dto.metodoPago,
      totalFacturado: totalFacturado.toFixed(2),
      montoEfectivoIngresado: dto.montoEfectivoIngresado ? dto.montoEfectivoIngresado.toFixed(2) : null,
      comisionBarbero: comisionBarberoTotal.toFixed(2),
      propinaBarbero: dto.propinaBarbero ? dto.propinaBarbero.toFixed(2) : '0.00',
      rucCliente: dto.rucCliente,
      nombreFiscalCliente: dto.nombreFiscalCliente,
      yappyOrderId,
    }).returning();

    // 5. Insertar Detalles de Transacción (Líneas de Venta)
    for (const detalle of lineasDetalle) {
      await db.insert(detallesTransaccion).values({
        tenantId,
        transaccionId: nuevaTransaccion.id,
        tipoItem: detalle.tipoItem,
        servicioId: detalle.servicioId || null,
        productoId: detalle.productoId || null,
        cantidad: detalle.cantidad,
        precioUnitario: detalle.precioUnitario.toFixed(2),
        subtotal: detalle.subtotal.toFixed(2),
        comisionAplicada: detalle.comisionAplicada.toFixed(2),
      });
    }

    // 6. Procesar Pago Yappy o Actualizar Cita
    let yappyData = null;
    if (dto.metodoPago === 'yappy') {
      yappyData = await this.yappyService.initiatePayment(tenantId, yappyOrderId!, totalFacturado);
    }

    if (cita && dto.metodoPago !== 'yappy') {
      await db.update(citas)
        .set({ estado: 'completada' })
        .where(eq(citas.id, cita.id));
        
      this.dgiService.emitirFacturaAsync(
        tenantId,
        nuevaTransaccion.id,
        nuevaTransaccion.totalFacturado,
        dto.rucCliente,
        dto.nombreFiscalCliente
      ).catch(err => console.error('Error al emitir factura a DGI:', err));
    }

    return {
      ...nuevaTransaccion,
      yappyData,
      detalles: lineasDetalle,
    };
  }

  async getHistorialTransacciones(limit = 20) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    return db.query.transacciones.findMany({
      where: eq(transacciones.tenantId, tenantId),
      orderBy: [desc(transacciones.createdAt)],
      limit,
      with: {
        cita: {
          with: {
            barbero: true,
            servicio: true,
            cliente: true,
          }
        },
        detalles: {
          with: {
            servicio: true,
            producto: true,
          }
        }
      }
    });
  }
}
