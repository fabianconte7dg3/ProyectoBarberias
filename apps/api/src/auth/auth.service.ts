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
      await tx.execute(sql.raw(`SET LOCAL app.current_tenant_id = '${tenantId}'`));

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

    const passwordMatches = await bcrypt.compare(dto.password, admin.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!admin.activo) {
      throw new ForbiddenException('Esta cuenta está suspendida. Contacta a soporte para reactivarla.');
    }

    const payload = { sub: admin.id, tenantId: admin.tenantId, rol: admin.rol };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async loginStaff(dto: LoginStaffDto) {
    const result = await this.db.execute(sql`SELECT id, estado FROM auth_get_tenant_by_slug(${dto.slug})`);
    const barberia = result.rows[0] as any;

    if (!barberia) {
      throw new UnauthorizedException('Barbería no encontrada.');
    }

    const staffMembers = await runInTenantScope(this.db, barberia.id, async (tx) => {
      return await tx.query.usuarios.findMany({
        where: and(
          eq(schema.usuarios.tenantId, barberia.id),
          eq(schema.usuarios.activo, true),
          inArray(schema.usuarios.rol, ['barbero', 'recepcion']),
        ),
      });
    });

    let matchedStaff = null;

    // Buscar qué staff tiene el PIN correspondiente
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
      throw new UnauthorizedException('PIN inválido.');
    }

    // Validamos el estado de la barbería solo después de que el PIN probó ser correcto
    if (barberia.estado !== 'activo') {
      throw new ForbiddenException('Esta cuenta está suspendida. Contacta a soporte para reactivarla.');
    }

    const payload = { sub: matchedStaff.id, tenantId: matchedStaff.tenantId, rol: matchedStaff.rol };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
