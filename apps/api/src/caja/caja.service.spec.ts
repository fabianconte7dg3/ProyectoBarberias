import { Test, TestingModule } from '@nestjs/testing';
import { CajaService } from './caja.service';
import { AuditService } from '../audit/audit.service';
import { TenantContext } from '../database/tenant/tenant-context';

describe('CajaService', () => {
  let service: CajaService;
  let auditService: { logAction: jest.Mock };
  let db: {
    query: { transacciones: { findMany: jest.Mock } };
    insert: jest.Mock;
  };

  const TENANT_ID = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    auditService = { logAction: jest.fn().mockResolvedValue(undefined) };
    db = {
      query: { transacciones: { findMany: jest.fn() } },
      insert: jest.fn(),
    };

    jest.spyOn(TenantContext, 'getDb').mockReturnValue(db as any);
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue(TENANT_ID);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CajaService,
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<CajaService>(CajaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBalanceDelDia', () => {
    it('suma el total de las transacciones en efectivo y solo la parte en efectivo de las mixtas', async () => {
      db.query.transacciones.findMany.mockResolvedValue([
        {
          metodoPago: 'efectivo',
          totalFacturado: '20.00',
          montoEfectivoIngresado: null,
        },
        {
          metodoPago: 'mixto',
          totalFacturado: '50.00',
          montoEfectivoIngresado: '15.00',
        },
        {
          metodoPago: 'mixto',
          totalFacturado: '30.00',
          montoEfectivoIngresado: null,
        },
      ]);

      const result = await service.getBalanceDelDia();

      expect(result.efectivoEsperado).toBe(35); // 20 + 15 + 0
      expect(result.cantidadTransaccionesEfectivo).toBe(3);
    });

    it('devuelve 0 cuando no hay transacciones del día', async () => {
      db.query.transacciones.findMany.mockResolvedValue([]);
      const result = await service.getBalanceDelDia();
      expect(result.efectivoEsperado).toBe(0);
    });
  });

  describe('cerrarCaja', () => {
    beforeEach(() => {
      db.query.transacciones.findMany.mockResolvedValue([
        {
          metodoPago: 'efectivo',
          totalFacturado: '100.00',
          montoEfectivoIngresado: null,
        },
      ]);
      db.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest
            .fn()
            .mockResolvedValue([{ id: 'cierre-1', estado: 'cuadrado' }]),
        }),
      });
    });

    it('marca estado sobrante cuando lo declarado es mayor al esperado', async () => {
      await service.cerrarCaja(
        'user-1',
        { efectivoDeclarado: 110, notasAdmin: '' },
        '127.0.0.1',
        'jest',
      );

      const valuesCall = (db.insert.mock.results[0].value.values as jest.Mock)
        .mock.calls[0][0];
      expect(valuesCall.estado).toBe('sobrante');
    });

    it('marca estado faltante cuando lo declarado es menor al esperado', async () => {
      await service.cerrarCaja(
        'user-1',
        { efectivoDeclarado: 90, notasAdmin: '' },
        '127.0.0.1',
        'jest',
      );

      const valuesCall = (db.insert.mock.results[0].value.values as jest.Mock)
        .mock.calls[0][0];
      expect(valuesCall.estado).toBe('faltante');
    });

    it('marca estado cuadrado y registra auditoría cuando coincide exacto', async () => {
      await service.cerrarCaja(
        'user-1',
        { efectivoDeclarado: 100, notasAdmin: '' },
        '127.0.0.1',
        'jest',
      );

      const valuesCall = (db.insert.mock.results[0].value.values as jest.Mock)
        .mock.calls[0][0];
      expect(valuesCall.estado).toBe('cuadrado');
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          usuarioId: 'user-1',
          tablaAfectada: 'cierres_de_caja',
          accion: 'cierre_emergencia',
        }),
      );
    });
  });
});
