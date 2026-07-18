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
exports.UsuariosService = void 0;
const common_1 = require("@nestjs/common");
const database_constants_1 = require("../database/tenant/database.constants");
const schema = __importStar(require("../database/schema"));
const drizzle_orm_1 = require("drizzle-orm");
const crypto = __importStar(require("crypto"));
const bcrypt = __importStar(require("bcrypt"));
const tenant_context_1 = require("../database/tenant/tenant-context");
let UsuariosService = class UsuariosService {
    db;
    constructor(db) {
        this.db = db;
    }
    async inviteStaff(dto, tenantId) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);
        const [nuevoUsuario] = await this.db.insert(schema.usuarios).values({
            tenantId,
            nombreCompleto: dto.nombreCompleto,
            rol: dto.rol,
            porcentajeComision: dto.porcentajeComision ? dto.porcentajeComision.toString() : null,
            tokenActivacion: token,
            tokenExpiraEn: expiresAt,
            activo: false,
        }).returning({ id: schema.usuarios.id, token: schema.usuarios.tokenActivacion });
        return {
            message: 'Invitación generada con éxito.',
            activationToken: nuevoUsuario.token,
        };
    }
    async activateStaff(dto) {
        const usuario = await this.db.query.usuarios.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.usuarios.tokenActivacion, dto.token),
        });
        if (!usuario) {
            throw new common_1.NotFoundException('Token inválido o no encontrado.');
        }
        if (usuario.tokenExpiraEn && usuario.tokenExpiraEn < new Date()) {
            throw new common_1.BadRequestException('El token ha expirado.');
        }
        const hashedPin = await bcrypt.hash(dto.pin, 10);
        await this.db.transaction(async (tx) => {
            await tx.execute(drizzle_orm_1.sql.raw(`SET LOCAL app.current_tenant_id = '${usuario.tenantId}'`));
            await tx.update(schema.usuarios)
                .set({
                pinAcceso: hashedPin,
                tokenActivacion: null,
                tokenExpiraEn: null,
                activo: true,
            })
                .where((0, drizzle_orm_1.eq)(schema.usuarios.id, usuario.id));
        });
        return { message: 'Cuenta activada exitosamente. Ya puedes iniciar sesión con tu PIN.' };
    }
    async findAll() {
        const db = tenant_context_1.TenantContext.getDb();
        return db.query.usuarios.findMany();
    }
    async findOne(id) {
        const db = tenant_context_1.TenantContext.getDb();
        const usuario = await db.query.usuarios.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.usuarios.id, id),
        });
        if (!usuario) {
            throw new common_1.NotFoundException(`Usuario con ID ${id} no encontrado.`);
        }
        return usuario;
    }
};
exports.UsuariosService = UsuariosService;
exports.UsuariosService = UsuariosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [Function])
], UsuariosService);
//# sourceMappingURL=usuarios.service.js.map