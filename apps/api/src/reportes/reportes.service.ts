import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import { citas, transacciones, usuarios, clientes, servicios, productos, detallesTransaccion } from '../database/schema';
import { and, eq, gte, lte, desc, sql } from 'drizzle-orm';
import { startOfMonth, endOfDay, differenceInDays, subDays, format } from 'date-fns';

@Injectable()
export class ReportesService {
  async getDashboardMetrics(desdeStr?: string, hastaStr?: string) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    let desde = desdeStr ? new Date(`${desdeStr}T00:00:00`) : subDays(new Date(), 30);
    let hasta = hastaStr ? new Date(`${hastaStr}T23:59:59.999`) : endOfDay(new Date());

    if (differenceInDays(hasta, desde) > 365) {
      throw new BadRequestException('El rango de fechas no puede exceder los 365 días.');
    }

    // 1. Obtener todas las transacciones del período con sus detalles itemizados
    const txsPeriodo = await db.query.transacciones.findMany({
      where: and(
        eq(transacciones.tenantId, tenantId),
        gte(transacciones.createdAt, desde),
        lte(transacciones.createdAt, hasta)
      ),
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

    let ingresosTotales = 0;
    let ingresosServicios = 0;
    let ingresosProductos = 0;
    const desgloseMetodosPago = { efectivo: 0, yappy: 0, mixto: 0 };

    const serviciosMap = new Map<string, { servicioId: string; nombre: string; totalCitas: number; totalRecaudado: number }>();
    const productosMap = new Map<string, { productoId: string; nombre: string; totalVendidos: number; totalRecaudado: number }>();
    const tendenciaDiariaMap = new Map<string, { fecha: string; label: string; servicios: number; productos: number; total: number }>();

    // Inicializar mapa diario con todas las fechas del rango
    const curr = new Date(desde);
    while (curr <= hasta) {
      const ymd = format(curr, 'yyyy-MM-dd');
      const label = format(curr, 'd MMM');
      tendenciaDiariaMap.set(ymd, { fecha: ymd, label, servicios: 0, productos: 0, total: 0 });
      curr.setDate(curr.getDate() + 1);
    }

    for (const tx of txsPeriodo) {
      const monto = Number(tx.totalFacturado || 0);
      ingresosTotales += monto;
      if (tx.metodoPago === 'efectivo') desgloseMetodosPago.efectivo += monto;
      else if (tx.metodoPago === 'yappy') desgloseMetodosPago.yappy += monto;
      else if (tx.metodoPago === 'mixto') desgloseMetodosPago.mixto += monto;

      // Agregación de Tendencia Diaria
      const txFechaKey = format(new Date(tx.createdAt), 'yyyy-MM-dd');
      let puntoDiario = tendenciaDiariaMap.get(txFechaKey);
      if (!puntoDiario) {
        const label = format(new Date(tx.createdAt), 'd MMM');
        puntoDiario = { fecha: txFechaKey, label, servicios: 0, productos: 0, total: 0 };
        tendenciaDiariaMap.set(txFechaKey, puntoDiario);
      }
      puntoDiario.total += monto;

      // Agregación itemizada desde detallesTransaccion
      if (tx.detalles && tx.detalles.length > 0) {
        for (const det of tx.detalles) {
          const subtotalDet = Number(det.subtotal || 0);
          if (det.tipoItem === 'servicio') {
            ingresosServicios += subtotalDet;
            puntoDiario.servicios += subtotalDet;
            const sId = det.servicioId || (tx.cita?.servicio?.id);
            const sNombre = det.servicio?.nombre || tx.cita?.servicio?.nombre || 'Servicio';
            if (sId) {
              const sStats = serviciosMap.get(sId) || { servicioId: sId, nombre: sNombre, totalCitas: 0, totalRecaudado: 0 };
              sStats.totalCitas += det.cantidad;
              sStats.totalRecaudado += subtotalDet;
              serviciosMap.set(sId, sStats);
            }
          } else if (det.tipoItem === 'producto') {
            ingresosProductos += subtotalDet;
            puntoDiario.productos += subtotalDet;
            const pId = det.productoId;
            const pNombre = det.producto?.nombre || 'Producto Retail';
            if (pId) {
              const pStats = productosMap.get(pId) || { productoId: pId, nombre: pNombre, totalVendidos: 0, totalRecaudado: 0 };
              pStats.totalVendidos += det.cantidad;
              pStats.totalRecaudado += subtotalDet;
              productosMap.set(pId, pStats);
            }
          }
        }
      } else {
        // Fallback para transacciones anteriores sin tabla de detalles
        ingresosServicios += monto;
        puntoDiario.servicios += monto;
        if (tx.cita && tx.cita.servicio) {
          const sId = tx.cita.servicio.id;
          const sNombre = tx.cita.servicio.nombre;
          const sStats = serviciosMap.get(sId) || { servicioId: sId, nombre: sNombre, totalCitas: 0, totalRecaudado: 0 };
          sStats.totalCitas += 1;
          sStats.totalRecaudado += monto;
          serviciosMap.set(sId, sStats);
        }
      }
    }

    // 2. Rendimiento y Comisiones por Barbero
    const staffBarberos = await db.query.usuarios.findMany({
      where: and(
        eq(usuarios.tenantId, tenantId),
        eq(usuarios.rol, 'barbero')
      )
    });

    const rendimientoBarberosMap = new Map<string, {
      barberoId: string;
      nombreCompleto: string;
      porcentajeComision: number;
      porcentajeComisionProducto: number;
      totalCitas: number;
      totalFacturado: number;
      comisionTotal: number;
      propinaTotal: number;
    }>();

    for (const b of staffBarberos) {
      rendimientoBarberosMap.set(b.id, {
        barberoId: b.id,
        nombreCompleto: b.nombreCompleto,
        porcentajeComision: Number(b.porcentajeComision || 0),
        porcentajeComisionProducto: Number(b.porcentajeComisionProducto || 0),
        totalCitas: 0,
        totalFacturado: 0,
        comisionTotal: 0,
        propinaTotal: 0,
      });
    }

    for (const tx of txsPeriodo) {
      const bId = tx.cita?.barbero?.id;
      if (bId) {
        let stats = rendimientoBarberosMap.get(bId);
        if (!stats && tx.cita?.barbero) {
          stats = {
            barberoId: bId,
            nombreCompleto: tx.cita.barbero.nombreCompleto,
            porcentajeComision: Number(tx.cita.barbero.porcentajeComision || 0),
            porcentajeComisionProducto: Number(tx.cita.barbero.porcentajeComisionProducto || 0),
            totalCitas: 0,
            totalFacturado: 0,
            comisionTotal: 0,
            propinaTotal: 0,
          };
          rendimientoBarberosMap.set(bId, stats);
        }

        if (stats) {
          const montoTx = Number(tx.totalFacturado || 0);
          const propinaTx = Number(tx.propinaBarbero || 0);
          const comisionTx = Number(tx.comisionBarbero || 0);

          stats.totalCitas += tx.cita ? 1 : 0;
          stats.totalFacturado += montoTx;
          stats.comisionTotal += comisionTx;
          stats.propinaTotal += propinaTx;
        }
      }
    }

    // 3. Clientes con ausencias/strikes
    const clientesStrikes = await db.query.clientes.findMany({
      where: and(
        eq(clientes.tenantId, tenantId),
        gte(clientes.ausenciasStrikes, 1)
      ),
      orderBy: [desc(clientes.ausenciasStrikes)],
      limit: 10
    });

    // 4. Productos con Stock Bajo (Alerta de Inventario)
    const productosStockBajo = await db.query.productos.findMany({
      where: and(
        eq(productos.tenantId, tenantId),
        eq(productos.activo, true),
        sql`${productos.stockActual} <= ${productos.stockMinimo}`
      ),
      limit: 10
    });

    const topServicios = Array.from(serviciosMap.values()).sort((a, b) => b.totalRecaudado - a.totalRecaudado);
    const topProductos = Array.from(productosMap.values()).sort((a, b) => b.totalRecaudado - a.totalRecaudado);
    const tendenciaDiaria = Array.from(tendenciaDiariaMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));

    return {
      rangoFechas: { desde, hasta },
      ingresosTotales,
      ingresosServicios,
      ingresosProductos,
      totalTransacciones: txsPeriodo.length,
      desgloseMetodosPago,
      tendenciaDiaria,
      topServicios,
      topProductos,
      productosStockBajoCount: productosStockBajo.length,
      productosStockBajoList: productosStockBajo.map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        stockActual: p.stockActual,
        stockMinimo: p.stockMinimo,
      })),
      rendimientoBarberos: Array.from(rendimientoBarberosMap.values()),
      clientesStrikes: clientesStrikes.map((c: any) => ({
        id: c.id,
        nombreCompleto: c.nombreCompleto,
        telefonoWhatsapp: c.telefonoWhatsapp,
        strikesCount: c.ausenciasStrikes,
      }))
    };
  }

  async getMiDesempeno(barberoId: string, desdeStr?: string, hastaStr?: string) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    let desde = desdeStr ? new Date(`${desdeStr}T00:00:00`) : subDays(new Date(), 30);
    let hasta = hastaStr ? new Date(`${hastaStr}T23:59:59.999`) : endOfDay(new Date());

    const [barbero] = await db.query.usuarios.findMany({
      where: and(
        eq(usuarios.tenantId, tenantId),
        eq(usuarios.id, barberoId)
      )
    });

    if (!barbero) {
      return {
        barberoId: barberoId || '',
        nombreCompleto: 'Staff',
        porcentajeComision: 0,
        porcentajeComisionProducto: 0,
        rangoFechas: { desde, hasta },
        totalCitas: 0,
        totalFacturado: 0,
        comisionServicios: 0,
        comisionProductos: 0,
        comisionTotal: 0,
        propinaTotal: 0,
        resumenDiario: []
      };
    }

    const txsBarbero = await db.query.transacciones.findMany({
      where: and(
        eq(transacciones.tenantId, tenantId),
        gte(transacciones.createdAt, desde),
        lte(transacciones.createdAt, hasta)
      ),
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

    // Filtrar solo transacciones donde el barbero es el asignado
    const txsFiltradas = txsBarbero.filter((tx: any) => tx.cita?.barberoId === barberoId);

    let totalCitas = 0;
    let totalFacturado = 0;
    let comisionTotal = 0;
    let comisionServicios = 0;
    let comisionProductos = 0;
    let propinaTotal = 0;

    const resumenDiarioMap = new Map<string, { fecha: string; label: string; citas: number; facturado: number; comision: number; propina: number }>();

    // Inicializar días
    const curr = new Date(desde);
    while (curr <= hasta) {
      const ymd = format(curr, 'yyyy-MM-dd');
      const label = format(curr, 'd MMM');
      resumenDiarioMap.set(ymd, { fecha: ymd, label, citas: 0, facturado: 0, comision: 0, propina: 0 });
      curr.setDate(curr.getDate() + 1);
    }

    for (const tx of txsFiltradas) {
      const montoTx = Number(tx.totalFacturado || 0);
      const comisionTx = Number(tx.comisionBarbero || 0);
      const propinaTx = Number(tx.propinaBarbero || 0);

      totalCitas += tx.cita ? 1 : 0;
      totalFacturado += montoTx;
      comisionTotal += comisionTx;
      propinaTotal += propinaTx;

      const ymd = format(new Date(tx.createdAt), 'yyyy-MM-dd');
      let p = resumenDiarioMap.get(ymd);
      if (!p) {
        p = { fecha: ymd, label: format(new Date(tx.createdAt), 'd MMM'), citas: 0, facturado: 0, comision: 0, propina: 0 };
        resumenDiarioMap.set(ymd, p);
      }
      p.citas += tx.cita ? 1 : 0;
      p.facturado += montoTx;
      p.comision += comisionTx;
      p.propina += propinaTx;

      if (tx.detalles && tx.detalles.length > 0) {
        for (const det of tx.detalles) {
          const comDet = Number(det.comisionAplicada || 0);
          if (det.tipoItem === 'servicio') comisionServicios += comDet;
          else if (det.tipoItem === 'producto') comisionProductos += comDet;
        }
      } else {
        comisionServicios += comisionTx;
      }
    }

    return {
      barberoId: barbero.id,
      nombreCompleto: barbero.nombreCompleto,
      porcentajeComision: Number(barbero.porcentajeComision || 0),
      porcentajeComisionProducto: Number(barbero.porcentajeComisionProducto || 0),
      rangoFechas: { desde, hasta },
      totalCitas,
      totalFacturado,
      comisionServicios,
      comisionProductos,
      comisionTotal,
      propinaTotal,
      resumenDiario: Array.from(resumenDiarioMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha))
    };
  }
}
