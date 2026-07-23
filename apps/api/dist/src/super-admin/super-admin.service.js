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
exports.SuperAdminService = exports.ActivateAdminDto = exports.CreateTenantDto = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const database_constants_1 = require("../database/tenant/database.constants");
const schema = __importStar(require("../database/schema"));
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const totp_util_1 = require("./totp.util");
const tenant_utils_1 = require("../database/tenant/tenant.utils");
const audit_service_1 = require("../audit/audit.service");
const create_tenant_dto_1 = require("./dto/create-tenant.dto");
Object.defineProperty(exports, "CreateTenantDto", { enumerable: true, get: function () { return create_tenant_dto_1.CreateTenantDto; } });
const activate_admin_dto_1 = require("./dto/activate-admin.dto");
Object.defineProperty(exports, "ActivateAdminDto", { enumerable: true, get: function () { return activate_admin_dto_1.ActivateAdminDto; } });
let SuperAdminService = class SuperAdminService {
    db;
    jwtService;
    auditService;
    constructor(db, jwtService, auditService) {
        this.db = db;
        this.jwtService = jwtService;
        this.auditService = auditService;
    }
    async checkSetupStatus() {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT count(*)::int as total FROM plataforma_admins WHERE activo = true`);
        const total = result.rows[0]?.total || 0;
        return { necesitaSetup: total === 0 };
    }
    async iniciarSetup() {
        const status = await this.checkSetupStatus();
        if (!status.necesitaSetup) {
            throw new common_1.BadRequestException('El setup inicial del SuperAdmin ya fue completado.');
        }
        const totpSecret = (0, totp_util_1.generarSecretBase32)();
        const otpauthUrl = `otpauth://totp/BarberOS%20SaaS:SuperAdmin?secret=${totpSecret}&issuer=BarberOS`;
        return { totpSecret, otpauthUrl };
    }
    async completarSetup(data) {
        const status = await this.checkSetupStatus();
        if (!status.necesitaSetup) {
            throw new common_1.BadRequestException('El setup inicial del SuperAdmin ya fue completado.');
        }
        if (!data.email || !data.password || data.password.length < 8) {
            throw new common_1.BadRequestException('El correo y una contraseña de al menos 8 caracteres son requeridos.');
        }
        const secretCifrado = (0, totp_util_1.cifrarSecret)(data.totpSecret);
        const esValido = (0, totp_util_1.verificarCodigoTotp)(secretCifrado, data.codigoTotp);
        if (!esValido) {
            throw new common_1.BadRequestException('Código TOTP de 6 dígitos inválido.');
        }
        const passwordHash = await bcrypt.hash(data.password, 10);
        const [nuevoAdmin] = (await this.db.insert(schema.plataformaAdmins).values({
            email: data.email.trim().toLowerCase(),
            passwordHash,
            totpSecretCifrado: secretCifrado,
            totpHabilitado: true,
            activo: true,
        }).returning());
        const payload = {
            sub: nuevoAdmin.id,
            email: nuevoAdmin.email,
            rol: 'superadmin',
            type: 'superadmin_access',
        };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '12h' });
        return {
            message: 'Setup inicial del SuperAdmin completado con éxito. ¡Bienvenido a BarberOS SaaS!',
            usuario: { id: nuevoAdmin.id, email: nuevoAdmin.email, rol: 'superadmin' },
            accessToken,
        };
    }
    async registrarYNotificarAlertaCriticaSuperAdmin(tipo, mensaje, metadatos) {
        try {
            await this.db.insert(schema.alertasSeguridad).values({
                tipo,
                nivel: 'critical',
                mensaje,
                metadatos,
            });
        }
        catch (err) {
            console.error('Error registrando alerta de seguridad en DB:', err);
        }
        console.error(`🚨 [NOTIFICACIÓN INMEDIATA SUPERADMIN] 🚨
------------------------------------------------------------------
EVENTO DE SEGURIDAD CRÍTICO: ${tipo}
DESCRIPCIÓN: ${mensaje}
METADATOS: ${JSON.stringify(metadatos, null, 2)}
FECHA: ${new Date().toISOString()}
------------------------------------------------------------------`);
    }
    async iniciarLogin(email, password, reqInfo) {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM plataforma_admins WHERE email = ${email} AND activo = true`);
        const admin = result.rows[0];
        const ip = reqInfo?.ip || 'unknown';
        const userAgent = reqInfo?.userAgent || 'unknown';
        if (!admin) {
            await this.registrarYNotificarAlertaCriticaSuperAdmin('login_fallido_superadmin', `Intento de login fallido a SuperAdmin con email no registrado o inactivo: ${email}`, { email, ip, userAgent, timestamp: new Date().toISOString() });
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
            await this.registrarYNotificarAlertaCriticaSuperAdmin('login_fallido_superadmin', `Intento de login fallido a SuperAdmin (contraseña incorrecta) para el email: ${email}`, { email, ip, userAgent, timestamp: new Date().toISOString() });
            throw new common_1.UnauthorizedException('Credenciales inválidas de plataforma.');
        }
        const tempToken = this.jwtService.sign({ sub: admin.id, email: admin.email, type: 'mfa_pending' }, { expiresIn: '5m' });
        return {
            message: 'Credenciales correctas. Ingresa tu código 2FA de 6 dígitos.',
            mfaRequired: true,
            tempToken,
        };
    }
    async verificarTotp(tempToken, codigoTotp, reqInfo) {
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
            await this.registrarYNotificarAlertaCriticaSuperAdmin('totp_fallido_superadmin', `Código 2FA TOTP incorrecto en intento de login para SuperAdmin: ${admin.email}`, { email: admin.email, ip: reqInfo?.ip || 'unknown', userAgent: reqInfo?.userAgent || 'unknown', timestamp: new Date().toISOString() });
            throw new common_1.UnauthorizedException('Código 2FA incorrecto o expirado.');
        }
        const accessToken = this.jwtService.sign({ sub: admin.id, email: admin.email, rol: 'superadmin', type: 'superadmin_access' }, { expiresIn: '12h' });
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
    async crearTenantManual(dto) {
        console.log('crearTenantManual DTO recibido:', dto);
        const [slugExists] = await this.db
            .select({ id: schema.barberias.id })
            .from(schema.barberias)
            .where((0, drizzle_orm_1.eq)(schema.barberias.slug, dto.slug))
            .limit(1);
        if (slugExists) {
            throw new common_1.BadRequestException('El slug de la barbería ya está en uso.');
        }
        const [emailExists] = await this.db
            .select({ id: schema.usuarios.id })
            .from(schema.usuarios)
            .where((0, drizzle_orm_1.eq)(schema.usuarios.email, dto.adminEmail))
            .limit(1);
        if (emailExists) {
            throw new common_1.BadRequestException('El correo del administrador ya está en uso.');
        }
        const tenantId = crypto.randomUUID();
        const adminId = crypto.randomUUID();
        const activationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 72);
        const planElegido = dto.planId || 'basico';
        await (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async (tx) => {
            await tx.insert(schema.barberias).values({
                id: tenantId,
                nombreComercial: dto.nombreComercial,
                slug: dto.slug,
                planSuscripcion: planElegido,
                planId: planElegido,
            });
            await tx.insert(schema.usuarios).values({
                id: adminId,
                tenantId,
                nombreCompleto: dto.adminNombre,
                email: dto.adminEmail,
                rol: 'admin',
                activo: false,
                tokenActivacion: activationToken,
                tokenExpiraEn: expiresAt,
            });
        });
        await this.auditService.logAction({
            tenantId,
            usuarioId: adminId,
            tablaAfectada: 'barberias',
            accion: 'crear_tenant',
            payloadDespues: { nombreComercial: dto.nombreComercial, slug: dto.slug, adminEmail: dto.adminEmail, planId: planElegido },
        });
        return {
            message: 'Barbería creada con éxito en modo Onboarding Asistido.',
            tenantId,
            slug: dto.slug,
            activationToken,
            activationUrl: `http://localhost:3001/${dto.slug}/activar-admin?token=${activationToken}`,
        };
    }
    async activarAdminManual(dto) {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM auth_get_user_by_activation_token(${dto.token})`);
        const usuario = result.rows[0];
        if (!usuario) {
            throw new common_1.NotFoundException('Token de activación inválido o ya utilizado.');
        }
        if (usuario.token_expira_en && new Date(usuario.token_expira_en) < new Date()) {
            throw new common_1.BadRequestException('El token de activación ha expirado.');
        }
        const hashedPassword = await bcrypt.hash(dto.passwordNueva, 10);
        await (0, tenant_utils_1.runInTenantScope)(this.db, usuario.tenant_id, async (tx) => {
            await tx
                .update(schema.usuarios)
                .set({
                password: hashedPassword,
                activo: true,
                tokenActivacion: null,
                tokenExpiraEn: null,
            })
                .where((0, drizzle_orm_1.eq)(schema.usuarios.id, usuario.id));
        });
        return { message: 'Cuenta activada exitosamente. Ya puedes iniciar sesión con tus credenciales.' };
    }
    async obtenerDetalleTenant(tenantId) {
        return await (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async (tx) => {
            const [barberia] = await tx
                .select()
                .from(schema.barberias)
                .where((0, drizzle_orm_1.eq)(schema.barberias.id, tenantId))
                .limit(1);
            if (!barberia)
                throw new common_1.NotFoundException('Barbería no encontrada.');
            const staff = await tx
                .select({
                id: schema.usuarios.id,
                nombreCompleto: schema.usuarios.nombreCompleto,
                email: schema.usuarios.email,
                rol: schema.usuarios.rol,
                activo: schema.usuarios.activo,
            })
                .from(schema.usuarios)
                .where((0, drizzle_orm_1.eq)(schema.usuarios.tenantId, tenantId));
            const [whatsapp] = await tx
                .select()
                .from(schema.whatsappConfig)
                .where((0, drizzle_orm_1.eq)(schema.whatsappConfig.tenantId, tenantId))
                .limit(1);
            const [citasStats] = await tx
                .select({
                total: (0, drizzle_orm_1.sql) `count(*)`,
                completadas: (0, drizzle_orm_1.sql) `count(*) filter (where ${schema.citas.estado} = 'completada')`,
                canceladas: (0, drizzle_orm_1.sql) `count(*) filter (where ${schema.citas.estado} = 'cancelada')`,
            })
                .from(schema.citas)
                .where((0, drizzle_orm_1.eq)(schema.citas.tenantId, tenantId));
            const [montoFacturado] = await tx
                .select({
                total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema.transacciones.totalFacturado}), 0)`,
            })
                .from(schema.transacciones)
                .where((0, drizzle_orm_1.eq)(schema.transacciones.tenantId, tenantId));
            const logsAudit = await tx
                .select()
                .from(schema.auditLogs)
                .where((0, drizzle_orm_1.eq)(schema.auditLogs.tenantId, tenantId))
                .orderBy((0, drizzle_orm_1.desc)(schema.auditLogs.createdAt))
                .limit(50);
            return {
                barberia,
                staff,
                whatsappConfig: whatsapp || { estado: 'desconectado' },
                metricas: {
                    totalCitas: Number(citasStats?.total || 0),
                    citasCompletadas: Number(citasStats?.completadas || 0),
                    citasCanceladas: Number(citasStats?.canceladas || 0),
                    totalFacturado: Number(montoFacturado?.total || 0),
                },
                auditLogs: logsAudit,
            };
        });
    }
    async cambiarEstadoTenant(tenantId, estado) {
        if (!['activo', 'suspendido_pago', 'cancelado'].includes(estado)) {
            throw new common_1.BadRequestException('Estado de suscripción inválido.');
        }
        return await (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async (tx) => {
            const [anterior] = await tx
                .select({ estado: schema.barberias.estado })
                .from(schema.barberias)
                .where((0, drizzle_orm_1.eq)(schema.barberias.id, tenantId));
            const [barberia] = await tx
                .update(schema.barberias)
                .set({ estado })
                .where((0, drizzle_orm_1.eq)(schema.barberias.id, tenantId))
                .returning();
            if (!barberia)
                throw new common_1.NotFoundException('Barbería no encontrada.');
            await this.auditService.logAction({
                tenantId,
                tablaAfectada: 'barberias',
                accion: 'cambiar_estado_tenant',
                payloadAntes: { estado: anterior?.estado },
                payloadDespues: { estado },
            });
            return barberia;
        });
    }
    async cambiarPlanTenant(tenantId, plan) {
        if (!['basico', 'premium'].includes(plan)) {
            throw new common_1.BadRequestException('Plan de suscripción inválido.');
        }
        return await (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async (tx) => {
            const [anterior] = await tx
                .select({ planId: schema.barberias.planId, planSuscripcion: schema.barberias.planSuscripcion })
                .from(schema.barberias)
                .where((0, drizzle_orm_1.eq)(schema.barberias.id, tenantId));
            const [barberia] = await tx
                .update(schema.barberias)
                .set({ planSuscripcion: plan, planId: plan })
                .where((0, drizzle_orm_1.eq)(schema.barberias.id, tenantId))
                .returning();
            if (!barberia)
                throw new common_1.NotFoundException('Barbería no encontrada.');
            await this.auditService.logAction({
                tenantId,
                tablaAfectada: 'barberias',
                accion: 'cambiar_plan_tenant',
                payloadAntes: { planId: anterior?.planId },
                payloadDespues: { planId: plan },
            });
            return barberia;
        });
    }
    async toggleKillSwitchPlatform(tenantId, bloqueado) {
        return await (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async (tx) => {
            const [anterior] = await tx
                .select({ bloqueadoPorPlataforma: schema.barberias.bloqueadoPorPlataforma })
                .from(schema.barberias)
                .where((0, drizzle_orm_1.eq)(schema.barberias.id, tenantId));
            const [barberia] = await tx
                .update(schema.barberias)
                .set({ bloqueadoPorPlataforma: bloqueado })
                .where((0, drizzle_orm_1.eq)(schema.barberias.id, tenantId))
                .returning();
            if (!barberia)
                throw new common_1.NotFoundException('Barbería no encontrada.');
            await this.auditService.logAction({
                tenantId,
                tablaAfectada: 'barberias',
                accion: 'kill_switch_plataforma',
                payloadAntes: { bloqueadoPorPlataforma: anterior?.bloqueadoPorPlataforma },
                payloadDespues: { bloqueadoPorPlataforma: bloqueado },
            });
            return barberia;
        });
    }
    async obtenerMetricasNegocio() {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM get_platform_business_metrics()`);
        const row = result.rows[0];
        if (!row)
            return null;
        return {
            nuevasMes: Number(row.barberias_nuevas_mes || 0),
            nuevasSemana: Number(row.barberias_nuevas_semana || 0),
            canceladasMes: Number(row.canceladas_mes || 0),
            barberiasBasico: Number(row.plan_basico_count || 0),
            barberiasPremium: Number(row.plan_premium_count || 0),
            barberiasEnRiesgo: (row.barberias_en_riesgo || []).map((b) => ({
                id: b.id,
                nombreComercial: b.nombreComercial,
                slug: b.slug,
                estadoBarberia: b.estado,
                whatsappConectado: b.estadoWhatsapp === 'conectado',
                motivos: Array.isArray(b.motivoRiesgo) ? b.motivoRiesgo : [b.motivoRiesgo || 'Inactividad'],
                ultimaCitaFecha: b.ultimaCitaAt,
            })),
        };
    }
    async obtenerAlertasSeguridad(atendida) {
        if (typeof atendida === 'boolean') {
            return await this.db
                .select()
                .from(schema.alertasSeguridad)
                .where((0, drizzle_orm_1.eq)(schema.alertasSeguridad.atendida, atendida))
                .orderBy((0, drizzle_orm_1.desc)(schema.alertasSeguridad.createdAt));
        }
        return await this.db
            .select()
            .from(schema.alertasSeguridad)
            .orderBy((0, drizzle_orm_1.desc)(schema.alertasSeguridad.createdAt));
    }
    async marcarAlertaAtendida(id) {
        const [alerta] = await this.db
            .update(schema.alertasSeguridad)
            .set({ atendida: true })
            .where((0, drizzle_orm_1.eq)(schema.alertasSeguridad.id, id))
            .returning();
        if (!alerta) {
            throw new common_1.NotFoundException('Alerta de seguridad no encontrada.');
        }
        return alerta;
    }
};
exports.SuperAdminService = SuperAdminService;
exports.SuperAdminService = SuperAdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [Function, jwt_1.JwtService,
        audit_service_1.AuditService])
], SuperAdminService);
//# sourceMappingURL=super-admin.service.js.map