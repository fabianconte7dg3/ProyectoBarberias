import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { TenantContext } from './tenant-context';
import * as schema from '../schema';

/**
 * Ejecuta una función (callback) dentro de una transacción Drizzle con RLS forzado,
 * aislando el acceso al tenantId especificado, simulando lo que hace el TenantInterceptor
 * para requests HTTP. Ideal para Webhooks asíncronos o Workers.
 */
export async function runInTenantScope<T>(
  db: NodePgDatabase<typeof schema>,
  tenantId: string,
  callback: (tx: any) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL ROLE app_user`));
    await tx.execute(sql.raw(`SET LOCAL app.current_tenant_id = '${tenantId}'`));

    return TenantContext.run({ tenantId, db: tx }, () => callback(tx));
  });
}
