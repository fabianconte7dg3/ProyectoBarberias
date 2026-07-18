import { Inject, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
  ) {}

  async registerBarberia(dto: RegisterBarberiaDto) {
    const existingBarberia = await this.db.query.barberias.findFirst({
      where: eq(schema.barberias.slug, dto.slug),
    });

    if (existingBarberia) {
      throw new BadRequestException('El slug ya está en uso.');
    }

    const existingAdmin = await this.db.query.usuarios.findFirst({
      where: eq(schema.usuarios.email, dto.adminEmail),
    });

    if (existingAdmin) {
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
    const admin = await this.db.query.usuarios.findFirst({
      where: and(eq(schema.usuarios.email, dto.email), eq(schema.usuarios.rol, 'admin')),
    });

    if (!admin || !admin.activo || !admin.password) {
      throw new UnauthorizedException('Credenciales inválidas o usuario inactivo.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, admin.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const payload = { sub: admin.id, tenantId: admin.tenantId, rol: admin.rol };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async loginStaff(dto: LoginStaffDto) {
    const barberia = await this.db.query.barberias.findFirst({
      where: eq(schema.barberias.slug, dto.slug),
    });

    if (!barberia || barberia.estado !== 'activo') {
      throw new UnauthorizedException('Barbería no encontrada o inactiva.');
    }

    const staffMembers = await this.db.query.usuarios.findMany({
      where: and(
        eq(schema.usuarios.tenantId, barberia.id),
        eq(schema.usuarios.activo, true),
        inArray(schema.usuarios.rol, ['barbero', 'recepcion']),
      ),
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

    const payload = { sub: matchedStaff.id, tenantId: matchedStaff.tenantId, rol: matchedStaff.rol };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
