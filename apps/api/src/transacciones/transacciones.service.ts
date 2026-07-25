import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import { citas, transacciones, usuarios, servicios, detallesTransaccion, productos } from '../database/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { CobrarCitaDto } from './dto/cobrar-cita.dto';
import { YappyService } from '../yappy/yappy.service';
import { DgiService } from '../dgi/dgi.service';
import { ProductosService } from '../productos/productos.service';
import * as crypto from 'crypto';

type LineaDetalle = {
  tipoItem: 'servicio' | 'producto';
  servicioId?: string;
  productoId?: string;
  citaId?: string;
  empleadoId?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  comisionAplicada: number;
};

@Injectable()
export class TransaccionesService {
  constructor(
    private readonly yappyService: YappyService,
    private readonly dgiService: DgiService,
    private readonly productosService: ProductosService,
  ) {}

  /**
   * Construye las líneas de detalle de servicio para una cita ya cargada (con sus
   * relaciones servicio/combo.servicios.servicio) y su empleado asignado. Un combo
   * genera una línea por cada servicio interno ("bundle rastreado" — ver
   * Plan_Multi_Industria_Fase4_CombosGruposTemplates.md §2); una cita normal genera
   * una sola línea. citaId/empleadoId se etiquetan siempre, no solo en cobro grupal,
   * para poder deduplicar citas de combo y atribuir comisión en reportes.service.ts.
   */
  private construirLineasDeCita(cita: any, empleado: any): LineaDetalle[] {
    const pctServicio = Number(empleado?.porcentajeComision || 0);

    if (cita.comboId) {
      if (!cita.combo || !cita.combo.servicios || cita.combo.servicios.length === 0) {
        throw new NotFoundException('El combo de esta cita ya no existe o no tiene servicios configurados.');
      }
      return cita.combo.servicios.map((cs: any) => {
        const precio = Number(cs.precioAsignado);
        return {
          tipoItem: 'servicio' as const,
          servicioId: cs.servicioId,
          citaId: cita.id,
          empleadoId: empleado?.id,
          cantidad: 1,
          precioUnitario: precio,
          subtotal: precio,
          comisionAplicada: (precio * pctServicio) / 100,
        };
      });
    }

    const precio = Number(cita.servicio?.precioBase || 0);
    return [{
      tipoItem: 'servicio' as const,
      servicioId: cita.servicio?.id,
      citaId: cita.id,
      empleadoId: empleado?.id,
      cantidad: 1,
      precioUnitario: precio,
      subtotal: precio,
      comisionAplicada: (precio * pctServicio) / 100,
    }];
  }

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
    let empleado: any = null;

    // 2. Procesar Cita (si aplica)
    if (citaId) {
      cita = await db.query.citas.findFirst({
        where: eq(citas.id, citaId),
        with: {
          empleado: true,
          servicio: true,
          combo: { with: { servicios: { with: { servicio: true } } } },
        },
      });

      if (!cita) {
        throw new NotFoundException('Cita no encontrada');
      }

      if (user && user.rol === 'empleado' && cita.empleadoId !== user.userId) {
        throw new ForbiddenException('No tienes permisos para cobrar citas asignadas a otro empleado.');
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

      empleado = cita.empleado;
    } else if (dto.empleadoId) {
      // Venta directa de mostrador sin cita: Obtener empleado vendedor si fue asignado
      empleado = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, dto.empleadoId),
      });
    }

    // 3. Procesar Productos Adicionales (Descuento atómico de stock)
    const lineasDetalle: LineaDetalle[] = [];

    if (cita) {
      lineasDetalle.push(...this.construirLineasDeCita(cita, empleado));
    }

    if (dto.productosAdicionales && dto.productosAdicionales.length > 0) {
      for (const item of dto.productosAdicionales) {
        // Descuento atómico de stock (lanza BadRequestException si no hay stock)
        const prod = await this.productosService.descontarStockAtomico(item.productoId, item.cantidad, db);

        const precioUnitario = Number(prod.precio_venta || prod.precioVenta || 0);
        const subtotalProd = precioUnitario * item.cantidad;
        const pctComisionProd = Number(empleado?.porcentajeComisionProducto || 0);
        const comisionProd = (subtotalProd * pctComisionProd) / 100;

        lineasDetalle.push({
          tipoItem: 'producto',
          productoId: item.productoId,
          empleadoId: empleado?.id,
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

    const totalFacturado = lineasDetalle.reduce((sum, l) => sum + l.subtotal, 0);
    const comisionEmpleadoTotal = lineasDetalle.reduce((sum, l) => sum + l.comisionAplicada, 0);
    const yappyOrderId = dto.metodoPago === 'yappy' ? crypto.randomBytes(6).toString('hex') : null;

    // 4. Insertar Transacción Maestro
    const [nuevaTransaccion] = await db.insert(transacciones).values({
      tenantId,
      citaId: cita ? cita.id : null,
      idempotencyKey,
      metodoPago: dto.metodoPago,
      totalFacturado: totalFacturado.toFixed(2),
      montoEfectivoIngresado: dto.montoEfectivoIngresado ? dto.montoEfectivoIngresado.toFixed(2) : null,
      comisionEmpleado: comisionEmpleadoTotal.toFixed(2),
      propinaEmpleado: dto.propinaEmpleado ? dto.propinaEmpleado.toFixed(2) : '0.00',
      rucCliente: dto.rucCliente,
      nombreFiscalCliente: dto.nombreFiscalCliente,
      yappyOrderId,
    }).returning();

    // 5. Insertar Detalles de Transacción (Líneas de Venta)
    await this.insertarDetalles(db, tenantId, nuevaTransaccion.id, lineasDetalle);

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

  /**
   * Cobro conjunto de citas grupales (ver Plan_Multi_Industria_Fase4_CombosGruposTemplates.md
   * §3): una sola transacción/factura cubre todas las citas del grupo, aunque cada una tenga
   * un empleado distinto — cada línea de servicio queda etiquetada con su propia citaId y
   * empleadoId para que la comisión se atribuya correctamente (ver reportes.service.ts).
   * No admite productosAdicionales en esta primera versión: mezclar venta de mostrador con
   * cobro grupal complica la atribución sin un caso de uso real que lo pida todavía.
   */
  async cobrarGrupo(grupoReservaId: string, dto: CobrarCitaDto, user?: any) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    if (dto.productosAdicionales && dto.productosAdicionales.length > 0) {
      throw new BadRequestException('El cobro conjunto de un grupo no admite productos adicionales todavía — cóbralos aparte.');
    }

    const idempotencyKey = dto.idempotencyKey || `tx_grupo_${grupoReservaId}`;

    const txExistenteKey = await db.query.transacciones.findFirst({
      where: and(
        eq(transacciones.tenantId, tenantId),
        eq(transacciones.idempotencyKey, idempotencyKey)
      ),
      with: { detalles: true },
    });

    if (txExistenteKey) {
      return { ...txExistenteKey, idempotent: true };
    }

    const citasDelGrupo = await db.query.citas.findMany({
      where: eq(citas.grupoReservaId, grupoReservaId),
      with: {
        empleado: true,
        servicio: true,
        combo: { with: { servicios: { with: { servicio: true } } } },
      },
    });

    if (citasDelGrupo.length === 0) {
      throw new NotFoundException('No se encontraron citas para este grupo.');
    }

    for (const cita of citasDelGrupo) {
      if (user && user.rol === 'empleado' && cita.empleadoId !== user.userId) {
        throw new ForbiddenException('No tienes permisos para cobrar citas asignadas a otro empleado.');
      }
      if (cita.estado === 'completada' || cita.estado === 'cancelada') {
        throw new ConflictException(`La cita de ${cita.empleado?.nombreCompleto || 'un empleado'} ya fue procesada o cancelada.`);
      }
    }

    const citaIds = citasDelGrupo.map((c: any) => c.id);
    const txExistenteCita = await db.query.transacciones.findFirst({
      where: inArray(transacciones.citaId, citaIds),
    });
    if (txExistenteCita) {
      throw new ConflictException('Ya existe un cobro registrado para una de las citas de este grupo.');
    }

    const lineasDetalle: LineaDetalle[] = [];
    for (const cita of citasDelGrupo) {
      lineasDetalle.push(...this.construirLineasDeCita(cita, cita.empleado));
    }

    const totalFacturado = lineasDetalle.reduce((sum, l) => sum + l.subtotal, 0);
    const comisionEmpleadoTotal = lineasDetalle.reduce((sum, l) => sum + l.comisionAplicada, 0);
    const yappyOrderId = dto.metodoPago === 'yappy' ? crypto.randomBytes(6).toString('hex') : null;

    const [nuevaTransaccion] = await db.insert(transacciones).values({
      tenantId,
      citaId: null, // el grupo se identifica por grupoReservaId; cada cita queda en detallesTransaccion.citaId
      grupoReservaId,
      idempotencyKey,
      metodoPago: dto.metodoPago,
      totalFacturado: totalFacturado.toFixed(2),
      montoEfectivoIngresado: dto.montoEfectivoIngresado ? dto.montoEfectivoIngresado.toFixed(2) : null,
      comisionEmpleado: comisionEmpleadoTotal.toFixed(2),
      propinaEmpleado: dto.propinaEmpleado ? dto.propinaEmpleado.toFixed(2) : '0.00',
      rucCliente: dto.rucCliente,
      nombreFiscalCliente: dto.nombreFiscalCliente,
      yappyOrderId,
    }).returning();

    await this.insertarDetalles(db, tenantId, nuevaTransaccion.id, lineasDetalle);

    let yappyData = null;
    if (dto.metodoPago === 'yappy') {
      yappyData = await this.yappyService.initiatePayment(tenantId, yappyOrderId!, totalFacturado);
    }

    if (dto.metodoPago !== 'yappy') {
      await db.update(citas)
        .set({ estado: 'completada' })
        .where(inArray(citas.id, citaIds));

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

  private async insertarDetalles(db: any, tenantId: string, transaccionId: string, lineas: LineaDetalle[]) {
    for (const detalle of lineas) {
      await db.insert(detallesTransaccion).values({
        tenantId,
        transaccionId,
        tipoItem: detalle.tipoItem,
        servicioId: detalle.servicioId || null,
        productoId: detalle.productoId || null,
        citaId: detalle.citaId || null,
        empleadoId: detalle.empleadoId || null,
        cantidad: detalle.cantidad,
        precioUnitario: detalle.precioUnitario.toFixed(2),
        subtotal: detalle.subtotal.toFixed(2),
        comisionAplicada: detalle.comisionAplicada.toFixed(2),
      });
    }
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
            empleado: true,
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
