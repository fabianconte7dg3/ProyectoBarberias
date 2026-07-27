import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TransaccionesService } from './transacciones.service';
import { YappyService } from '../yappy/yappy.service';
import { DgiService } from '../dgi/dgi.service';
import { ProductosService } from '../productos/productos.service';
import { TenantContext } from '../database/tenant/tenant-context';
import { citas } from '../database/schema';

function makeInsertChain() {
  return jest.fn((vals: any) => {
    const p: any = Promise.resolve(undefined);
    p.returning = jest.fn().mockResolvedValue([{ id: 'tx-1', ...vals }]);
    return p;
  });
}

describe('TransaccionesService', () => {
  let service: TransaccionesService;
  let yappyService: { initiatePayment: jest.Mock };
  let dgiService: { emitirFacturaAsync: jest.Mock };
  let productosService: { descontarStockAtomico: jest.Mock };
  let db: any;

  const TENANT_ID = '11111111-1111-4111-8111-111111111111';
  const CITA_ID = 'cita-1';
  const EMPLEADO_ID = 'empleado-1';

  function baseCita(overrides: Partial<Record<string, any>> = {}) {
    return {
      id: CITA_ID,
      estado: 'en_curso',
      comboId: null,
      combo: null,
      empleadoId: EMPLEADO_ID,
      empleado: {
        id: EMPLEADO_ID,
        porcentajeComision: '10',
        nombreCompleto: 'Empleado QA',
      },
      servicio: { id: 'servicio-1', precioBase: '25.00' },
      ...overrides,
    };
  }

  beforeEach(async () => {
    yappyService = {
      initiatePayment: jest
        .fn()
        .mockResolvedValue({ modo: 'manual', orderId: 'yp-1' }),
    };
    dgiService = { emitirFacturaAsync: jest.fn().mockResolvedValue(undefined) };
    productosService = { descontarStockAtomico: jest.fn() };

    db = {
      query: {
        transacciones: { findFirst: jest.fn() },
        citas: { findFirst: jest.fn(), findMany: jest.fn() },
        usuarios: { findFirst: jest.fn() },
      },
      insert: jest.fn((table: any) => ({ values: makeInsertChain() })),
      update: jest.fn().mockReturnValue({
        set: jest
          .fn()
          .mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }),
      }),
    };

    jest.spyOn(TenantContext, 'getDb').mockReturnValue(db);
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue(TENANT_ID);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransaccionesService,
        { provide: YappyService, useValue: yappyService },
        { provide: DgiService, useValue: dgiService },
        { provide: ProductosService, useValue: productosService },
      ],
    }).compile();

    service = module.get<TransaccionesService>(TransaccionesService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('devuelve la transacción existente sin volver a cobrar cuando la idempotencyKey ya se procesó', async () => {
    db.query.transacciones.findFirst.mockResolvedValue({
      id: 'tx-vieja',
      detalles: [],
    });

    const result = await service.cobrarCita(CITA_ID, {
      idempotencyKey: 'key-1',
      metodoPago: 'efectivo',
    } as any);

    expect(result.idempotent).toBe(true);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('lanza NotFoundException si la cita no existe', async () => {
    db.query.transacciones.findFirst.mockResolvedValue(undefined);
    db.query.citas.findFirst.mockResolvedValue(undefined);

    await expect(
      service.cobrarCita(CITA_ID, { metodoPago: 'efectivo' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('lanza ForbiddenException si un empleado intenta cobrar una cita ajena', async () => {
    db.query.transacciones.findFirst.mockResolvedValue(undefined);
    db.query.citas.findFirst.mockResolvedValue(baseCita());

    await expect(
      service.cobrarCita(CITA_ID, { metodoPago: 'efectivo' } as any, {
        rol: 'empleado',
        userId: 'otro-empleado',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lanza ConflictException si la cita ya fue completada o cancelada', async () => {
    db.query.transacciones.findFirst.mockResolvedValue(undefined);
    db.query.citas.findFirst.mockResolvedValue(
      baseCita({ estado: 'completada' }),
    );

    await expect(
      service.cobrarCita(CITA_ID, { metodoPago: 'efectivo' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('lanza ConflictException si ya existe una transacción registrada para la cita', async () => {
    db.query.transacciones.findFirst
      .mockResolvedValueOnce(undefined) // idempotencyKey check
      .mockResolvedValueOnce({ id: 'tx-ya-existe' }); // txExistenteCita check
    db.query.citas.findFirst.mockResolvedValue(baseCita());

    await expect(
      service.cobrarCita(CITA_ID, { metodoPago: 'efectivo' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('cobra un servicio simple: calcula total y comisión, marca la cita completada y emite factura DGI', async () => {
    db.query.transacciones.findFirst.mockResolvedValue(undefined);
    db.query.citas.findFirst.mockResolvedValue(baseCita());

    const result = await service.cobrarCita(CITA_ID, {
      metodoPago: 'efectivo',
    } as any);

    expect(result.totalFacturado).toBe('25.00');
    expect(result.comisionEmpleado).toBe('2.50'); // 25 * 10%
    expect(db.update).toHaveBeenCalledWith(citas);
    expect(dgiService.emitirFacturaAsync).toHaveBeenCalledWith(
      TENANT_ID,
      'tx-1',
      '25.00',
      undefined,
      undefined,
    );
  });

  it('cobra un combo generando una línea de detalle por cada servicio del combo', async () => {
    db.query.transacciones.findFirst.mockResolvedValue(undefined);
    db.query.citas.findFirst.mockResolvedValue(
      baseCita({
        comboId: 'combo-1',
        combo: {
          servicios: [
            { servicioId: 'svc-a', precioAsignado: '10.00' },
            { servicioId: 'svc-b', precioAsignado: '15.00' },
          ],
        },
      }),
    );

    const result = await service.cobrarCita(CITA_ID, {
      metodoPago: 'efectivo',
    } as any);

    expect(result.totalFacturado).toBe('25.00');
    expect(result.detalles).toHaveLength(2);
  });

  it('con método de pago yappy no marca la cita como completada ni emite factura DGI todavía (espera webhook)', async () => {
    db.query.transacciones.findFirst.mockResolvedValue(undefined);
    db.query.citas.findFirst.mockResolvedValue(baseCita());

    await service.cobrarCita(CITA_ID, { metodoPago: 'yappy' } as any);

    expect(yappyService.initiatePayment).toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalledWith(citas);
    expect(dgiService.emitirFacturaAsync).not.toHaveBeenCalled();
  });

  it('rechaza una venta de mostrador sin cita y sin productos adicionales', async () => {
    db.query.transacciones.findFirst.mockResolvedValue(undefined);

    await expect(
      service.cobrarCita(null, { metodoPago: 'efectivo' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('getHistorialTransacciones consulta scopeado al tenant actual', async () => {
    db.query.transacciones.findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'tx-1' }]);
    const result = await service.getHistorialTransacciones(5);
    expect(result).toEqual([{ id: 'tx-1' }]);
    expect(db.query.transacciones.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 }),
    );
  });
});
