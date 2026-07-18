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
let AuthService = class AuthService {
    db;
    jwtService;
    constructor(db, jwtService) {
        this.db = db;
        this.jwtService = jwtService;
    }
    async registerBarberia(dto) {
        const existingBarberia = await this.db.query.barberias.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.barberias.slug, dto.slug),
        });
        if (existingBarberia) {
            throw new common_1.BadRequestException('El slug ya está en uso.');
        }
        const existingAdmin = await this.db.query.usuarios.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.usuarios.email, dto.adminEmail),
        });
        if (existingAdmin) {
            throw new common_1.BadRequestException('El email del administrador ya está en uso.');
        }
        const tenantId = crypto.randomUUID();
        const adminId = crypto.randomUUID();
        const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);
        await this.db.transaction(async (tx) => {
            await tx.execute(drizzle_orm_1.sql.raw(`SET LOCAL app.current_tenant_id = '${tenantId}'`));
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
        const admin = await this.db.query.usuarios.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.usuarios.email, dto.email), (0, drizzle_orm_1.eq)(schema.usuarios.rol, 'admin')),
        });
        if (!admin || !admin.activo || !admin.password) {
            throw new common_1.UnauthorizedException('Credenciales inválidas o usuario inactivo.');
        }
        const passwordMatches = await bcrypt.compare(dto.password, admin.password);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException('Credenciales inválidas.');
        }
        const payload = { sub: admin.id, tenantId: admin.tenantId, rol: admin.rol };
        return {
            accessToken: this.jwtService.sign(payload),
        };
    }
    async loginStaff(dto) {
        const barberia = await this.db.query.barberias.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.barberias.slug, dto.slug),
        });
        if (!barberia || barberia.estado !== 'activo') {
            throw new common_1.UnauthorizedException('Barbería no encontrada o inactiva.');
        }
        const staffMembers = await this.db.query.usuarios.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.usuarios.tenantId, barberia.id), (0, drizzle_orm_1.eq)(schema.usuarios.activo, true), (0, drizzle_orm_1.inArray)(schema.usuarios.rol, ['barbero', 'recepcion'])),
        });
        let matchedStaff = null;
        for (const staff of staffMembers) {
            if (staff.pinAcceso) {
                const isMatch = await bcrypt.compare(dto.pin, staff.pinAcceso);
                if (isMatch) {
                    matchedStaff = staff;
                    break;
                }
            }
        }
        if (!matchedStaff) {
            throw new common_1.UnauthorizedException('PIN inválido.');
        }
        const payload = { sub: matchedStaff.id, tenantId: matchedStaff.tenantId, rol: matchedStaff.rol };
        return {
            accessToken: this.jwtService.sign(payload),
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