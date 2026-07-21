import { CanActivate, ExecutionContext, Injectable, Inject, ServiceUnavailableException } from '@nestjs/common';
import { DRIZZLE_POOL_DB } from '../../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { eq, sql } from 'drizzle-orm';
import { runInTenantScope } from '../../database/tenant/tenant.utils';
import { TenantContext } from '../../database/tenant/tenant-context';

@Injectable()
export class KillSwitchGuard implements CanActivate {
  constructor(@Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Solo bloqueamos métodos de mutación
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }

    // Excluir el endpoint que desactiva el kill switch!
    const route = request.route?.path;
    if (route && route.includes('/configuracion/kill-switch')) {
      return true;
    }

    const tenantId = request.user?.tenantId || request.params?.tenantId;
    console.log(`[KillSwitchGuard] Method: ${method}, tenantId: ${tenantId}`);

    if (!tenantId) {
      console.log(`[KillSwitchGuard] No tenantId, passing`);
      return true; // No podemos verificar kill switch si no hay tenant identificado (esto lo manejan otros guards)
    }

    const [barberia] = await runInTenantScope(this.db, tenantId, async () => {
      const txDb = TenantContext.getDb();
      const currentTenantRes = await txDb.execute(sql`SELECT current_setting('app.current_tenant_id', true) as ct`);
      console.log(`[KillSwitchGuard] Inside runInTenantScope, app.current_tenant_id = ${currentTenantRes.rows[0].ct}`);
      return await txDb.select({ killSwitchActivo: schema.barberias.killSwitchActivo })
        .from(schema.barberias)
        .where(eq(schema.barberias.id, tenantId))
        .limit(1);
    });

    console.log(`[KillSwitchGuard] barberia killSwitchActivo: ${barberia?.killSwitchActivo}`);

    if (barberia?.killSwitchActivo) {
      console.log(`[KillSwitchGuard] Bloqueando request`);
      throw new ServiceUnavailableException('Las operaciones para esta sucursal se encuentran temporalmente suspendidas por emergencia o falta de pago.');
    }

    return true;
  }
}
