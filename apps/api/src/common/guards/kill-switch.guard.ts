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

    let tenantId = request.user?.tenantId || request.params?.tenantId;

    // Endpoints públicos (@Public(), ej. /citas/publica, /clientes/publico) no traen
    // request.user ni un :tenantId de ruta — resuelven el tenant por slug en el header
    // x-tenant-slug, el mismo mecanismo que usan sus propios controllers. Sin esto, la
    // Pausa de Auto-Servicio (killSwitchActivo) no bloqueaba nada en la Reserva Pública
    // Web pese a estar documentado en matriz-permisos-y-bloqueos.md §2 — gap real
    // encontrado y corregido en la Fase 2.4.
    if (!tenantId) {
      const tenantSlug = request.headers?.['x-tenant-slug'];
      if (tenantSlug) {
        const slugResult = await this.db.execute(sql`SELECT id FROM auth_get_tenant_by_slug(${tenantSlug})`);
        tenantId = slugResult.rows[0]?.id as string | undefined;
      }
    }

    console.log(`[KillSwitchGuard] Method: ${method}, tenantId: ${tenantId}`);

    if (!tenantId) {
      console.log(`[KillSwitchGuard] No tenantId, passing`);
      return true; // No podemos verificar kill switch si no hay tenant identificado (esto lo manejan otros guards)
    }

    const [barberia] = await runInTenantScope(this.db, tenantId, async () => {
      const txDb = TenantContext.getDb();
      const currentTenantRes = await txDb.execute(sql`SELECT current_setting('app.current_tenant_id', true) as ct`);
      console.log(`[KillSwitchGuard] Inside runInTenantScope, app.current_tenant_id = ${currentTenantRes.rows[0].ct}`);
      return await txDb.select({
        killSwitchActivo: schema.barberias.killSwitchActivo,
        bloqueadoPorPlataforma: schema.barberias.bloqueadoPorPlataforma,
      })
        .from(schema.barberias)
        .where(eq(schema.barberias.id, tenantId))
        .limit(1);
    });

    console.log(`[KillSwitchGuard] barberia killSwitchActivo: ${barberia?.killSwitchActivo}, bloqueadoPorPlataforma: ${barberia?.bloqueadoPorPlataforma}`);

    // Bloqueo por Plataforma (SuperAdmin SaaS) — nivel de severidad mayor que la pausa
    // del dueño, sin excepción para admin (ver matriz-permisos-y-bloqueos.md §2). Se
    // chequea primero: si el tenant está bloqueado por la plataforma, ni el propio
    // admin puede seguir mutando datos aunque siga con una sesión JWT válida de antes
    // del bloqueo (auth.service.ts ya lo corta en el login, esto lo corta por request).
    if (barberia?.bloqueadoPorPlataforma) {
      console.log(`[KillSwitchGuard] Bloqueando request por bloqueo de plataforma`);
      throw new ServiceUnavailableException('Este negocio no está disponible en este momento.');
    }

    // Los administradores NUNCA quedan bloqueados por su propia Pausa de Auto-Servicio
    // (necesitan poder seguir operando y desactivarla).
    if (request.user?.rol === 'admin') {
      return true;
    }

    if (barberia?.killSwitchActivo) {
      console.log(`[KillSwitchGuard] Bloqueando request`);
      throw new ServiceUnavailableException('Las operaciones para esta sucursal se encuentran temporalmente suspendidas por emergencia o falta de pago.');
    }

    return true;
  }
}
