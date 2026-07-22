"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatosService = void 0;
const common_1 = require("@nestjs/common");
const tenant_context_1 = require("../database/tenant/tenant-context");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const datos_utils_1 = require("./datos.utils");
const date_fns_1 = require("date-fns");
let DatosService = class DatosService {
    async importarClientes(csvString) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const filas = (0, datos_utils_1.parseCsvContent)(csvString);
        if (filas.length > 5000) {
            throw new common_1.BadRequestException('El archivo excede el límite máximo permitido de 5,000 filas.');
        }
        const reporte = {
            totalFilas: filas.length,
            creados: 0,
            actualizados: 0,
            rechazados: 0,
            errores: [],
        };
        for (let i = 0; i < filas.length; i++) {
            const numFila = i + 2;
            const fila = filas[i];
            const telefonoRaw = fila['telefono'] || fila['telefonowhatsapp'] || fila['whatsapp'] || fila['phone'];
            const nombreRaw = fila['nombre'] || fila['nombrecompleto'] || fila['name'];
            const emailRaw = fila['email'] || fila['emailfacturacion'] || fila['correo'];
            const notasRaw = fila['notas'] || fila['notaspreferencia'] || fila['preferencias'];
            const aceptaMktRaw = fila['aceptamarketing'] || fila['marketing'] || fila['optin'];
            if (!telefonoRaw) {
                reporte.rechazados++;
                reporte.errores.push({
                    fila: numFila,
                    identificador: nombreRaw || 'Fila ' + numFila,
                    motivo: 'El campo Teléfono/WhatsApp es obligatorio.'
                });
                continue;
            }
            const telefonoWhatsapp = telefonoRaw.replace(/[^0-9+]/g, '');
            const aceptaMarketing = String(aceptaMktRaw).toLowerCase() === 'si' ||
                String(aceptaMktRaw).toLowerCase() === 'true' ||
                aceptaMktRaw === '1';
            try {
                const [clienteExistente] = await db.query.clientes.findMany({
                    where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.clientes.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.clientes.telefonoWhatsapp, telefonoWhatsapp))
                });
                if (clienteExistente) {
                    await db.update(schema_1.clientes)
                        .set({
                        nombreCompleto: nombreRaw || clienteExistente.nombreCompleto,
                        emailFacturacion: emailRaw || clienteExistente.emailFacturacion,
                        notasPreferencia: notasRaw || clienteExistente.notasPreferencia,
                        aceptaMarketing: aceptaMarketing !== undefined ? aceptaMarketing : clienteExistente.aceptaMarketing,
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.clientes.id, clienteExistente.id));
                    reporte.actualizados++;
                }
                else {
                    await db.insert(schema_1.clientes).values({
                        tenantId,
                        telefonoWhatsapp,
                        nombreCompleto: nombreRaw || 'Cliente Registrado',
                        emailFacturacion: emailRaw || null,
                        notasPreferencia: notasRaw || null,
                        aceptaMarketing,
                    });
                    reporte.creados++;
                }
            }
            catch (err) {
                reporte.rechazados++;
                reporte.errores.push({
                    fila: numFila,
                    identificador: telefonoWhatsapp,
                    motivo: err.message || 'Error al procesar la fila en la base de datos.'
                });
            }
        }
        return reporte;
    }
    async importarProductos(csvString) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const filas = (0, datos_utils_1.parseCsvContent)(csvString);
        if (filas.length > 5000) {
            throw new common_1.BadRequestException('El archivo excede el límite máximo permitido de 5,000 filas.');
        }
        const reporte = {
            totalFilas: filas.length,
            creados: 0,
            actualizados: 0,
            rechazados: 0,
            errores: [],
        };
        for (let i = 0; i < filas.length; i++) {
            const numFila = i + 2;
            const fila = filas[i];
            const nombreRaw = fila['nombre'] || fila['nombreproducto'] || fila['product'];
            const precioVentaRaw = fila['precioventa'] || fila['precio'] || fila['price'];
            const costoCompraRaw = fila['costocompra'] || fila['costo'] || fila['cost'];
            const stockActualRaw = fila['stockactual'] || fila['stock'] || fila['cantidad'];
            const stockMinimoRaw = fila['stockminimo'] || fila['minimo'];
            if (!nombreRaw) {
                reporte.rechazados++;
                reporte.errores.push({ fila: numFila, identificador: 'Fila ' + numFila, motivo: 'El Nombre del Producto es obligatorio.' });
                continue;
            }
            const precioVenta = parseFloat(precioVentaRaw || '0');
            const costoCompra = parseFloat(costoCompraRaw || '0');
            const stockActual = parseInt(stockActualRaw || '0', 10);
            const stockMinimo = parseInt(stockMinimoRaw || '2', 10);
            if (isNaN(precioVenta) || precioVenta < 0 || isNaN(costoCompra) || costoCompra < 0) {
                reporte.rechazados++;
                reporte.errores.push({
                    fila: numFila,
                    identificador: nombreRaw,
                    motivo: 'Los precios y costos deben ser números mayor o igual a cero.'
                });
                continue;
            }
            try {
                const [prodExistente] = await db.query.productos.findMany({
                    where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productos.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.productos.nombre, nombreRaw))
                });
                if (prodExistente) {
                    await db.update(schema_1.productos)
                        .set({
                        precioVenta: precioVenta.toFixed(2),
                        costoCompra: costoCompra.toFixed(2),
                        stockActual,
                        stockMinimo,
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.productos.id, prodExistente.id));
                    reporte.actualizados++;
                }
                else {
                    await db.insert(schema_1.productos).values({
                        tenantId,
                        nombre: nombreRaw,
                        precioVenta: precioVenta.toFixed(2),
                        costoCompra: costoCompra.toFixed(2),
                        stockActual,
                        stockMinimo,
                    });
                    reporte.creados++;
                }
            }
            catch (err) {
                reporte.rechazados++;
                reporte.errores.push({
                    fila: numFila,
                    identificador: nombreRaw,
                    motivo: err.message || 'Error guardando producto.'
                });
            }
        }
        return reporte;
    }
    async exportarTransaccionesCsv(desdeStr, hastaStr) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        let desde = desdeStr ? new Date(`${desdeStr}T00:00:00`) : (0, date_fns_1.subDays)(new Date(), 30);
        let hasta = hastaStr ? new Date(`${hastaStr}T23:59:59.999`) : (0, date_fns_1.endOfDay)(new Date());
        const txs = await db.query.transacciones.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.transacciones.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.transacciones.createdAt, desde), (0, drizzle_orm_1.lte)(schema_1.transacciones.createdAt, hasta)),
            with: {
                cita: {
                    with: {
                        barbero: true,
                        cliente: true,
                        servicio: true,
                    }
                }
            }
        });
        const headers = ['ID_Transaccion', 'Fecha', 'Metodo_Pago', 'Total_Facturado', 'Comision_Barbero', 'Propina_Barbero', 'Barbero', 'Cliente_Tel'];
        const rows = [headers.join(',')];
        for (const tx of txs) {
            const fila = [
                (0, datos_utils_1.sanitizeCsvCell)(tx.id),
                (0, datos_utils_1.sanitizeCsvCell)((0, date_fns_1.format)(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm')),
                (0, datos_utils_1.sanitizeCsvCell)(tx.metodoPago),
                (0, datos_utils_1.sanitizeCsvCell)(tx.totalFacturado),
                (0, datos_utils_1.sanitizeCsvCell)(tx.comisionBarbero),
                (0, datos_utils_1.sanitizeCsvCell)(tx.propinaBarbero),
                (0, datos_utils_1.sanitizeCsvCell)(tx.cita?.barbero?.nombreCompleto || 'Staff'),
                (0, datos_utils_1.sanitizeCsvCell)(tx.cita?.cliente?.telefonoWhatsapp || 'Sin Teléfono'),
            ];
            rows.push(fila.join(','));
        }
        return rows.join('\n');
    }
    async exportarClientesMarketingCsv() {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const clientesOptIn = await db.query.clientes.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.clientes.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.clientes.aceptaMarketing, true))
        });
        const headers = ['Nombre_Completo', 'Telefono_WhatsApp', 'Email_Facturacion', 'Total_Asistencias', 'Total_Gastado_USD', 'OptIn_Marketing'];
        const rows = [headers.join(',')];
        for (const c of clientesOptIn) {
            const fila = [
                (0, datos_utils_1.sanitizeCsvCell)(c.nombreCompleto || 'Cliente'),
                (0, datos_utils_1.sanitizeCsvCell)(c.telefonoWhatsapp),
                (0, datos_utils_1.sanitizeCsvCell)(c.emailFacturacion || ''),
                (0, datos_utils_1.sanitizeCsvCell)(c.totalAsistencias),
                (0, datos_utils_1.sanitizeCsvCell)(c.totalGastado),
                (0, datos_utils_1.sanitizeCsvCell)('SI'),
            ];
            rows.push(fila.join(','));
        }
        return rows.join('\n');
    }
    async exportarNominaCsv(desdeStr, hastaStr) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        let desde = desdeStr ? new Date(`${desdeStr}T00:00:00`) : (0, date_fns_1.subDays)(new Date(), 30);
        let hasta = hastaStr ? new Date(`${hastaStr}T23:59:59.999`) : (0, date_fns_1.endOfDay)(new Date());
        const txs = await db.query.transacciones.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.transacciones.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.transacciones.createdAt, desde), (0, drizzle_orm_1.lte)(schema_1.transacciones.createdAt, hasta)),
            with: {
                cita: {
                    with: {
                        barbero: true,
                    }
                },
                detalles: true
            }
        });
        const nominaMap = new Map();
        for (const tx of txs) {
            const bId = tx.cita?.barbero?.id;
            const bNombre = tx.cita?.barbero?.nombreCompleto || 'Staff General';
            if (!bId)
                continue;
            let entry = nominaMap.get(bId) || { nombre: bNombre, totalServicios: 0, totalProductos: 0, comisionAcumulada: 0, propinas: 0 };
            entry.propinas += Number(tx.propinaBarbero || 0);
            if (tx.detalles && tx.detalles.length > 0) {
                for (const det of tx.detalles) {
                    const sub = Number(det.subtotal || 0);
                    const comCongelada = Number(det.comisionAplicada || 0);
                    if (det.tipoItem === 'servicio')
                        entry.totalServicios += sub;
                    else if (det.tipoItem === 'producto')
                        entry.totalProductos += sub;
                    entry.comisionAcumulada += comCongelada;
                }
            }
            else {
                entry.totalServicios += Number(tx.totalFacturado || 0);
                entry.comisionAcumulada += Number(tx.comisionBarbero || 0);
            }
            nominaMap.set(bId, entry);
        }
        const headers = ['Barbero', 'Facturado_Servicios', 'Facturado_Productos', 'Comision_Neto_Congelada', 'Propinas', 'Total_Pagar'];
        const rows = [headers.join(',')];
        for (const [_, data] of nominaMap.entries()) {
            const totalPagar = data.comisionAcumulada + data.propinas;
            const fila = [
                (0, datos_utils_1.sanitizeCsvCell)(data.nombre),
                (0, datos_utils_1.sanitizeCsvCell)(data.totalServicios.toFixed(2)),
                (0, datos_utils_1.sanitizeCsvCell)(data.totalProductos.toFixed(2)),
                (0, datos_utils_1.sanitizeCsvCell)(data.comisionAcumulada.toFixed(2)),
                (0, datos_utils_1.sanitizeCsvCell)(data.propinas.toFixed(2)),
                (0, datos_utils_1.sanitizeCsvCell)(totalPagar.toFixed(2)),
            ];
            rows.push(fila.join(','));
        }
        return rows.join('\n');
    }
    obtenerPlantillaCsv(tipo) {
        if (tipo === 'clientes') {
            const headers = ['NombreCompleto', 'TelefonoWhatsApp', 'EmailFacturacion', 'NotasPreferencia', 'AceptaMarketing'];
            const ejemplo1 = [(0, datos_utils_1.sanitizeCsvCell)('Juan Pérez'), (0, datos_utils_1.sanitizeCsvCell)('+50766001122'), (0, datos_utils_1.sanitizeCsvCell)('juan@email.com'), (0, datos_utils_1.sanitizeCsvCell)('Prefiere degradado bajo'), (0, datos_utils_1.sanitizeCsvCell)('SI')];
            const ejemplo2 = [(0, datos_utils_1.sanitizeCsvCell)('Carlos Gómez'), (0, datos_utils_1.sanitizeCsvCell)('+50766554433'), (0, datos_utils_1.sanitizeCsvCell)('carlos@email.com'), (0, datos_utils_1.sanitizeCsvCell)('Sin notas'), (0, datos_utils_1.sanitizeCsvCell)('NO')];
            return [headers.join(','), ejemplo1.join(','), ejemplo2.join(',')].join('\n');
        }
        else {
            const headers = ['NombreProducto', 'PrecioVenta', 'CostoCompra', 'StockActual', 'StockMinimo'];
            const ejemplo1 = [(0, datos_utils_1.sanitizeCsvCell)('Cera Mate Premium 100g'), (0, datos_utils_1.sanitizeCsvCell)('15.00'), (0, datos_utils_1.sanitizeCsvCell)('7.50'), (0, datos_utils_1.sanitizeCsvCell)('24'), (0, datos_utils_1.sanitizeCsvCell)('5')];
            const ejemplo2 = [(0, datos_utils_1.sanitizeCsvCell)('Aceite de Barba Orgánico'), (0, datos_utils_1.sanitizeCsvCell)('12.50'), (0, datos_utils_1.sanitizeCsvCell)('6.00'), (0, datos_utils_1.sanitizeCsvCell)('10'), (0, datos_utils_1.sanitizeCsvCell)('2')];
            return [headers.join(','), ejemplo1.join(','), ejemplo2.join(',')].join('\n');
        }
    }
};
exports.DatosService = DatosService;
exports.DatosService = DatosService = __decorate([
    (0, common_1.Injectable)()
], DatosService);
//# sourceMappingURL=datos.service.js.map