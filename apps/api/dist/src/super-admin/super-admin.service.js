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
exports.SuperAdminService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const database_constants_1 = require("../database/tenant/database.constants");
const schema = __importStar(require("../database/schema"));
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt = __importStar(require("bcrypt"));
const totp_util_1 = require("./totp.util");
let SuperAdminService = class SuperAdminService {
    db;
    jwtService;
    constructor(db, jwtService) {
        this.db = db;
        this.jwtService = jwtService;
    }
    async iniciarLogin(email, password) {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM plataforma_admins WHERE email = ${email} AND activo = true`);
        const admin = result.rows[0];
        if (!admin) {
            throw new common_1.UnauthorizedException('Credenciales inválidas de plataforma.');
        }
        let matches = false;
        try {
            matches = await bcrypt.compare(password, admin.password_hash);
        }
        catch (err) {
            console.error('Error en bcrypt.compare superadmin:', err);
            throw new common_1.UnauthorizedException('Credenciales inválidas de plataforma.');
        }
        if (!matches) {
            throw new common_1.UnauthorizedException('Credenciales inválidas de plataforma.');
        }
        const tempToken = this.jwtService.sign({ sub: admin.id, email: admin.email, type: 'mfa_pending' }, { expiresIn: '5m' });
        return {
            message: 'Credenciales correctas. Ingresa tu código 2FA de 6 dígitos.',
            mfaRequired: true,
            tempToken,
        };
    }
    async verificarTotp(tempToken, codigoTotp) {
        let payload;
        try {
            payload = this.jwtService.verify(tempToken);
        }
        catch (err) {
            throw new common_1.UnauthorizedException('El token temporal de autenticación ha expirado. Inicia sesión nuevamente.');
        }
        if (payload.type !== 'mfa_pending') {
            throw new common_1.UnauthorizedException('Token de autenticación inválido.');
        }
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM plataforma_admins WHERE id = ${payload.sub} AND activo = true`);
        const admin = result.rows[0];
        if (!admin) {
            throw new common_1.UnauthorizedException('Administrador no encontrado.');
        }
        const isTotpValid = (0, totp_util_1.verificarCodigoTotp)(admin.totp_secret_cifrado, codigoTotp);
        if (!isTotpValid) {
            throw new common_1.UnauthorizedException('Código 2FA incorrecto o expirado.');
        }
        const accessToken = this.jwtService.sign({ sub: admin.id, email: admin.email, rol: 'superadmin' }, { expiresIn: '12h' });
        return {
            message: 'Autenticación 2FA exitosa',
            accessToken,
            usuario: {
                id: admin.id,
                email: admin.email,
                rol: 'superadmin',
            },
        };
    }
    async obtenerEstadisticas() {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM get_platform_stats()`);
        const row = result.rows[0];
        return {
            totalBarberias: Number(row.total_barberias || 0),
            barberiasActivas: Number(row.barberias_activas || 0),
            barberiasSuspendidas: Number(row.barberias_suspendidas || 0),
            mrrEstimado: Number(row.mrr_estimado || 0),
            mrrEtiqueta: 'MRR Estimado (Basado en planes activos)',
            totalCitasMes: Number(row.total_citas_mes || 0),
            totalFacturadoMes: Number(row.total_facturado_mes || 0),
        };
    }
    async listarTenants() {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM get_all_tenants_summary()`);
        return result.rows.map((row) => ({
            id: row.id,
            nombreComercial: row.nombre_comercial,
            slug: row.slug,
            planSuscripcion: row.plan_suscripcion,
            estadoBarberia: row.estado_barberia,
            bloqueadoPorPlataforma: row.bloqueado_por_plataforma,
            adminEmail: row.admin_email || 'Sin admin',
            adminNombre: row.admin_nombre || 'Sin nombre',
            createdAt: row.created_at,
            totalBarberos: Number(row.total_barberos || 0),
            totalCitasMes: Number(row.total_citas_mes || 0),
            totalFacturadoMes: Number(row.total_facturado_mes || 0),
        }));
    }
    async cambiarEstadoTenant(tenantId, estado) {
        if (!['activo', 'suspendido_pago', 'cancelado'].includes(estado)) {
            throw new common_1.BadRequestException('Estado de suscripción inválido.');
        }
        const [barberia] = await this.db
            .update(schema.barberias)
            .set({ estado })
            .where((0, drizzle_orm_1.eq)(schema.barberias.id, tenantId))
            .returning();
        if (!barberia)
            throw new common_1.NotFoundException('Barbería no encontrada.');
        return barberia;
    }
    async cambiarPlanTenant(tenantId, plan) {
        if (!['basico', 'premium'].includes(plan)) {
            throw new common_1.BadRequestException('Plan de suscripción inválido.');
        }
        const [barberia] = await this.db
            .update(schema.barberias)
            .set({ planSuscripcion: plan })
            .where((0, drizzle_orm_1.eq)(schema.barberias.id, tenantId))
            .returning();
        if (!barberia)
            throw new common_1.NotFoundException('Barbería no encontrada.');
        return barberia;
    }
    async toggleKillSwitchPlatform(tenantId, bloqueado) {
        const [barberia] = await this.db
            .update(schema.barberias)
            .set({ bloqueadoPorPlataforma: bloqueado })
            .where((0, drizzle_orm_1.eq)(schema.barberias.id, tenantId))
            .returning();
        if (!barberia)
            throw new common_1.NotFoundException('Barbería no encontrada.');
        return barberia;
    }
};
exports.SuperAdminService = SuperAdminService;
exports.SuperAdminService = SuperAdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [Function, jwt_1.JwtService])
], SuperAdminService);
//# sourceMappingURL=super-admin.service.js.map