import { Injectable, Inject, UnauthorizedException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { verificarCodigoTotp, cifrarSecret, generarSecretBase32 } from './totp.util';
import { runInTenantScope } from '../database/tenant/tenant.utils';
import { AuditService } from '../audit/audit.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ActivateAdminDto } from './dto/activate-admin.dto';

export { CreateTenantDto, ActivateAdminDto };

@Injectable()
export class SuperAdminService {
  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async checkSetupStatus() {
    const result = await this.db.execute(sql`SELECT count(*)::int as total FROM plataforma_admins WHERE activo = true`);
    const total = (result.rows[0] as any)?.total || 0;
    return { necesitaSetup: total === 0 };
  }

  async iniciarSetup() {
    const status = await this.checkSetupStatus();
    if (!status.necesitaSetup) {
      throw new BadRequestException('El setup inicial del SuperAdmin ya fue completado.');
    }
    const totpSecret = generarSecretBase32();
    const otpauthUrl = `otpauth://totp/BarberOS%20SaaS:SuperAdmin?secret=${totpSecret}&issuer=BarberOS`;
    return { totpSecret, otpauthUrl };
  }

  async completarSetup(data: { email: string; password: string; totpSecret: string; codigoTotp: string }) {
    const status = await this.checkSetupStatus();
    if (!status.necesitaSetup) {
      throw new BadRequestException('El setup inicial del SuperAdmin ya fue completado.');
    }

    if (!data.email || !data.password || data.password.length < 8) {
      throw new BadRequestException('El correo y una contraseña de al menos 8 caracteres son requeridos.');
    }

    const secretCifrado = cifrarSecret(data.totpSecret);
    const esValido = verificarCodigoTotp(secretCifrado, data.codigoTotp);

    if (!esValido) {
      throw new BadRequestException('Código TOTP de 6 dígitos inválido.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const [nuevoAdmin] = (await this.db.insert(schema.plataformaAdmins).values({
      email: data.email.trim().toLowerCase(),
      passwordHash,
      totpSecretCifrado: secretCifrado,
      totpHabilitado: true,
      activo: true,
    }).returning()) as any[];

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

  /**
   * Paso 1: Validar Email + Password de la tabla plataforma_admins (fuera de RLS)
   */
  /**
   * Helper privado: Registra alerta en DB y dispara NOTIFICACIÓN INMEDIATA de seguridad
   */
  private async registrarYNotificarAlertaCriticaSuperAdmin(
    tipo: string,
    mensaje: string,
    metadatos: Record<string, any>
  ) {
    try {
      await this.db.insert(schema.alertasSeguridad).values({
        tipo,
        nivel: 'critical',
        mensaje,
        metadatos,
      });
    } catch (err) {
      console.error('Error registrando alerta de seguridad en DB:', err);
    }

    // Notificación Activa e Inmediata (Consola Crítica / Webhook Alerta SuperAdmin)
    console.error(`🚨 [NOTIFICACIÓN INMEDIATA SUPERADMIN] 🚨
------------------------------------------------------------------
EVENTO DE SEGURIDAD CRÍTICO: ${tipo}
DESCRIPCIÓN: ${mensaje}
METADATOS: ${JSON.stringify(metadatos, null, 2)}
FECHA: ${new Date().toISOString()}
------------------------------------------------------------------`);
  }

  /**
   * Paso 1: Validar Email + Password de la tabla plataforma_admins (fuera de RLS)
   */
  async iniciarLogin(email: string, password: string, reqInfo?: { ip?: string; userAgent?: string }) {
    const result = await this.db.execute(
      sql`SELECT * FROM plataforma_admins WHERE email = ${email} AND activo = true`
    );
    const admin = result.rows[0] as any;

    const ip = reqInfo?.ip || 'unknown';
    const userAgent = reqInfo?.userAgent || 'unknown';

    if (!admin) {
      await this.registrarYNotificarAlertaCriticaSuperAdmin(
        'login_fallido_superadmin',
        `Intento de login fallido a SuperAdmin con email no registrado o inactivo: ${email}`,
        { email, ip, userAgent, timestamp: new Date().toISOString() }
      );
      throw new UnauthorizedException('Credenciales inválidas de plataforma.');
    }

    let matches = false;
    try {
      matches = await bcrypt.compare(password, admin.password_hash);
    } catch (err: any) {
      console.error('Error en bcrypt.compare superadmin:', err);
      throw new UnauthorizedException('Credenciales inválidas de plataforma.');
    }

    if (!matches) {
      await this.registrarYNotificarAlertaCriticaSuperAdmin(
        'login_fallido_superadmin',
        `Intento de login fallido a SuperAdmin (contraseña incorrecta) para el email: ${email}`,
        { email, ip, userAgent, timestamp: new Date().toISOString() }
      );
      throw new UnauthorizedException('Credenciales inválidas de plataforma.');
    }

    // Emitir token temporal de validación 2FA (expira en 5 minutos)
    const tempToken = this.jwtService.sign(
      { sub: admin.id, email: admin.email, type: 'mfa_pending' },
      { expiresIn: '5m' }
    );

    return {
      message: 'Credenciales correctas. Ingresa tu código 2FA de 6 dígitos.',
      mfaRequired: true,
      tempToken,
    };
  }

  /**
   * Paso 2: Validar TOTP de 6 dígitos y emitir JWT oficial con rol: 'superadmin'
   */
  async verificarTotp(tempToken: string, codigoTotp: string, reqInfo?: { ip?: string; userAgent?: string }) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch (err) {
      throw new UnauthorizedException('El token temporal de autenticación ha expirado. Inicia sesión nuevamente.');
    }

    if (payload.type !== 'mfa_pending') {
      throw new UnauthorizedException('Token de autenticación inválido.');
    }

    const result = await this.db.execute(
      sql`SELECT * FROM plataforma_admins WHERE id = ${payload.sub} AND activo = true`
    );
    const admin = result.rows[0] as any;

    if (!admin) {
      throw new UnauthorizedException('Administrador no encontrado.');
    }

    const isTotpValid = verificarCodigoTotp(admin.totp_secret_cifrado, codigoTotp);
    if (!isTotpValid) {
      await this.registrarYNotificarAlertaCriticaSuperAdmin(
        'totp_fallido_superadmin',
        `Código 2FA TOTP incorrecto en intento de login para SuperAdmin: ${admin.email}`,
        { email: admin.email, ip: reqInfo?.ip || 'unknown', userAgent: reqInfo?.userAgent || 'unknown', timestamp: new Date().toISOString() }
      );
      throw new UnauthorizedException('Código 2FA incorrecto o expirado.');
    }

    // Emisión del JWT oficial con rol superadmin
    const accessToken = this.jwtService.sign(
      { sub: admin.id, email: admin.email, rol: 'superadmin', type: 'superadmin_access' },
      { expiresIn: '12h' }
    );

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

  /**
   * Obtener Estadísticas Globales vía función SQL SECURITY DEFINER
   */
  async obtenerEstadisticas() {
    const result = await this.db.execute(sql`SELECT * FROM get_platform_stats()`);
    const row = result.rows[0] as any;

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

  /**
   * Obtener Resumen de Tenants vía función SQL SECURITY DEFINER
   */
  async listarTenants() {
    const result = await this.db.execute(sql`SELECT * FROM get_all_tenants_summary()`);
    return result.rows.map((row: any) => ({
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

  /**
   * Onboarding Asistido: Crear Barbería Manualmente con runInTenantScope
   */
  async crearTenantManual(dto: CreateTenantDto) {
    console.log('crearTenantManual DTO recibido:', dto);
    const [slugExists] = await this.db
      .select({ id: schema.barberias.id })
      .from(schema.barberias)
      .where(eq(schema.barberias.slug, dto.slug))
      .limit(1);

    if (slugExists) {
      throw new BadRequestException('El slug de la barbería ya está en uso.');
    }

    const [emailExists] = await this.db
      .select({ id: schema.usuarios.id })
      .from(schema.usuarios)
      .where(eq(schema.usuarios.email, dto.adminEmail))
      .limit(1);

    if (emailExists) {
      throw new BadRequestException('El correo del administrador ya está en uso.');
    }

    const tenantId = crypto.randomUUID();
    const adminId = crypto.randomUUID();
    const activationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 horas de vigencia

    const planElegido = dto.planId || 'basico';

    await runInTenantScope(this.db, tenantId, async (tx) => {
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

  /**
   * Activación Pública del Dueño con Token (72h)
   */
  async activarAdminManual(dto: ActivateAdminDto) {
    const result = await this.db.execute(
      sql`SELECT * FROM auth_get_user_by_activation_token(${dto.token})`
    );
    const usuario = result.rows[0] as any;

    if (!usuario) {
      throw new NotFoundException('Token de activación inválido o ya utilizado.');
    }

    if (usuario.token_expira_en && new Date(usuario.token_expira_en) < new Date()) {
      throw new BadRequestException('El token de activación ha expirado.');
    }

    const hashedPassword = await bcrypt.hash(dto.passwordNueva, 10);

    await runInTenantScope(this.db, usuario.tenant_id, async (tx) => {
      await tx
        .update(schema.usuarios)
        .set({
          password: hashedPassword,
          activo: true,
          tokenActivacion: null,
          tokenExpiraEn: null,
        })
        .where(eq(schema.usuarios.id, usuario.id));
    });

    return { message: 'Cuenta activada exitosamente. Ya puedes iniciar sesión con tus credenciales.' };
  }

  /**
   * Inspección de Detalle por Tenant usando runInTenantScope
   */
  async obtenerDetalleTenant(tenantId: string) {
    return await runInTenantScope(this.db, tenantId, async (tx) => {
      const [barberia] = await tx
        .select()
        .from(schema.barberias)
        .where(eq(schema.barberias.id, tenantId))
        .limit(1);

      if (!barberia) throw new NotFoundException('Barbería no encontrada.');

      const staff = await tx
        .select({
          id: schema.usuarios.id,
          nombreCompleto: schema.usuarios.nombreCompleto,
          email: schema.usuarios.email,
          rol: schema.usuarios.rol,
          activo: schema.usuarios.activo,
        })
        .from(schema.usuarios)
        .where(eq(schema.usuarios.tenantId, tenantId));

      const [whatsapp] = await tx
        .select()
        .from(schema.whatsappConfig)
        .where(eq(schema.whatsappConfig.tenantId, tenantId))
        .limit(1);

      const [citasStats] = await tx
        .select({
          total: sql<number>`count(*)`,
          completadas: sql<number>`count(*) filter (where ${schema.citas.estado} = 'completada')`,
          canceladas: sql<number>`count(*) filter (where ${schema.citas.estado} = 'cancelada')`,
        })
        .from(schema.citas)
        .where(eq(schema.citas.tenantId, tenantId));

      const [montoFacturado] = await tx
        .select({
          total: sql<number>`coalesce(sum(${schema.transacciones.totalFacturado}), 0)`,
        })
        .from(schema.transacciones)
        .where(eq(schema.transacciones.tenantId, tenantId));

      const logsAudit = await tx
        .select()
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.tenantId, tenantId))
        .orderBy(desc(schema.auditLogs.createdAt))
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

  /**
   * Cambiar Estado de Suscripción con Audit Log
   */
  async cambiarEstadoTenant(tenantId: string, estado: 'activo' | 'suspendido_pago' | 'cancelado') {
    if (!['activo', 'suspendido_pago', 'cancelado'].includes(estado)) {
      throw new BadRequestException('Estado de suscripción inválido.');
    }

    return await runInTenantScope(this.db, tenantId, async (tx) => {
      const [anterior] = await tx
        .select({ estado: schema.barberias.estado })
        .from(schema.barberias)
        .where(eq(schema.barberias.id, tenantId));

      const [barberia] = await tx
        .update(schema.barberias)
        .set({ estado })
        .where(eq(schema.barberias.id, tenantId))
        .returning();

      if (!barberia) throw new NotFoundException('Barbería no encontrada.');

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

  /**
   * Cambiar Plan de Suscripción con Audit Log
   */
  async cambiarPlanTenant(tenantId: string, plan: 'independiente' | 'basico' | 'premium') {
    if (!['independiente', 'basico', 'premium'].includes(plan)) {
      throw new BadRequestException('Plan de suscripción inválido.');
    }

    return await runInTenantScope(this.db, tenantId, async (tx) => {
      const [anterior] = await tx
        .select({ planId: schema.barberias.planId, planSuscripcion: schema.barberias.planSuscripcion })
        .from(schema.barberias)
        .where(eq(schema.barberias.id, tenantId));

      const [barberia] = await tx
        .update(schema.barberias)
        .set({ planSuscripcion: plan, planId: plan })
        .where(eq(schema.barberias.id, tenantId))
        .returning();

      if (!barberia) throw new NotFoundException('Barbería no encontrada.');

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

  /**
   * Toggle Kill-Switch Preventivo de Plataforma con Audit Log
   */
  async toggleKillSwitchPlatform(tenantId: string, bloqueado: boolean) {
    return await runInTenantScope(this.db, tenantId, async (tx) => {
      const [anterior] = await tx
        .select({ bloqueadoPorPlataforma: schema.barberias.bloqueadoPorPlataforma })
        .from(schema.barberias)
        .where(eq(schema.barberias.id, tenantId));

      const [barberia] = await tx
        .update(schema.barberias)
        .set({ bloqueadoPorPlataforma: bloqueado })
        .where(eq(schema.barberias.id, tenantId))
        .returning();

      if (!barberia) throw new NotFoundException('Barbería no encontrada.');

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

  /**
   * Obtener Métricas Avanzadas de Negocio y Barberías en Riesgo
   */
  async obtenerMetricasNegocio() {
    const result = await this.db.execute(
      sql`SELECT * FROM get_platform_business_metrics()`
    );
    const row = result.rows[0] as any;
    if (!row) return null;
    return {
      nuevasMes: Number(row.barberias_nuevas_mes || 0),
      nuevasSemana: Number(row.barberias_nuevas_semana || 0),
      canceladasMes: Number(row.canceladas_mes || 0),
      barberiasBasico: Number(row.plan_basico_count || 0),
      barberiasPremium: Number(row.plan_premium_count || 0),
      barberiasEnRiesgo: (row.barberias_en_riesgo || []).map((b: any) => ({
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

  /**
   * Obtener Lista de Alertas de Seguridad de la Plataforma
   */
  async obtenerAlertasSeguridad(atendida?: boolean) {
    if (typeof atendida === 'boolean') {
      return await this.db
        .select()
        .from(schema.alertasSeguridad)
        .where(eq(schema.alertasSeguridad.atendida, atendida))
        .orderBy(desc(schema.alertasSeguridad.createdAt));
    }

    return await this.db
      .select()
      .from(schema.alertasSeguridad)
      .orderBy(desc(schema.alertasSeguridad.createdAt));
  }

  /**
   * Marcar Alerta de Seguridad como Atendida
   */
  async marcarAlertaAtendida(id: string) {
    const [alerta] = await this.db
      .update(schema.alertasSeguridad)
      .set({ atendida: true })
      .where(eq(schema.alertasSeguridad.id, id))
      .returning();

    if (!alerta) {
      throw new NotFoundException('Alerta de seguridad no encontrada.');
    }

    return alerta;
  }
}
