"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportesService = void 0;
const common_1 = require("@nestjs/common");
const tenant_context_1 = require("../database/tenant/tenant-context");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const date_fns_1 = require("date-fns");
let ReportesService = class ReportesService {
    async getDashboardMetrics(desdeStr, hastaStr) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        let desde = desdeStr ? new Date(`${desdeStr}T00:00:00`) : (0, date_fns_1.subDays)(new Date(), 30);
        let hasta = hastaStr ? new Date(`${hastaStr}T23:59:59.999`) : (0, date_fns_1.endOfDay)(new Date());
        if ((0, date_fns_1.differenceInDays)(hasta, desde) > 365) {
            throw new common_1.BadRequestException('El rango de fechas no puede exceder los 365 días.');
        }
        const txsPeriodo = await db.query.transacciones.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.transacciones.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.transacciones.createdAt, desde), (0, drizzle_orm_1.lte)(schema_1.transacciones.createdAt, hasta)),
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
        const serviciosMap = new Map();
        for (const tx of txsPeriodo) {
            const monto = Number(tx.totalFacturado || 0);
            ingresosTotales += monto;
            if (tx.metodoPago === 'efectivo')
                desgloseMetodosPago.efectivo += monto;
            else if (tx.metodoPago === 'yappy')
                desgloseMetodosPago.yappy += monto;
            else if (tx.metodoPago === 'mixto')
                desgloseMetodosPago.mixto += monto;
            if (tx.cita && tx.cita.servicio) {
                const sId = tx.cita.servicio.id;
                const sNombre = tx.cita.servicio.nombre;
                const sStats = serviciosMap.get(sId) || { servicioId: sId, nombre: sNombre, totalCitas: 0, totalRecaudado: 0 };
                sStats.totalCitas += 1;
                sStats.totalRecaudado += monto;
                serviciosMap.set(sId, sStats);
            }
        }
        const staffBarberos = await db.query.usuarios.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.usuarios.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.usuarios.rol, 'barbero'))
        });
        const rendimientoBarberosMap = new Map();
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
        const clientesStrikes = await db.query.clientes.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.clientes.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.clientes.ausenciasStrikes, 1)),
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.clientes.ausenciasStrikes)],
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
            clientesStrikes: clientesStrikes.map((c) => ({
                id: c.id,
                nombreCompleto: c.nombreCompleto,
                telefonoWhatsapp: c.telefonoWhatsapp,
                strikesCount: c.ausenciasStrikes,
            }))
        };
    }
};
exports.ReportesService = ReportesService;
exports.ReportesService = ReportesService = __decorate([
    (0, common_1.Injectable)()
], ReportesService);
//# sourceMappingURL=reportes.service.js.map