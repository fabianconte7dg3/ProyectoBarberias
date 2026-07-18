"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitasService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../database/schema");
const tenant_context_1 = require("../database/tenant/tenant-context");
let CitasService = class CitasService {
    async listarCitasDeHoy() {
        const db = tenant_context_1.TenantContext.getDb();
        return db.select().from(schema_1.citas);
    }
    async crearCita(data) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const [nuevaCita] = await db
            .insert(schema_1.citas)
            .values({ ...data, tenantId })
            .returning();
        return nuevaCita;
    }
    async cancelarCita(citaId) {
        const db = tenant_context_1.TenantContext.getDb();
        return db
            .update(schema_1.citas)
            .set({ estado: 'cancelada' })
            .where((0, drizzle_orm_1.eq)(schema_1.citas.id, citaId))
            .returning();
    }
};
exports.CitasService = CitasService;
exports.CitasService = CitasService = __decorate([
    (0, common_1.Injectable)()
], CitasService);
//# sourceMappingURL=citas.service.js.map