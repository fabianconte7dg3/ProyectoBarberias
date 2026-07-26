import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../../src/database/schema';

const DB_NAME = 'volumetrix_test';

// Por defecto apunta directo a Postgres (5432). Para la verificación empírica
// de compatibilidad con PgBouncer en pool_mode=transaction (Fase 4 —
// docs/02-arquitectura-y-db/Plan_Fase4_Infraestructura.md), correr con
// `TEST_DB_PORT=6432` apuntando al servicio `pgbouncer` del profile
// `pgbouncer-test` de infrastructure/docker-compose.yml.
const DB_PORT = process.env.TEST_DB_PORT ?? '5432';

/**
 * Superusuario (BYPASSRLS implícito) — solo para armar fixtures (tenant, empleado, servicio,
 * cliente) sin pelear con RLS. Nunca se usa para ejecutar el código bajo prueba: eso corre
 * siempre por appDb, igual que en producción. Ver docs/02-arquitectura-y-db/Plan_Fase3_Suite_Tests.md.
 */
export const superPool = new Pool({
  connectionString: `postgresql://postgres:password@localhost:${DB_PORT}/${DB_NAME}`,
});
export const superDb = drizzle(superPool, { schema });

/** Idéntico al DATABASE_URL real de apps/api/.env, apuntando a volumetrix_test. RLS aplica completo. */
export const appPool = new Pool({
  connectionString: `postgresql://app_user:app_password@localhost:${DB_PORT}/${DB_NAME}`,
});
export const appDb = drizzle(appPool, { schema });

export async function closeTestDb() {
  await appPool.end();
  await superPool.end();
}

export async function crearTenantFixture(overrides: Partial<typeof schema.barberias.$inferInsert> = {}) {
  const [tenant] = await superDb
    .insert(schema.barberias)
    .values({
      nombreComercial: 'Tenant de Test',
      slug: `test-${crypto.randomUUID()}`,
      ...overrides,
    })
    .returning();
  return tenant;
}

export async function crearEmpleadoFixture(
  tenantId: string,
  overrides: Partial<typeof schema.usuarios.$inferInsert> = {},
) {
  const [empleado] = await superDb
    .insert(schema.usuarios)
    .values({
      tenantId,
      nombreCompleto: 'Empleado de Test',
      rol: 'empleado',
      porcentajeComision: '50',
      activo: true,
      ...overrides,
    })
    .returning();
  return empleado;
}

export async function crearServicioFixture(
  tenantId: string,
  overrides: Partial<typeof schema.servicios.$inferInsert> = {},
) {
  const [servicio] = await superDb
    .insert(schema.servicios)
    .values({
      tenantId,
      nombre: 'Servicio de Test',
      duracionMinutos: 30,
      precioBase: '20.00',
      ...overrides,
    })
    .returning();
  return servicio;
}

export async function crearClienteFixture(
  tenantId: string,
  overrides: Partial<typeof schema.clientes.$inferInsert> = {},
) {
  const [cliente] = await superDb
    .insert(schema.clientes)
    .values({
      tenantId,
      telefonoWhatsapp: `+507${Math.floor(Math.random() * 100000000)}`,
      nombreCompleto: 'Cliente de Test',
      ...overrides,
    })
    .returning();
  return cliente;
}

export async function crearCitaFixture(
  tenantId: string,
  empleadoId: string,
  overrides: Partial<typeof schema.citas.$inferInsert> = {},
) {
  // Horario por defecto aleatorio (no "new Date()" fijo): 2 fixtures del mismo empleado sin
  // inicioEstimado explícito no deben chocar contra no_solapamiento_empleado (EXCLUDE constraint)
  // solo por haber corrido en el mismo milisegundo de test.
  const inicioPorDefecto = new Date(Date.now() + (1 + Math.floor(Math.random() * 3650)) * 24 * 60 * 60 * 1000);
  const finPorDefecto = new Date(inicioPorDefecto.getTime() + 30 * 60000);

  const [cita] = await superDb
    .insert(schema.citas)
    .values({
      tenantId,
      empleadoId,
      inicioEstimado: inicioPorDefecto,
      finEstimado: finPorDefecto,
      origen: 'manual_admin',
      idempotencyKey: `fixture-${crypto.randomUUID()}`,
      estado: 'programada',
      ...overrides,
    })
    .returning();
  return cita;
}

export { runInTenantScope } from '../../../src/database/tenant/tenant.utils';
