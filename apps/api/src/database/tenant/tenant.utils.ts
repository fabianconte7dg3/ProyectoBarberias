import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { TenantContext } from './tenant-context';
import * as schema from '../schema';

/**
 * Ejecuta una función (callback) dentro de una transacción Drizzle con RLS forzado,
 * aislando el acceso al tenantId especificado, simulando lo que hace el TenantInterceptor
 * para requests HTTP. Ideal para Webhooks asíncronos o Workers.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function runInTenantScope<T>(
  db: NodePgDatabase<typeof schema>,
  tenantId: string,
  callback: (tx: any) => Promise<T>,
): Promise<T> {
  if (!tenantId || !UUID_REGEX.test(tenantId)) {
    throw new Error('UUID de tenant inválido para RLS.');
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE app_user`);
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

    return TenantContext.run({ tenantId, db: tx }, () => callback(tx));
  });
}
