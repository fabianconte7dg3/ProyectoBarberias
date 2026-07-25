import { eq } from 'drizzle-orm';
import * as schema from '../../src/database/schema';
import {
  appDb,
  closeTestDb,
  crearClienteFixture,
  crearTenantFixture,
  runInTenantScope,
} from './setup/test-db';

/**
 * RLS es una garantía de Postgres, no de la app (ver CLAUDE.md). Estos tests corren contra
 * volumetrix_test real, conectados como app_user (el mismo rol que usa producción, NOBYPASSRLS),
 * usando runInTenantScope — la misma función que usa el código real para webhooks/jobs — en vez
 * de reimplementar el "SET LOCAL app.current_tenant_id" a mano.
 */
describe('Aislamiento RLS multi-tenant', () => {
  let tenantA: typeof schema.barberias.$inferSelect;
  let tenantB: typeof schema.barberias.$inferSelect;
  let clienteDeA: typeof schema.clientes.$inferSelect;

  beforeAll(async () => {
    tenantA = await crearTenantFixture({ nombreComercial: 'Tenant A' });
    tenantB = await crearTenantFixture({ nombreComercial: 'Tenant B' });
    clienteDeA = await crearClienteFixture(tenantA.id, { nombreCompleto: 'Cliente de A' });
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it('un tenant no ve las filas de otro tenant en un SELECT normal', async () => {
    const clientesVistosPorB = await runInTenantScope(appDb, tenantB.id, async (tx) =>
      tx.select().from(schema.clientes).where(eq(schema.clientes.tenantId, tenantA.id)),
    );
    expect(clientesVistosPorB).toHaveLength(0);

    const clientesVistosPorA = await runInTenantScope(appDb, tenantA.id, async (tx) =>
      tx.select().from(schema.clientes).where(eq(schema.clientes.tenantId, tenantA.id)),
    );
    expect(clientesVistosPorA).toHaveLength(1);
  });

  it('un tenant no puede leer una fila ajena aunque tenga su ID exacto', async () => {
    const resultado = await runInTenantScope(appDb, tenantB.id, async (tx) =>
      tx.select().from(schema.clientes).where(eq(schema.clientes.id, clienteDeA.id)),
    );
    expect(resultado).toHaveLength(0);
  });

  it('rechaza un INSERT cuyo tenant_id no coincide con el tenant activo (WITH CHECK)', async () => {
    // drizzle envuelve el error real de Postgres en `.cause` (el `.message` de nivel superior es
    // solo "Failed query: ..."), así que se inspecciona la causa, no el mensaje envolvente.
    let errorCapturado: any;
    try {
      await runInTenantScope(appDb, tenantA.id, async (tx) =>
        tx.insert(schema.clientes).values({
          tenantId: tenantB.id,
          telefonoWhatsapp: '+50760000000',
        }),
      );
    } catch (err) {
      errorCapturado = err;
    }
    expect(errorCapturado).toBeDefined();
    expect(errorCapturado.cause?.message ?? errorCapturado.message).toMatch(/row-level security/i);

    const clientesDeB = await runInTenantScope(appDb, tenantB.id, async (tx) =>
      tx.select().from(schema.clientes).where(eq(schema.clientes.tenantId, tenantB.id)),
    );
    expect(clientesDeB).toHaveLength(0);
  });

  it('barberias: cada tenant solo ve su propia fila (policy id = current_tenant_id())', async () => {
    const vistoDesdeA = await runInTenantScope(appDb, tenantA.id, async (tx) =>
      tx.select().from(schema.barberias),
    );
    expect(vistoDesdeA.map((b: typeof schema.barberias.$inferSelect) => b.id)).toEqual([tenantA.id]);

    const vistoDesdeB = await runInTenantScope(appDb, tenantB.id, async (tx) =>
      tx.select().from(schema.barberias),
    );
    expect(vistoDesdeB.map((b: typeof schema.barberias.$inferSelect) => b.id)).toEqual([tenantB.id]);
  });

  it('sin tenant activo (current_tenant_id nulo) no se ve ninguna fila', async () => {
    // Simula una query que se ejecutara fuera de runInTenantScope/TenantInterceptor por error —
    // exactamente el escenario que current_tenant_id() -> NULL esta diseñado para bloquear.
    const resultado = await appDb.select().from(schema.clientes);
    expect(resultado).toHaveLength(0);
  });
});
