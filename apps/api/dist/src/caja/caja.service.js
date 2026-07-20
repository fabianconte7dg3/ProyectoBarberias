"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CajaService = void 0;
const common_1 = require("@nestjs/common");
const tenant_context_1 = require("../database/tenant/tenant-context");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const date_fns_1 = require("date-fns");
let CajaService = class CajaService {
    async getBalanceDelDia() {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const hoy = (0, date_fns_1.startOfDay)(new Date());
        const txsDelDia = await db.query.transacciones.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.transacciones.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.transacciones.createdAt, hoy), (0, drizzle_orm_1.sql) `${schema_1.transacciones.metodoPago} IN ('efectivo', 'mixto')`)
        });
        let efectivoEsperado = 0;
        for (const tx of txsDelDia) {
            if (tx.metodoPago === 'efectivo') {
                efectivoEsperado += Number(tx.totalFacturado);
            }
            else if (tx.metodoPago === 'mixto') {
                efectivoEsperado += Number(tx.montoEfectivoIngresado || 0);
            }
        }
        return {
            fecha: hoy,
            efectivoEsperado,
            cantidadTransaccionesEfectivo: txsDelDia.length
        };
    }
    async cerrarCaja(usuarioId, dto) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const hoy = new Date();
        const balance = await this.getBalanceDelDia();
        let estado = 'cuadra';
        const diferencia = dto.efectivoDeclarado - balance.efectivoEsperado;
        if (diferencia > 0)
            estado = 'sobrante';
        if (diferencia < 0)
            estado = 'faltante';
        const [nuevoCierre] = await db.insert(schema_1.cierresDeCaja).values({
            tenantId,
            declaradoPorId: usuarioId,
            fechaCierre: hoy.toISOString(),
            efectivoDeclarado: dto.efectivoDeclarado.toString(),
            efectivoEsperado: balance.efectivoEsperado.toString(),
            estado,
            notasAdmin: dto.notasAdmin
        }).returning();
        return nuevoCierre;
    }
};
exports.CajaService = CajaService;
exports.CajaService = CajaService = __decorate([
    (0, common_1.Injectable)()
], CajaService);
//# sourceMappingURL=caja.service.js.map