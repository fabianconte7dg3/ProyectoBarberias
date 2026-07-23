import { Inject, Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterBarberiaDto } from './dto/register-barberia.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { LoginStaffDto } from './dto/login-staff.dto';
import { runInTenantScope } from '../database/tenant/tenant.utils';

@Injectable()
export class AuthService {
  private failedAttempts = new Map<string, { count: number, lockUntil: number }>();

  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
  ) {}

  async registerBarberia(dto: RegisterBarberiaDto) {
    const resultSlug = await this.db.execute(sql`SELECT id FROM auth_get_tenant_by_slug(${dto.slug})`);
    if (resultSlug.rows.length > 0) {
      throw new BadRequestException('El slug ya está en uso.');
    }

    // SECURITY DEFINER to check if email is used
    const resultAdmin = await this.db.execute(sql`SELECT id FROM auth_get_user_by_email(${dto.adminEmail})`);
    if (resultAdmin.rows.length > 0) {
      throw new BadRequestException('El email del administrador ya está en uso.');
    }

    const tenantId = crypto.randomUUID();
    const adminId = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);

    await this.db.transaction(async (tx) => {
      // Solución al problema del huevo y la gallina con el RLS
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

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

  async loginAdmin(dto: LoginAdminDto) {
    const result = await this.db.execute(sql`SELECT * FROM auth_get_user_by_email(${dto.email})`);
    const adminRow = result.rows[0] as any;
    
    if (!adminRow || adminRow.rol !== 'admin') {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const admin = {
      id: adminRow.id,
      tenantId: adminRow.tenant_id,
      password: adminRow.password,
      activo: adminRow.activo,
      rol: adminRow.rol
    };

    if (!admin.password || !admin.activo) {
      throw new UnauthorizedException('Credenciales inválidas o cuenta no activada.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, admin.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    // Checking if the tenant is active & not blocked by platform
    const resultTenant = await runInTenantScope(this.db, admin.tenantId, async (tx) => {
      return await tx.execute(sql`SELECT estado, bloqueado_por_plataforma FROM barberias WHERE id = ${admin.tenantId}`);
    });
    
    const tenantRow = resultTenant.rows[0] as any;
    if (tenantRow) {
      if (tenantRow.bloqueado_por_plataforma) {
        throw new ForbiddenException('Esta cuenta ha sido bloqueada preventivamente por la plataforma por razones de seguridad. Contacta a soporte.');
      }
      if (tenantRow.estado === 'suspendido_pago') {
        throw new ForbiddenException('La suscripción de la barbería está suspendida por falta de pago. Contacta a soporte.');
      }
      if (tenantRow.estado !== 'activo') {
        throw new ForbiddenException('La suscripción de la barbería está inactiva.');
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

  async getStaffForLogin(slug: string) {
    const result = await this.db.execute(sql`SELECT id, estado FROM auth_get_tenant_by_slug(${slug})`);
    const barberia = result.rows[0] as any;

    if (!barberia) {
      throw new UnauthorizedException('Barbería no encontrada.');
    }

    if (barberia.estado !== 'activo') {
      throw new ForbiddenException('La suscripción de la barbería está inactiva.');
    }

    const staffMembers = await runInTenantScope(this.db, barberia.id, async (tx) => {
      return await tx.query.usuarios.findMany({
        where: and(
          eq(schema.usuarios.tenantId, barberia.id),
          inArray(schema.usuarios.rol, ['barbero', 'recepcion']),
          eq(schema.usuarios.activo, true)
        ),
        columns: {
          id: true,
          nombreCompleto: true,
          rol: true
        }
      });
    });

    return staffMembers;
  }

  async loginStaff(dto: LoginStaffDto) {
    const key = `${dto.slug}:${dto.userId}`;
    const record = this.failedAttempts.get(key);
    
    if (record && record.lockUntil > Date.now()) {
      const seconds = Math.ceil((record.lockUntil - Date.now()) / 1000);
      throw new ForbiddenException(`Demasiados intentos. Intenta de nuevo en ${seconds}s.`);
    }

    const result = await this.db.execute(sql`SELECT id, estado FROM auth_get_tenant_by_slug(${dto.slug})`);
    const barberia = result.rows[0] as any;

    if (!barberia) {
      throw new UnauthorizedException('Barbería no encontrada.');
    }

    if (barberia.estado !== 'activo') {
      throw new ForbiddenException('La suscripción de la barbería está inactiva.');
    }

    const matchedStaffArray = await runInTenantScope(this.db, barberia.id, async (tx) => {
      return await tx.query.usuarios.findMany({
        where: and(
          eq(schema.usuarios.tenantId, barberia.id),
          eq(schema.usuarios.id, dto.userId),
          inArray(schema.usuarios.rol, ['barbero', 'recepcion'])
        ),
      });
    });

    const matchedStaff = matchedStaffArray[0];

    if (!matchedStaff || !matchedStaff.pinAcceso) {
      throw new UnauthorizedException('Usuario o PIN inválido.');
    }

    const isMatch = await bcrypt.compare(dto.pin, matchedStaff.pinAcceso);
    if (!isMatch) {
      let count = (record?.count || 0) + 1;
      let lockUntil = 0;
      
      if (count >= 5) {
        if (count === 5) lockUntil = Date.now() + 30 * 1000; // 30s
        else if (count === 6) lockUntil = Date.now() + 2 * 60 * 1000; // 2m
        else lockUntil = Date.now() + 5 * 60 * 1000; // 5m
      }
      
      this.failedAttempts.set(key, { count, lockUntil });
      throw new UnauthorizedException('Usuario o PIN inválido.');
    }

    if (!matchedStaff.activo) {
      throw new ForbiddenException('Esta cuenta está suspendida. Contacta al administrador local.');
    }

    // Login exitoso, limpiamos los intentos
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
}
