import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import { citas, transacciones, usuarios, clientes, servicios } from '../database/schema';
import { and, eq, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import { startOfMonth, endOfDay, differenceInDays, subDays } from 'date-fns';

@Injectable()
export class ReportesService {
  async getDashboardMetrics(desdeStr?: string, hastaStr?: string) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    let desde = desdeStr ? new Date(`${desdeStr}T00:00:00`) : subDays(new Date(), 30);
    let hasta = hastaStr ? new Date(`${hastaStr}T23:59:59.999`) : endOfDay(new Date());

    // Validar límite de 365 días para prevenir consultas pesadas no indexadas
    if (differenceInDays(hasta, desde) > 365) {
      throw new BadRequestException('El rango de fechas no puede exceder los 365 días.');
    }

    // 1. Obtener todas las transacciones del período
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
        }
      }
    });

    let ingresosTotales = 0;
    const desgloseMetodosPago = { efectivo: 0, yappy: 0, mixto: 0 };
    const serviciosMap = new Map<string, { servicioId: string; nombre: string; totalCitas: number; totalRecaudado: number }>();

    for (const tx of txsPeriodo) {
      const monto = Number(tx.totalFacturado || 0);
      ingresosTotales += monto;
      if (tx.metodoPago === 'efectivo') desgloseMetodosPago.efectivo += monto;
      else if (tx.metodoPago === 'yappy') desgloseMetodosPago.yappy += monto;
      else if (tx.metodoPago === 'mixto') desgloseMetodosPago.mixto += monto;

      // Agregación de Top Servicios
      if (tx.cita && tx.cita.servicio) {
        const sId = tx.cita.servicio.id;
        const sNombre = tx.cita.servicio.nombre;
        const sStats = serviciosMap.get(sId) || { servicioId: sId, nombre: sNombre, totalCitas: 0, totalRecaudado: 0 };
        sStats.totalCitas += 1;
        sStats.totalRecaudado += monto;
        serviciosMap.set(sId, sStats);
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
        totalCitas: 0,
        totalFacturado: 0,
        comisionTotal: 0,
        propinaTotal: 0,
      });
    }

    for (const tx of txsPeriodo) {
      if (tx.cita && tx.cita.barbero) {
        const bId = tx.cita.barbero.id;
        let stats = rendimientoBarberosMap.get(bId);
        if (!stats) {
          stats = {
            barberoId: bId,
            nombreCompleto: tx.cita.barbero.nombreCompleto,
            porcentajeComision: Number(tx.cita.barbero.porcentajeComision || 0),
            totalCitas: 0,
            totalFacturado: 0,
            comisionTotal: 0,
            propinaTotal: 0,
          };
          rendimientoBarberosMap.set(bId, stats);
        }

        const montoTx = Number(tx.totalFacturado || 0);
        const propinaTx = Number(tx.propinaBarbero || 0);
        const comisionTx = (montoTx * stats.porcentajeComision) / 100;

        stats.totalCitas += 1;
        stats.totalFacturado += montoTx;
        stats.comisionTotal += comisionTx;
        stats.propinaTotal += propinaTx;
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

    const topServicios = Array.from(serviciosMap.values()).sort((a, b) => b.totalRecaudado - a.totalRecaudado);

    return {
      rangoFechas: { desde, hasta },
      ingresosTotales,
      totalTransacciones: txsPeriodo.length,
      desgloseMetodosPago,
      topServicios,
      rendimientoBarberos: Array.from(rendimientoBarberosMap.values()),
      clientesStrikes: clientesStrikes.map((c: any) => ({
        id: c.id,
        nombreCompleto: c.nombreCompleto,
        telefonoWhatsapp: c.telefonoWhatsapp,
        strikesCount: c.ausenciasStrikes,
      }))
    };
  }
}
