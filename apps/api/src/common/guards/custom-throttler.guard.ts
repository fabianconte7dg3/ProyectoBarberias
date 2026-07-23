import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { DRIZZLE_POOL_DB } from '../../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  @Inject(DRIZZLE_POOL_DB) private readonly db!: NodePgDatabase<typeof schema>;

  protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
    const req = context.switchToHttp().getRequest();
    const url = req.url || '';
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    if (url.includes('/super-admin')) {
      try {
        await this.db.insert(schema.alertasSeguridad).values({
          tipo: 'rate_limit_superadmin',
          nivel: 'warning',
          mensaje: `Límite de tasa excedido en Consola SuperAdmin (${url}) desde IP: ${ip}`,
          metadatos: { url, ip, timestamp: new Date().toISOString() },
        });
      } catch (err) {
        console.error('Error guardando alerta de rate limit:', err);
      }
    }

    throw new ThrottlerException('Demasiadas peticiones. Por favor, intenta más tarde.');
  }
}
