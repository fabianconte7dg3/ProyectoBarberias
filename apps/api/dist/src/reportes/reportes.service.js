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
        let ingresosTotales = 0;
        let ingresosServicios = 0;
        let ingresosProductos = 0;
        const desgloseMetodosPago = { efectivo: 0, yappy: 0, mixto: 0 };
        const serviciosMap = new Map();
        const productosMap = new Map();
        const tendenciaDiariaMap = new Map();
        const curr = new Date(desde);
        while (curr <= hasta) {
            const ymd = (0, date_fns_1.format)(curr, 'yyyy-MM-dd');
            const label = (0, date_fns_1.format)(curr, 'd MMM');
            tendenciaDiariaMap.set(ymd, { fecha: ymd, label, servicios: 0, productos: 0, total: 0 });
            curr.setDate(curr.getDate() + 1);
        }
        for (const tx of txsPeriodo) {
            const monto = Number(tx.totalFacturado || 0);
            ingresosTotales += monto;
            if (tx.metodoPago === 'efectivo')
                desgloseMetodosPago.efectivo += monto;
            else if (tx.metodoPago === 'yappy')
                desgloseMetodosPago.yappy += monto;
            else if (tx.metodoPago === 'mixto')
                desgloseMetodosPago.mixto += monto;
            const txFechaKey = (0, date_fns_1.format)(new Date(tx.createdAt), 'yyyy-MM-dd');
            let puntoDiario = tendenciaDiariaMap.get(txFechaKey);
            if (!puntoDiario) {
                const label = (0, date_fns_1.format)(new Date(tx.createdAt), 'd MMM');
                puntoDiario = { fecha: txFechaKey, label, servicios: 0, productos: 0, total: 0 };
                tendenciaDiariaMap.set(txFechaKey, puntoDiario);
            }
            puntoDiario.total += monto;
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
                    }
                    else if (det.tipoItem === 'producto') {
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
            }
            else {
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
        const staffEmpleados = await db.query.usuarios.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.usuarios.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.usuarios.rol, ['empleado', 'admin']))
        });
        const rendimientoEmpleadosMap = new Map();
        for (const b of staffEmpleados) {
            rendimientoEmpleadosMap.set(b.id, {
                empleadoId: b.id,
                nombreCompleto: b.nombreCompleto,
                porcentajeComision: Number(b.porcentajeComision || 0),
                porcentajeComisionProducto: Number(b.porcentajeComisionProducto || 0),
                totalCitas: 0,
                facturadoServicios: 0,
                facturadoProductos: 0,
                totalFacturado: 0,
                comisionTotal: 0,
                propinaTotal: 0,
            });
        }
        for (const tx of txsPeriodo) {
            const bId = tx.cita?.empleado?.id;
            if (bId) {
                let stats = rendimientoEmpleadosMap.get(bId);
                if (!stats && tx.cita?.empleado) {
                    stats = {
                        empleadoId: bId,
                        nombreCompleto: tx.cita.empleado.nombreCompleto,
                        porcentajeComision: Number(tx.cita.empleado.porcentajeComision || 0),
                        porcentajeComisionProducto: Number(tx.cita.empleado.porcentajeComisionProducto || 0),
                        totalCitas: 0,
                        facturadoServicios: 0,
                        facturadoProductos: 0,
                        totalFacturado: 0,
                        comisionTotal: 0,
                        propinaTotal: 0,
                    };
                    rendimientoEmpleadosMap.set(bId, stats);
                }
                if (stats) {
                    const montoTx = Number(tx.totalFacturado || 0);
                    const propinaTx = Number(tx.propinaBarbero || 0);
                    const comisionTx = Number(tx.comisionBarbero || 0);
                    stats.totalCitas += tx.cita ? 1 : 0;
                    stats.totalFacturado += montoTx;
                    stats.comisionTotal += comisionTx;
                    stats.propinaTotal += propinaTx;
                    if (tx.detalles && tx.detalles.length > 0) {
                        for (const det of tx.detalles) {
                            const sub = Number(det.subtotal || 0);
                            if (det.tipoItem === 'servicio')
                                stats.facturadoServicios += sub;
                            else if (det.tipoItem === 'producto')
                                stats.facturadoProductos += sub;
                        }
                    }
                    else {
                        stats.facturadoServicios += montoTx;
                    }
                }
            }
        }
        const clientesStrikes = await db.query.clientes.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.clientes.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.clientes.ausenciasStrikes, 1)),
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.clientes.ausenciasStrikes)],
            limit: 10
        });
        const todosProductos = await db.query.productos.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productos.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.productos.activo, true))
        });
        const productosStockBajoList = todosProductos.filter((p) => p.stockActual <= p.stockMinimo);
        const comparativaProductosStock = todosProductos.map((p) => {
            const vendidosStats = productosMap.get(p.id);
            return {
                productoId: p.id,
                nombre: p.nombre,
                unidadesVendidas: vendidosStats ? vendidosStats.totalVendidos : 0,
                stockActual: Number(p.stockActual || 0),
                stockMinimo: Number(p.stockMinimo || 0),
                totalRecaudado: vendidosStats ? vendidosStats.totalRecaudado : 0,
            };
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
            comparativaProductosStock,
            productosStockBajoCount: productosStockBajoList.length,
            productosStockBajoList: productosStockBajoList.map((p) => ({
                id: p.id,
                nombre: p.nombre,
                stockActual: p.stockActual,
                stockMinimo: p.stockMinimo,
            })),
            rendimientoEmpleados: Array.from(rendimientoEmpleadosMap.values()),
            clientesStrikes: clientesStrikes.map((c) => ({
                id: c.id,
                nombreCompleto: c.nombreCompleto,
                telefonoWhatsapp: c.telefonoWhatsapp,
                strikesCount: c.ausenciasStrikes,
            }))
        };
    }
    async getMiDesempeno(empleadoId, desdeStr, hastaStr) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        let desde = desdeStr ? new Date(`${desdeStr}T00:00:00`) : (0, date_fns_1.subDays)(new Date(), 30);
        let hasta = hastaStr ? new Date(`${hastaStr}T23:59:59.999`) : (0, date_fns_1.endOfDay)(new Date());
        const [empleado] = await db.query.usuarios.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.usuarios.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.usuarios.id, empleadoId))
        });
        if (!empleado) {
            return {
                empleadoId: empleadoId || '',
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
        const txsEmpleado = await db.query.transacciones.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.transacciones.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.transacciones.createdAt, desde), (0, drizzle_orm_1.lte)(schema_1.transacciones.createdAt, hasta)),
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
        const txsFiltradas = txsEmpleado.filter((tx) => tx.cita?.empleadoId === empleadoId);
        let totalCitas = 0;
        let totalFacturado = 0;
        let comisionTotal = 0;
        let comisionServicios = 0;
        let comisionProductos = 0;
        let propinaTotal = 0;
        const resumenDiarioMap = new Map();
        const curr = new Date(desde);
        while (curr <= hasta) {
            const ymd = (0, date_fns_1.format)(curr, 'yyyy-MM-dd');
            const label = (0, date_fns_1.format)(curr, 'd MMM');
            resumenDiarioMap.set(ymd, { fecha: ymd, label, citas: 0, facturado: 0, comision: 0, propina: 0 });
            curr.setDate(curr.getDate() + 1);
        }
        const esSoloPreneurODueno = empleado.rol === 'admin' || Number(empleado.porcentajeComision || 0) === 0;
        for (const tx of txsFiltradas) {
            const montoTx = Number(tx.totalFacturado || 0);
            const comisionTx = esSoloPreneurODueno ? montoTx : Number(tx.comisionBarbero || 0);
            const propinaTx = Number(tx.propinaBarbero || 0);
            totalCitas += tx.cita ? 1 : 0;
            totalFacturado += montoTx;
            comisionTotal += comisionTx;
            propinaTotal += propinaTx;
            const ymd = (0, date_fns_1.format)(new Date(tx.createdAt), 'yyyy-MM-dd');
            let p = resumenDiarioMap.get(ymd);
            if (!p) {
                p = { fecha: ymd, label: (0, date_fns_1.format)(new Date(tx.createdAt), 'd MMM'), citas: 0, facturado: 0, comision: 0, propina: 0 };
                resumenDiarioMap.set(ymd, p);
            }
            p.citas += tx.cita ? 1 : 0;
            p.facturado += montoTx;
            p.comision += comisionTx;
            p.propina += propinaTx;
            if (tx.detalles && tx.detalles.length > 0) {
                for (const det of tx.detalles) {
                    const comDet = esSoloPreneurODueno ? Number(det.subtotal || 0) : Number(det.comisionAplicada || 0);
                    if (det.tipoItem === 'servicio')
                        comisionServicios += comDet;
                    else if (det.tipoItem === 'producto')
                        comisionProductos += comDet;
                }
            }
            else {
                comisionServicios += comisionTx;
            }
        }
        const resumenDiarioFiltrado = Array.from(resumenDiarioMap.values())
            .filter((d) => d.citas > 0 || d.facturado > 0 || d.comision > 0 || d.propina > 0)
            .sort((a, b) => b.fecha.localeCompare(a.fecha));
        return {
            empleadoId: empleado.id,
            nombreCompleto: empleado.nombreCompleto,
            porcentajeComision: Number(empleado.porcentajeComision || 0),
            porcentajeComisionProducto: Number(empleado.porcentajeComisionProducto || 0),
            rangoFechas: { desde, hasta },
            totalCitas,
            totalFacturado,
            comisionServicios: esSoloPreneurODueno ? totalFacturado : comisionServicios,
            comisionProductos,
            comisionTotal: esSoloPreneurODueno ? totalFacturado : comisionTotal,
            propinaTotal,
            resumenDiario: resumenDiarioFiltrado
        };
    }
};
exports.ReportesService = ReportesService;
exports.ReportesService = ReportesService = __decorate([
    (0, common_1.Injectable)()
], ReportesService);
//# sourceMappingURL=reportes.service.js.map