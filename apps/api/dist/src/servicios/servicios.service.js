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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiciosService = void 0;
const common_1 = require("@nestjs/common");
const tenant_context_1 = require("../database/tenant/tenant-context");
const tenant_utils_1 = require("../database/tenant/tenant.utils");
const database_constants_1 = require("../database/tenant/database.constants");
const schema = __importStar(require("../database/schema"));
const drizzle_orm_1 = require("drizzle-orm");
let ServiciosService = class ServiciosService {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(dto) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const [nuevoServicio] = await db.insert(schema.servicios).values({
            tenantId,
            nombre: dto.nombre,
            duracionMinutos: dto.duracionMinutos,
            precioBase: dto.precioBase.toString(),
        }).returning();
        return nuevoServicio;
    }
    async findAll() {
        const db = tenant_context_1.TenantContext.getDb();
        return db.query.servicios.findMany({
            where: (0, drizzle_orm_1.eq)(schema.servicios.activo, true),
            orderBy: [(0, drizzle_orm_1.asc)(schema.servicios.nombre)],
        });
    }
    async findPublicBySlug(slug) {
        const tenantResult = await this.db.execute((0, drizzle_orm_1.sql) `SELECT id FROM barberias WHERE slug = ${slug}`);
        const tenantId = tenantResult.rows[0]?.id;
        if (!tenantId)
            throw new common_1.NotFoundException('Barbería no encontrada');
        return (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async (tx) => {
            return tx.query.servicios.findMany({
                where: (0, drizzle_orm_1.eq)(schema.servicios.activo, true),
                orderBy: [(0, drizzle_orm_1.asc)(schema.servicios.nombre)],
            });
        });
    }
    async findOne(id) {
        const db = tenant_context_1.TenantContext.getDb();
        const servicio = await db.query.servicios.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.servicios.id, id), (0, drizzle_orm_1.eq)(schema.servicios.activo, true)),
        });
        if (!servicio) {
            throw new common_1.NotFoundException(`Servicio con ID ${id} no encontrado.`);
        }
        return servicio;
    }
    async update(id, dto) {
        const db = tenant_context_1.TenantContext.getDb();
        await this.findOne(id);
        const [servicioActualizado] = await db.update(schema.servicios).set({
            ...(dto.nombre && { nombre: dto.nombre }),
            ...(dto.duracionMinutos !== undefined && { duracionMinutos: dto.duracionMinutos }),
            ...(dto.precioBase !== undefined && { precioBase: dto.precioBase.toString() }),
        })
            .where((0, drizzle_orm_1.eq)(schema.servicios.id, id))
            .returning();
        return servicioActualizado;
    }
    async softDelete(id) {
        const db = tenant_context_1.TenantContext.getDb();
        await this.findOne(id);
        await db.update(schema.servicios)
            .set({ activo: false })
            .where((0, drizzle_orm_1.eq)(schema.servicios.id, id));
        return { message: 'Servicio eliminado correctamente.' };
    }
};
exports.ServiciosService = ServiciosService;
exports.ServiciosService = ServiciosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [Function])
], ServiciosService);
//# sourceMappingURL=servicios.service.js.map