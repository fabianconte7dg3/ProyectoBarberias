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
const audit_service_1 = require("../audit/audit.service");
let UsuariosService = class UsuariosService {
    db;
    auditService;
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async inviteStaff(dto, tenantId) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);
        const txDb = tenant_context_1.TenantContext.getDb();
        const [barberia] = await txDb
            .select({ planId: schema.barberias.planId })
            .from(schema.barberias)
            .where((0, drizzle_orm_1.eq)(schema.barberias.id, tenantId))
            .limit(1);
        const planId = barberia?.planId || 'basico';
        const [plan] = await this.db
            .select({ limiteBarberos: schema.planes.limiteBarberos })
            .from(schema.planes)
            .where((0, drizzle_orm_1.eq)(schema.planes.id, planId))
            .limit(1);
        const limiteMaximo = plan?.limiteBarberos || 3;
        const resultCount = await txDb
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema.usuarios)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.usuarios.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema.usuarios.rol, 'barbero')));
        const totalActual = Number(resultCount[0]?.count || 0);
        if (totalActual >= limiteMaximo) {
            throw new common_1.BadRequestException(`Has alcanzado el límite de ${limiteMaximo} barberos de tu plan actual (${planId.toUpperCase()}). Actualiza tu plan para agregar más personal.`);
        }
        const [nuevoUsuario] = await txDb.insert(schema.usuarios).values({
            tenantId,
            nombreCompleto: dto.nombreCompleto,
            rol: dto.rol,
            porcentajeComision: dto.porcentajeComision ? dto.porcentajeComision.toString() : null,
            porcentajeComisionProducto: dto.porcentajeComisionProducto ? dto.porcentajeComisionProducto.toString() : null,
            tokenActivacion: token,
            tokenExpiraEn: expiresAt,
            activo: false,
        }).returning({ id: schema.usuarios.id, token: schema.usuarios.tokenActivacion });
        return {
            message: 'Invitación generada con éxito.',
            activationToken: nuevoUsuario.token,
        };
    }
    async toggleKillSwitch(tenantId, adminId, activo, ipOrigen, userAgent) {
        const txDb = tenant_context_1.TenantContext.getDb();
        const [barberiaActual] = await txDb.select({ killSwitchActivo: schema.barberias.killSwitchActivo })
            .from(schema.barberias)
            .where((0, drizzle_orm_1.eq)(schema.barberias.id, tenantId));
        if (!barberiaActual) {
            throw new common_1.NotFoundException('Barbería no encontrada.');
        }
        if (barberiaActual.killSwitchActivo === activo) {
            return { message: `El Kill Switch ya se encuentra ${activo ? 'activado' : 'desactivado'}.` };
        }
        await txDb.update(schema.barberias)
            .set({ killSwitchActivo: activo })
            .where((0, drizzle_orm_1.eq)(schema.barberias.id, tenantId));
        await this.auditService.logAction({
            tenantId,
            usuarioId: adminId,
            tablaAfectada: 'barberias',
            registroId: tenantId,
            accion: 'kill_switch',
            payloadAntes: { killSwitchActivo: barberiaActual.killSwitchActivo },
            payloadDespues: { killSwitchActivo: activo },
            ipOrigen,
            userAgent
        });
        return {
            message: `El Kill Switch ha sido ${activo ? 'ACTIVADO. Todas las mutaciones están bloqueadas.' : 'DESACTIVADO. Sistema operando normalmente.'}`,
            killSwitchActivo: activo
        };
    }
    async updateComision(usuarioId, porcentaje, porcentajeProducto, adminId, ipOrigen, userAgent) {
        const txDb = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const [usuarioActual] = await txDb.select()
            .from(schema.usuarios)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.usuarios.id, usuarioId), (0, drizzle_orm_1.eq)(schema.usuarios.tenantId, tenantId)));
        if (!usuarioActual) {
            throw new common_1.NotFoundException('Usuario no encontrado.');
        }
        const anteriorComision = usuarioActual.porcentajeComision;
        const anteriorComisionProducto = usuarioActual.porcentajeComisionProducto;
        const updateFields = { porcentajeComision: porcentaje.toString() };
        if (porcentajeProducto !== undefined) {
            updateFields.porcentajeComisionProducto = porcentajeProducto.toString();
        }
        await txDb.update(schema.usuarios)
            .set(updateFields)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.usuarios.id, usuarioId), (0, drizzle_orm_1.eq)(schema.usuarios.tenantId, tenantId)));
        await this.auditService.logAction({
            tenantId,
            usuarioId: adminId || 'admin',
            tablaAfectada: 'usuarios',
            registroId: usuarioId,
            accion: 'cambio_comision',
            payloadAntes: { porcentajeComision: anteriorComision, porcentajeComisionProducto: anteriorComisionProducto },
            payloadDespues: updateFields,
            ipOrigen,
            userAgent
        });
        return { success: true, porcentajeComision: porcentaje, porcentajeComisionProducto: porcentajeProducto };
    }
    async activateStaff(dto) {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT id, tenant_id as "tenantId", token_expira_en as "tokenExpiraEn" FROM auth_get_user_by_token(${dto.token})`);
        const usuario = result.rows[0];
        if (!usuario) {
            throw new common_1.NotFoundException('Token inválido o no encontrado.');
        }
        if (usuario.tokenExpiraEn && usuario.tokenExpiraEn < new Date()) {
            throw new common_1.BadRequestException('El token ha expirado.');
        }
        const hashedPin = await bcrypt.hash(dto.pin, 10);
        await this.db.transaction(async (tx) => {
            await tx.execute((0, drizzle_orm_1.sql) `SELECT set_config('app.current_tenant_id', ${usuario.tenantId}, true)`);
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
    __metadata("design:paramtypes", [Function, audit_service_1.AuditService])
], UsuariosService);
//# sourceMappingURL=usuarios.service.js.map