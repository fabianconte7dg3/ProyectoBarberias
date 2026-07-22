import { Injectable, Inject, UnauthorizedException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, sql } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { verificarCodigoTotp } from './totp.util';

@Injectable()
export class SuperAdminService {
  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Paso 1: Validar Email + Password de la tabla plataforma_admins (fuera de RLS)
   */
  async iniciarLogin(email: string, password: string) {
    const result = await this.db.execute(
      sql`SELECT * FROM plataforma_admins WHERE email = ${email} AND activo = true`
    );
    const admin = result.rows[0] as any;

    if (!admin) {
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
  async verificarTotp(tempToken: string, codigoTotp: string) {
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
      throw new UnauthorizedException('Código 2FA incorrecto o expirado.');
    }

    // Emisión del JWT oficial con rol superadmin
    const accessToken = this.jwtService.sign(
      { sub: admin.id, email: admin.email, rol: 'superadmin' },
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
   * Cambiar Estado de Suscripción (activo, suspendido_pago, cancelado)
   */
  async cambiarEstadoTenant(tenantId: string, estado: 'activo' | 'suspendido_pago' | 'cancelado') {
    if (!['activo', 'suspendido_pago', 'cancelado'].includes(estado)) {
      throw new BadRequestException('Estado de suscripción inválido.');
    }

    const [barberia] = await this.db
      .update(schema.barberias)
      .set({ estado })
      .where(eq(schema.barberias.id, tenantId))
      .returning();

    if (!barberia) throw new NotFoundException('Barbería no encontrada.');
    return barberia;
  }

  /**
   * Cambiar Plan de Suscripción (basico $29, premium $79)
   */
  async cambiarPlanTenant(tenantId: string, plan: 'basico' | 'premium') {
    if (!['basico', 'premium'].includes(plan)) {
      throw new BadRequestException('Plan de suscripción inválido.');
    }

    const [barberia] = await this.db
      .update(schema.barberias)
      .set({ planSuscripcion: plan })
      .where(eq(schema.barberias.id, tenantId))
      .returning();

    if (!barberia) throw new NotFoundException('Barbería no encontrada.');
    return barberia;
  }

  /**
   * Toggle Kill-Switch Preventivo de la Plataforma (bloqueado_por_plataforma)
   */
  async toggleKillSwitchPlatform(tenantId: string, bloqueado: boolean) {
    const [barberia] = await this.db
      .update(schema.barberias)
      .set({ bloqueadoPorPlataforma: bloqueado })
      .where(eq(schema.barberias.id, tenantId))
      .returning();

    if (!barberia) throw new NotFoundException('Barbería no encontrada.');
    return barberia;
  }
}
