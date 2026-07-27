import { Test, TestingModule } from '@nestjs/testing';
import { YappyController } from './yappy.controller';
import { YappyService } from './yappy.service';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';

describe('YappyController', () => {
  let controller: YappyController;
  let yappyService: { processIpn: jest.Mock };

  function mockResponse() {
    return { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
  }

  beforeEach(async () => {
    yappyService = { processIpn: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [YappyController],
      providers: [
        { provide: YappyService, useValue: yappyService },
        { provide: DRIZZLE_POOL_DB, useValue: {} },
      ],
    }).compile();

    controller = module.get<YappyController>(YappyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('responde 400 si falta algún parámetro requerido del IPN', async () => {
    const res = mockResponse();
    await controller.handleIpn('order-1', '', 'hash', 'domain', res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(yappyService.processIpn).not.toHaveBeenCalled();
  });

  it('procesa el IPN y responde 200 cuando todo es válido', async () => {
    yappyService.processIpn.mockResolvedValue({ success: true });
    const res = mockResponse();

    await controller.handleIpn('order-1', 'E', 'hash-1', 'dominio.com', res);

    expect(yappyService.processIpn).toHaveBeenCalledWith(
      'order-1',
      'E',
      'hash-1',
      'dominio.com',
      {},
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('responde 400 con el mensaje de error si el servicio rechaza el IPN', async () => {
    yappyService.processIpn.mockRejectedValue(new Error('Hash inválido'));
    const res = mockResponse();

    await controller.handleIpn('order-1', 'E', 'hash-malo', 'dominio.com', res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Hash inválido' });
  });
});
