"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransaccionesService = void 0;
const common_1 = require("@nestjs/common");
const tenant_context_1 = require("../database/tenant/tenant-context");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const yappy_service_1 = require("../yappy/yappy.service");
const dgi_service_1 = require("../dgi/dgi.service");
const productos_service_1 = require("../productos/productos.service");
const crypto = __importStar(require("crypto"));
let TransaccionesService = class TransaccionesService {
    yappyService;
    dgiService;
    productosService;
    constructor(yappyService, dgiService, productosService) {
        this.yappyService = yappyService;
        this.dgiService = dgiService;
        this.productosService = productosService;
    }
    async cobrarCita(citaId, dto, user) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const idempotencyKey = dto.idempotencyKey || `tx_${citaId || 'mostrador'}_${Date.now()}`;
        const txExistenteKey = await db.query.transacciones.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.transacciones.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.transacciones.idempotencyKey, idempotencyKey)),
            with: {
                detalles: true,
            }
        });
        if (txExistenteKey) {
            return {
                ...txExistenteKey,
                idempotent: true,
            };
        }
        let cita = null;
        let barbero = null;
        let subtotalServicio = 0;
        let comisionServicio = 0;
        if (citaId) {
            cita = await db.query.citas.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.citas.id, citaId),
                with: {
                    barbero: true,
                    servicio: true,
                },
            });
            if (!cita) {
                throw new common_1.NotFoundException('Cita no encontrada');
            }
            if (user && user.rol === 'barbero' && cita.barberoId !== user.userId) {
                throw new common_1.ForbiddenException('No tienes permisos para cobrar citas asignadas a otro barbero.');
            }
            if (cita.estado === 'completada' || cita.estado === 'cancelada') {
                throw new common_1.ConflictException(`Esta cita ya fue procesada o cancelada (Estado: ${cita.estado}).`);
            }
            const txExistenteCita = await db.query.transacciones.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.transacciones.citaId, citaId),
            });
            if (txExistenteCita) {
                throw new common_1.ConflictException('Ya existe un cobro registrado para esta cita.');
            }
            barbero = cita.barbero;
            subtotalServicio = Number(cita.servicio.precioBase || 0);
            const pctServicio = Number(barbero.porcentajeComision || 0);
            comisionServicio = (subtotalServicio * pctServicio) / 100;
        }
        else if (dto.barberoId) {
            barbero = await db.query.usuarios.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.usuarios.id, dto.barberoId),
            });
        }
        const lineasDetalle = [];
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
            throw new common_1.BadRequestException('Una venta de mostrador debe incluir al menos un producto.');
        }
        const totalFacturado = subtotalServicio + subtotalProductosTotal;
        const comisionBarberoTotal = comisionServicio + comisionProductosTotal;
        const yappyOrderId = dto.metodoPago === 'yappy' ? crypto.randomBytes(6).toString('hex') : null;
        const [nuevaTransaccion] = await db.insert(schema_1.transacciones).values({
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
        for (const detalle of lineasDetalle) {
            await db.insert(schema_1.detallesTransaccion).values({
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
        let yappyData = null;
        if (dto.metodoPago === 'yappy') {
            yappyData = await this.yappyService.initiatePayment(tenantId, yappyOrderId, totalFacturado);
        }
        if (cita && dto.metodoPago !== 'yappy') {
            await db.update(schema_1.citas)
                .set({ estado: 'completada' })
                .where((0, drizzle_orm_1.eq)(schema_1.citas.id, cita.id));
            this.dgiService.emitirFacturaAsync(tenantId, nuevaTransaccion.id, nuevaTransaccion.totalFacturado, dto.rucCliente, dto.nombreFiscalCliente).catch(err => console.error('Error al emitir factura a DGI:', err));
        }
        return {
            ...nuevaTransaccion,
            yappyData,
            detalles: lineasDetalle,
        };
    }
    async getHistorialTransacciones(limit = 20) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        return db.query.transacciones.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.transacciones.tenantId, tenantId),
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.transacciones.createdAt)],
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
};
exports.TransaccionesService = TransaccionesService;
exports.TransaccionesService = TransaccionesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [yappy_service_1.YappyService,
        dgi_service_1.DgiService,
        productos_service_1.ProductosService])
], TransaccionesService);
//# sourceMappingURL=transacciones.service.js.map