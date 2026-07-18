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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientesService = void 0;
const common_1 = require("@nestjs/common");
const tenant_context_1 = require("../database/tenant/tenant-context");
const schema = __importStar(require("../database/schema"));
const drizzle_orm_1 = require("drizzle-orm");
let ClientesService = class ClientesService {
    async create(dto) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        try {
            const [nuevoCliente] = await db.insert(schema.clientes).values({
                tenantId,
                telefonoWhatsapp: dto.telefonoWhatsapp,
                nombreCompleto: dto.nombreCompleto,
                notasPreferencia: dto.notasPreferencia,
            }).returning();
            return nuevoCliente;
        }
        catch (error) {
            if (error.code === '23505' || error.cause?.code === '23505') {
                throw new common_1.ConflictException(`Ya existe un cliente con el teléfono ${dto.telefonoWhatsapp}.`);
            }
            throw error;
        }
    }
    async findAll(q) {
        const db = tenant_context_1.TenantContext.getDb();
        if (q) {
            return db.query.clientes.findMany({
                where: (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema.clientes.nombreCompleto, `%${q}%`), (0, drizzle_orm_1.ilike)(schema.clientes.telefonoWhatsapp, `%${q}%`)),
                orderBy: [(0, drizzle_orm_1.asc)(schema.clientes.nombreCompleto)],
            });
        }
        return db.query.clientes.findMany({
            orderBy: [(0, drizzle_orm_1.asc)(schema.clientes.nombreCompleto)],
        });
    }
    async findOne(id) {
        const db = tenant_context_1.TenantContext.getDb();
        const cliente = await db.query.clientes.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.clientes.id, id),
        });
        if (!cliente) {
            throw new common_1.NotFoundException(`Cliente con ID ${id} no encontrado.`);
        }
        return cliente;
    }
    async update(id, dto) {
        const db = tenant_context_1.TenantContext.getDb();
        await this.findOne(id);
        const [clienteActualizado] = await db.update(schema.clientes).set({
            ...(dto.nombreCompleto !== undefined && { nombreCompleto: dto.nombreCompleto }),
            ...(dto.notasPreferencia !== undefined && { notasPreferencia: dto.notasPreferencia }),
            ...(dto.barberoFrecuenteId !== undefined && { barberoFrecuenteId: dto.barberoFrecuenteId }),
            ...(dto.bloqueado !== undefined && { bloqueado: dto.bloqueado }),
        })
            .where((0, drizzle_orm_1.eq)(schema.clientes.id, id))
            .returning();
        return clienteActualizado;
    }
};
exports.ClientesService = ClientesService;
exports.ClientesService = ClientesService = __decorate([
    (0, common_1.Injectable)()
], ClientesService);
//# sourceMappingURL=clientes.service.js.map