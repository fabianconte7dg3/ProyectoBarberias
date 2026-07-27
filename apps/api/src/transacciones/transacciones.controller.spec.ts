import { Test, TestingModule } from '@nestjs/testing';
import { TransaccionesController } from './transacciones.controller';
import { TransaccionesService } from './transacciones.service';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';

describe('TransaccionesController', () => {
  let controller: TransaccionesController;
  let transaccionesService: {
    cobrarCita: jest.Mock;
    cobrarGrupo: jest.Mock;
    getHistorialTransacciones: jest.Mock;
  };

  beforeEach(async () => {
    transaccionesService = {
      cobrarCita: jest.fn(),
      cobrarGrupo: jest.fn(),
      getHistorialTransacciones: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransaccionesController],
      providers: [
        { provide: TransaccionesService, useValue: transaccionesService },
        { provide: DRIZZLE_POOL_DB, useValue: {} },
      ],
    }).compile();

    controller = module.get<TransaccionesController>(TransaccionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('cobrarCita responde 200 (no 201) cuando el cobro ya era idempotente', async () => {
    transaccionesService.cobrarCita.mockResolvedValue({
      idempotent: true,
      id: 'tx-1',
    });
    const res = { status: jest.fn() } as any;
    const req = { user: { userId: 'u1' } } as any;

    const result = await controller.cobrarCita(req, 'cita-1', {} as any, res);

    expect(transaccionesService.cobrarCita).toHaveBeenCalledWith(
      'cita-1',
      {},
      req.user,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(result).toEqual({ idempotent: true, id: 'tx-1' });
  });

  it('ventaMostrador cobra sin citaId (venta directa)', async () => {
    transaccionesService.cobrarCita.mockResolvedValue({
      idempotent: false,
      id: 'tx-2',
    });
    const res = { status: jest.fn() } as any;
    const req = { user: { userId: 'u1' } } as any;

    await controller.ventaMostrador(req, {} as any, res);

    expect(transaccionesService.cobrarCita).toHaveBeenCalledWith(
      null,
      {},
      req.user,
    );
    expect(res.status).not.toHaveBeenCalled();
  });
});
