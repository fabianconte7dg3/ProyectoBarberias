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
const crypto = __importStar(require("crypto"));
let TransaccionesService = class TransaccionesService {
    yappyService;
    dgiService;
    constructor(yappyService, dgiService) {
        this.yappyService = yappyService;
        this.dgiService = dgiService;
    }
    async cobrarCita(citaId, dto) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const cita = await db.query.citas.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.citas.id, citaId),
            with: {
                barbero: true,
                servicio: true,
            },
        });
        if (!cita) {
            throw new common_1.NotFoundException('Cita no encontrada');
        }
        if (cita.estado !== 'programada' && cita.estado !== 'en_curso') {
            throw new common_1.ConflictException(`No se puede cobrar una cita en estado: ${cita.estado}`);
        }
        const totalFacturado = Number(cita.servicio.precioBase);
        const porcentajeComision = Number(cita.barbero.porcentajeComision || 0);
        const comisionBarbero = (totalFacturado * porcentajeComision) / 100;
        const yappyOrderId = dto.metodoPago === 'yappy' ? crypto.randomBytes(6).toString('hex') : null;
        const [nuevaTransaccion] = await db.insert(schema_1.transacciones).values({
            tenantId,
            citaId: cita.id,
            metodoPago: dto.metodoPago,
            totalFacturado: totalFacturado.toString(),
            montoEfectivoIngresado: dto.montoEfectivoIngresado ? dto.montoEfectivoIngresado.toString() : null,
            comisionBarbero: comisionBarbero.toString(),
            propinaBarbero: dto.propinaBarbero ? dto.propinaBarbero.toString() : '0',
            rucCliente: dto.rucCliente,
            nombreFiscalCliente: dto.nombreFiscalCliente,
            yappyOrderId,
        }).returning();
        let yappyData = null;
        if (dto.metodoPago === 'yappy') {
            yappyData = await this.yappyService.initiatePayment(tenantId, yappyOrderId, totalFacturado);
        }
        if (dto.metodoPago !== 'yappy') {
            await db.update(schema_1.citas)
                .set({ estado: 'completada' })
                .where((0, drizzle_orm_1.eq)(schema_1.citas.id, cita.id));
            this.dgiService.emitirFacturaAsync(tenantId, nuevaTransaccion.id, nuevaTransaccion.totalFacturado, dto.rucCliente, dto.nombreFiscalCliente).catch(err => console.error('Error al emitir factura a DGI:', err));
        }
        return { transaccion: nuevaTransaccion, yappyData };
    }
    async confirmarPagoManual(citaId, confirmadoPorId) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const [transaccion] = await db.query.transacciones.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.transacciones.citaId, citaId),
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.transacciones.createdAt)],
            limit: 1,
        });
        if (!transaccion)
            throw new common_1.NotFoundException('Transacción no encontrada');
        await db.update(schema_1.transacciones)
            .set({ confirmadoPorId })
            .where((0, drizzle_orm_1.eq)(schema_1.transacciones.id, transaccion.id));
        await db.update(schema_1.citas)
            .set({ estado: 'completada' })
            .where((0, drizzle_orm_1.eq)(schema_1.citas.id, citaId));
        this.dgiService.emitirFacturaAsync(tenantId, transaccion.id, transaccion.totalFacturado, transaccion.rucCliente, transaccion.nombreFiscalCliente).catch(err => console.error('Error al emitir factura a DGI:', err));
        return { success: true };
    }
    async findAll(page = 1, limit = 20) {
        const db = tenant_context_1.TenantContext.getDb();
        const offset = (page - 1) * limit;
        const data = await db.query.transacciones.findMany({
            limit,
            offset,
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.transacciones.createdAt)],
            with: {
                cita: {
                    with: {
                        cliente: true,
                        barbero: true,
                        servicio: true,
                    }
                }
            }
        });
        return { data, page, limit };
    }
};
exports.TransaccionesService = TransaccionesService;
exports.TransaccionesService = TransaccionesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [yappy_service_1.YappyService,
        dgi_service_1.DgiService])
], TransaccionesService);
//# sourceMappingURL=transacciones.service.js.map