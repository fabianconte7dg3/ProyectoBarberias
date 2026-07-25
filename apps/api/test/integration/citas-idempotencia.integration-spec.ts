import { ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/database/schema';
import { CitasService } from '../../src/citas/citas.service';
import { CreateCitaDto } from '../../src/citas/dto/create-cita.dto';
import { CreateCitasGrupalesDto } from '../../src/citas/dto/create-citas-grupales.dto';
import {
  appDb,
  closeTestDb,
  crearClienteFixture,
  crearEmpleadoFixture,
  crearServicioFixture,
  crearTenantFixture,
  runInTenantScope,
} from './setup/test-db';

/**
 * Idempotencia de citas.service.ts depende de comportamiento real de Postgres:
 * onConflictDoNothing(idempotency_key) en crearCita, y el código de error 23P01 del EXCLUDE
 * constraint no_solapamiento_empleado (choque de horario real, no una validación de app). No se
 * puede probar fielmente con un db mockeado — ver docs/02-arquitectura-y-db/Plan_Fase3_Suite_Tests.md.
 */
describe('Idempotencia de CitasService', () => {
  // Solo se testea crearCita/crearCitasGrupales: colaboradores (Queue, EventEmitter, CombosService)
  // son infraestructura no relevante para esto, se stubean.
  const queueStub = { add: jest.fn().mockResolvedValue(undefined) };
  const eventEmitterStub = { emit: jest.fn() };
  const combosServiceStub = { findOne: jest.fn() };
  const citasService = new CitasService(appDb as any, queueStub as any, combosServiceStub as any, eventEmitterStub as any);

  let tenant: typeof schema.barberias.$inferSelect;
  let empleado: typeof schema.usuarios.$inferSelect;
  let servicio: typeof schema.servicios.$inferSelect;
  let cliente: typeof schema.clientes.$inferSelect;

  beforeAll(async () => {
    tenant = await crearTenantFixture();
    empleado = await crearEmpleadoFixture(tenant.id);
    servicio = await crearServicioFixture(tenant.id, { duracionMinutos: 30 });
    cliente = await crearClienteFixture(tenant.id);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  function dtoBase(inicioEstimado: Date): CreateCitaDto {
    return {
      clienteId: cliente.id,
      empleadoId: empleado.id,
      servicioId: servicio.id,
      inicioEstimado: inicioEstimado.toISOString(),
      origen: 'manual_admin',
    };
  }

  it('la misma idempotencyKey dos veces devuelve la misma cita, sin duplicar la fila', async () => {
    const inicio = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const key = crypto.randomUUID();

    const r1 = await runInTenantScope(appDb, tenant.id, () =>
      citasService.crearCita(dtoBase(inicio), key, false),
    );
    expect(r1.isExisting).toBe(false);

    const r2 = await runInTenantScope(appDb, tenant.id, () =>
      citasService.crearCita(dtoBase(inicio), key, false),
    );
    expect(r2.isExisting).toBe(true);
    expect(r2.cita.id).toBe(r1.cita.id);

    const filas = await runInTenantScope(appDb, tenant.id, async (tx) =>
      tx.select().from(schema.citas).where(eq(schema.citas.idempotencyKey, key)),
    );
    expect(filas).toHaveLength(1);
  });

  it('un choque real de horario (mismo empleado, rango solapado) lanza ConflictException', async () => {
    const inicio = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    await runInTenantScope(appDb, tenant.id, () =>
      citasService.crearCita(dtoBase(inicio), crypto.randomUUID(), false),
    );

    // Empieza 15 min después, mismo empleado, servicio de 30 min -> se solapa (idempotencyKey
    // distinta a propósito: lo que debe rechazar esto es el EXCLUDE constraint, no la idempotencia).
    const inicioSolapado = new Date(inicio.getTime() + 15 * 60000);
    await expect(
      runInTenantScope(appDb, tenant.id, () =>
        citasService.crearCita(dtoBase(inicioSolapado), crypto.randomUUID(), false),
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('un horario distinto para el mismo empleado sí se crea sin problema (control negativo)', async () => {
    const inicio = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
    const resultado = await runInTenantScope(appDb, tenant.id, () =>
      citasService.crearCita(dtoBase(inicio), crypto.randomUUID(), false),
    );
    expect(resultado.isExisting).toBe(false);
    expect(resultado.cita.empleadoId).toBe(empleado.id);
  });

  it('crearCitasGrupales: reintentar con el mismo idempotencyKeyBase devuelve el mismo grupo', async () => {
    const inicio1 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const inicio2 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 60 * 60000); // +1h, sin solapar
    const dtoGrupal: CreateCitasGrupalesDto = {
      citas: [dtoBase(inicio1), dtoBase(inicio2)],
    };
    const keyBase = crypto.randomUUID();

    const r1 = await runInTenantScope(appDb, tenant.id, () =>
      citasService.crearCitasGrupales(dtoGrupal, keyBase, false),
    );
    expect(r1.isExisting).toBe(false);
    expect(r1.citas).toHaveLength(2);

    const r2 = await runInTenantScope(appDb, tenant.id, () =>
      citasService.crearCitasGrupales(dtoGrupal, keyBase, false),
    );
    expect(r2.isExisting).toBe(true);
    expect(r2.citas).toHaveLength(2);
    expect(r2.grupoReservaId).toBe(r1.grupoReservaId);

    const filas = await runInTenantScope(appDb, tenant.id, async (tx) =>
      tx.select().from(schema.citas).where(eq(schema.citas.grupoReservaId, r1.grupoReservaId as string)),
    );
    expect(filas).toHaveLength(2);
  });
});
