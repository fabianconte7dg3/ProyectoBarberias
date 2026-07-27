import { Test, TestingModule } from '@nestjs/testing';
import { DgiService } from './dgi.service';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';

describe('DgiService', () => {
  let service: DgiService;
  let db: { transaction: jest.Mock };
  let tx: { execute: jest.Mock; update: jest.Mock };

  const TENANT_ID = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    jest.useFakeTimers();

    tx = {
      execute: jest.fn().mockResolvedValue({ rows: [] }),
      update: jest.fn().mockReturnValue({
        set: jest
          .fn()
          .mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }),
      }),
    };
    db = { transaction: jest.fn().mockImplementation((cb) => cb(tx)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DgiService, { provide: DRIZZLE_POOL_DB, useValue: db }],
    }).compile();

    service = module.get<DgiService>(DgiService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('no toca la base de datos de forma síncrona (simula latencia de red asíncrona)', async () => {
    await service.emitirFacturaAsync(TENANT_ID, 'tx-1', '25.00');
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('marca la transacción como emitida con un número de factura DGI tras el retardo simulado', async () => {
    await service.emitirFacturaAsync(TENANT_ID, 'tx-1', '25.00');

    await jest.advanceTimersByTimeAsync(2000);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    const setCall = (tx.update.mock.results[0].value.set as jest.Mock).mock
      .calls[0][0];
    expect(setCall.estadoDgi).toBe('emitida');
    expect(setCall.numeroFacturaDgi).toMatch(/^DGI-/);
  });

  it('no propaga el error si la transacción de DB falla (no debe tumbar el flujo de cobro)', async () => {
    tx.update.mockImplementation(() => {
      throw new Error('DB caída');
    });

    await service.emitirFacturaAsync(TENANT_ID, 'tx-1', '25.00');
    await expect(jest.advanceTimersByTimeAsync(2000)).resolves.toBeUndefined();
  });
});
