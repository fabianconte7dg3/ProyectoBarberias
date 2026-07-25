import { eq } from 'drizzle-orm';
import * as schema from '../../src/database/schema';
import { TransaccionesService } from '../../src/transacciones/transacciones.service';
import { CobrarCitaDto } from '../../src/transacciones/dto/cobrar-cita.dto';
import {
  appDb,
  closeTestDb,
  crearCitaFixture,
  crearClienteFixture,
  crearEmpleadoFixture,
  crearServicioFixture,
  crearTenantFixture,
  runInTenantScope,
  superDb,
} from './setup/test-db';

/**
 * comisionAplicada se calcula y se persiste dentro de la misma transacción SQL que crea la
 * transacción/detalles (dinero real). Se prueba contra Postgres real por la misma razón que RLS
 * e idempotencia: es el camino que de verdad corre en producción, no una reimplementación paralela
 * del cálculo. Ver docs/02-arquitectura-y-db/Plan_Fase3_Suite_Tests.md.
 */
describe('Cálculo de comisiones en TransaccionesService', () => {
  // Yappy/DGI/Productos son integraciones externas, no lo que se prueba acá — se stubean.
  const yappyStub = { initiatePayment: jest.fn() };
  const dgiStub = { emitirFacturaAsync: jest.fn().mockResolvedValue(undefined) };
  const productosStub = { descontarStockAtomico: jest.fn() };
  const transaccionesService = new TransaccionesService(yappyStub as any, dgiStub as any, productosStub as any);

  let tenant: typeof schema.barberias.$inferSelect;
  let empleado: typeof schema.usuarios.$inferSelect; // 50% de comisión
  let servicio: typeof schema.servicios.$inferSelect; // $20.00
  let cliente: typeof schema.clientes.$inferSelect;

  beforeAll(async () => {
    tenant = await crearTenantFixture();
    empleado = await crearEmpleadoFixture(tenant.id, { porcentajeComision: '50' });
    servicio = await crearServicioFixture(tenant.id, { precioBase: '20.00' });
    cliente = await crearClienteFixture(tenant.id);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it('servicio simple: comisión = precioBase * porcentajeComision / 100', async () => {
    const cita = await crearCitaFixture(tenant.id, empleado.id, { servicioId: servicio.id, clienteId: cliente.id });
    const dto: CobrarCitaDto = { metodoPago: 'efectivo' };

    const resultado = await runInTenantScope(appDb, tenant.id, () => transaccionesService.cobrarCita(cita.id, dto));

    expect(resultado.totalFacturado).toBe('20.00');
    expect(resultado.comisionEmpleado).toBe('10.00');
  });

  it('combo: una línea de comisión por cada servicio interno, usando precioAsignado (no precioBase)', async () => {
    const servicioCorte = await crearServicioFixture(tenant.id, { nombre: 'Corte', precioBase: '999.00' });
    const servicioBarba = await crearServicioFixture(tenant.id, { nombre: 'Barba', precioBase: '999.00' });

    const [combo] = await superDb
      .insert(schema.combos)
      .values({ tenantId: tenant.id, nombre: 'Combo Corte+Barba', precioTotal: '25.00' })
      .returning();
    await superDb.insert(schema.comboServicios).values([
      { tenantId: tenant.id, comboId: combo.id, servicioId: servicioCorte.id, orden: 0, precioAsignado: '15.00' },
      { tenantId: tenant.id, comboId: combo.id, servicioId: servicioBarba.id, orden: 1, precioAsignado: '10.00' },
    ]);

    const cita = await crearCitaFixture(tenant.id, empleado.id, { comboId: combo.id, clienteId: cliente.id });
    const dto: CobrarCitaDto = { metodoPago: 'efectivo' };

    const resultado = await runInTenantScope(appDb, tenant.id, () => transaccionesService.cobrarCita(cita.id, dto));

    // precioAsignado (15 + 10), NO precioBase (999 cada uno) -> confirma que combo ignora precioBase.
    expect(resultado.totalFacturado).toBe('25.00');
    // (15*0.5) + (10*0.5) = 7.50 + 5.00
    expect(resultado.comisionEmpleado).toBe('12.50');

    const detalles = await runInTenantScope(appDb, tenant.id, async (tx) =>
      tx.select().from(schema.detallesTransaccion).where(eq(schema.detallesTransaccion.transaccionId, resultado.id)),
    );
    expect(detalles).toHaveLength(2);
  });

  it('cobro grupal multi-empleado: cada línea atribuye comisión al empleado real de esa cita', async () => {
    const empleado2 = await crearEmpleadoFixture(tenant.id, { nombreCompleto: 'Empleado 2', porcentajeComision: '30' });
    const servicioB = await crearServicioFixture(tenant.id, { nombre: 'Servicio B', precioBase: '10.00' });
    const grupoReservaId = crypto.randomUUID();

    const citaA = await crearCitaFixture(tenant.id, empleado.id, {
      servicioId: servicio.id,
      clienteId: cliente.id,
      grupoReservaId,
    });
    const citaB = await crearCitaFixture(tenant.id, empleado2.id, {
      servicioId: servicioB.id,
      clienteId: cliente.id,
      grupoReservaId,
    });

    const dto: CobrarCitaDto = { metodoPago: 'efectivo' };
    const resultado = await runInTenantScope(appDb, tenant.id, () =>
      transaccionesService.cobrarGrupo(grupoReservaId, dto),
    );

    expect(resultado.totalFacturado).toBe('30.00'); // 20 + 10
    // empleado: 20*0.5=10.00, empleado2: 10*0.3=3.00 -> 13.00 total
    expect(resultado.comisionEmpleado).toBe('13.00');

    const detalles = await runInTenantScope(appDb, tenant.id, async (tx) =>
      tx.select().from(schema.detallesTransaccion).where(eq(schema.detallesTransaccion.transaccionId, resultado.id)),
    );
    const lineaA = detalles.find((d: typeof schema.detallesTransaccion.$inferSelect) => d.citaId === citaA.id);
    const lineaB = detalles.find((d: typeof schema.detallesTransaccion.$inferSelect) => d.citaId === citaB.id);
    expect(lineaA?.empleadoId).toBe(empleado.id);
    expect(lineaA?.comisionAplicada).toBe('10.00');
    expect(lineaB?.empleadoId).toBe(empleado2.id);
    expect(lineaB?.comisionAplicada).toBe('3.00');
  });

  it('idempotencyKey repetido no duplica la transacción ni recalcula comisión', async () => {
    const cita = await crearCitaFixture(tenant.id, empleado.id, { servicioId: servicio.id, clienteId: cliente.id });
    const key = crypto.randomUUID();
    const dto: CobrarCitaDto = { metodoPago: 'efectivo', idempotencyKey: key };

    const r1 = await runInTenantScope(appDb, tenant.id, () => transaccionesService.cobrarCita(cita.id, dto));
    const r2 = await runInTenantScope(appDb, tenant.id, () => transaccionesService.cobrarCita(cita.id, dto));

    expect((r2 as any).idempotent).toBe(true);
    expect(r2.id).toBe(r1.id);

    const filas = await runInTenantScope(appDb, tenant.id, async (tx) =>
      tx.select().from(schema.transacciones).where(eq(schema.transacciones.idempotencyKey, key)),
    );
    expect(filas).toHaveLength(1);
  });
});
