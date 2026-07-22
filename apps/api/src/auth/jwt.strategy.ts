import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { runInTenantScope } from '../database/tenant/tenant.utils';

import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          if (req && req.cookies) {
            return req.cookies['jwt'];
          }
          return null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'super_secret_dev_key_change_in_prod'),
    });
  }

  async validate(payload: any) {
    if (payload.rol === 'superadmin') {
      const [superAdmin] = await this.db
        .select({ id: schema.plataformaAdmins.id, activo: schema.plataformaAdmins.activo })
        .from(schema.plataformaAdmins)
        .where(eq(schema.plataformaAdmins.id, payload.sub))
        .limit(1);

      if (!superAdmin || !superAdmin.activo) {
        throw new UnauthorizedException('SuperAdmin inactivo o no encontrado.');
      }

      return {
        userId: payload.sub,
        rol: 'superadmin',
      };
    }

    if (!payload.tenantId) {
      return {
        userId: payload.sub,
        type: payload.type,
      };
    }

    // Validar en BD que el usuario siga activo (Kill Switch y revocaciones)
    const user = await runInTenantScope(this.db, payload.tenantId, async (tx) => {
      const [u] = await tx
        .select({ id: schema.usuarios.id, activo: schema.usuarios.activo })
        .from(schema.usuarios)
        .where(eq(schema.usuarios.id, payload.sub))
        .limit(1);
      return u;
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario inactivo o no encontrado.');
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      rol: payload.rol,
    };
  }
}
