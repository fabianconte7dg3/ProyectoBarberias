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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const database_constants_1 = require("../database/tenant/database.constants");
const schema = __importStar(require("../database/schema"));
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const tenant_utils_1 = require("../database/tenant/tenant.utils");
let AuthService = class AuthService {
    db;
    jwtService;
    failedAttempts = new Map();
    constructor(db, jwtService) {
        this.db = db;
        this.jwtService = jwtService;
    }
    async registerBarberia(dto) {
        const resultSlug = await this.db.execute((0, drizzle_orm_1.sql) `SELECT id FROM auth_get_tenant_by_slug(${dto.slug})`);
        if (resultSlug.rows.length > 0) {
            throw new common_1.BadRequestException('El slug ya está en uso.');
        }
        const resultAdmin = await this.db.execute((0, drizzle_orm_1.sql) `SELECT id FROM auth_get_user_by_email(${dto.adminEmail})`);
        if (resultAdmin.rows.length > 0) {
            throw new common_1.BadRequestException('El email del administrador ya está en uso.');
        }
        const tenantId = crypto.randomUUID();
        const adminId = crypto.randomUUID();
        const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);
        await this.db.transaction(async (tx) => {
            await tx.execute((0, drizzle_orm_1.sql) `SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
            await tx.insert(schema.barberias).values({
                id: tenantId,
                nombreComercial: dto.nombreComercial,
                slug: dto.slug,
            });
            await tx.insert(schema.usuarios).values({
                id: adminId,
                tenantId: tenantId,
                nombreCompleto: dto.adminNombreCompleto,
                email: dto.adminEmail,
                password: hashedPassword,
                rol: 'admin',
            });
        });
        return { message: 'Barbería y administrador creados exitosamente', tenantId };
    }
    async loginAdmin(dto) {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM auth_get_user_by_email(${dto.email})`);
        const adminRow = result.rows[0];
        if (!adminRow || adminRow.rol !== 'admin') {
            throw new common_1.UnauthorizedException('Credenciales inválidas.');
        }
        const admin = {
            id: adminRow.id,
            tenantId: adminRow.tenant_id,
            password: adminRow.password,
            activo: adminRow.activo,
            rol: adminRow.rol
        };
        if (!admin.password || !admin.activo) {
            throw new common_1.UnauthorizedException('Credenciales inválidas o cuenta no activada.');
        }
        const passwordMatches = await bcrypt.compare(dto.password, admin.password);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException('Credenciales inválidas.');
        }
        const resultTenant = await (0, tenant_utils_1.runInTenantScope)(this.db, admin.tenantId, async (tx) => {
            return await tx.execute((0, drizzle_orm_1.sql) `SELECT estado, bloqueado_por_plataforma FROM barberias WHERE id = ${admin.tenantId}`);
        });
        const tenantRow = resultTenant.rows[0];
        if (tenantRow) {
            if (tenantRow.bloqueado_por_plataforma) {
                throw new common_1.ForbiddenException('Esta cuenta ha sido bloqueada preventivamente por la plataforma por razones de seguridad. Contacta a soporte.');
            }
            if (tenantRow.estado === 'suspendido_pago') {
                throw new common_1.ForbiddenException('La suscripción de la barbería está suspendida por falta de pago. Contacta a soporte.');
            }
            if (tenantRow.estado !== 'activo') {
                throw new common_1.ForbiddenException('La suscripción de la barbería está inactiva.');
            }
        }
        const payload = { sub: admin.id, tenantId: admin.tenantId, rol: admin.rol };
        return {
            accessToken: this.jwtService.sign(payload),
            usuario: {
                id: admin.id,
                nombreCompleto: adminRow.nombre_completo || 'Administrador (Dueño)',
                rol: admin.rol
            }
        };
    }
    async getStaffForLogin(slug) {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT id, estado FROM auth_get_tenant_by_slug(${slug})`);
        const barberia = result.rows[0];
        if (!barberia) {
            throw new common_1.UnauthorizedException('Barbería no encontrada.');
        }
        if (barberia.estado !== 'activo') {
            throw new common_1.ForbiddenException('La suscripción de la barbería está inactiva.');
        }
        const staffMembers = await (0, tenant_utils_1.runInTenantScope)(this.db, barberia.id, async (tx) => {
            return await tx.query.usuarios.findMany({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.usuarios.tenantId, barberia.id), (0, drizzle_orm_1.inArray)(schema.usuarios.rol, ['barbero', 'recepcion']), (0, drizzle_orm_1.eq)(schema.usuarios.activo, true)),
                columns: {
                    id: true,
                    nombreCompleto: true,
                    rol: true
                }
            });
        });
        return staffMembers;
    }
    async loginStaff(dto) {
        const key = `${dto.slug}:${dto.userId}`;
        const record = this.failedAttempts.get(key);
        if (record && record.lockUntil > Date.now()) {
            const seconds = Math.ceil((record.lockUntil - Date.now()) / 1000);
            throw new common_1.ForbiddenException(`Demasiados intentos. Intenta de nuevo en ${seconds}s.`);
        }
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT id, estado FROM auth_get_tenant_by_slug(${dto.slug})`);
        const barberia = result.rows[0];
        if (!barberia) {
            throw new common_1.UnauthorizedException('Barbería no encontrada.');
        }
        if (barberia.estado !== 'activo') {
            throw new common_1.ForbiddenException('La suscripción de la barbería está inactiva.');
        }
        const matchedStaffArray = await (0, tenant_utils_1.runInTenantScope)(this.db, barberia.id, async (tx) => {
            return await tx.query.usuarios.findMany({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.usuarios.tenantId, barberia.id), (0, drizzle_orm_1.eq)(schema.usuarios.id, dto.userId), (0, drizzle_orm_1.inArray)(schema.usuarios.rol, ['barbero', 'recepcion'])),
            });
        });
        const matchedStaff = matchedStaffArray[0];
        if (!matchedStaff || !matchedStaff.pinAcceso) {
            throw new common_1.UnauthorizedException('Usuario o PIN inválido.');
        }
        const isMatch = await bcrypt.compare(dto.pin, matchedStaff.pinAcceso);
        if (!isMatch) {
            let count = (record?.count || 0) + 1;
            let lockUntil = 0;
            if (count >= 5) {
                if (count === 5)
                    lockUntil = Date.now() + 30 * 1000;
                else if (count === 6)
                    lockUntil = Date.now() + 2 * 60 * 1000;
                else
                    lockUntil = Date.now() + 5 * 60 * 1000;
            }
            this.failedAttempts.set(key, { count, lockUntil });
            throw new common_1.UnauthorizedException('Usuario o PIN inválido.');
        }
        if (!matchedStaff.activo) {
            throw new common_1.ForbiddenException('Esta cuenta está suspendida. Contacta al administrador local.');
        }
        this.failedAttempts.delete(key);
        const payload = { sub: matchedStaff.id, tenantId: matchedStaff.tenantId, rol: matchedStaff.rol };
        return {
            accessToken: this.jwtService.sign(payload),
            usuario: {
                id: matchedStaff.id,
                nombreCompleto: matchedStaff.nombreCompleto,
                rol: matchedStaff.rol
            }
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [Function, jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map