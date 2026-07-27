import { Test, TestingModule } from '@nestjs/testing';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';

describe('CajaController', () => {
  let controller: CajaController;
  let cajaService: { getBalanceDelDia: jest.Mock; cerrarCaja: jest.Mock };

  beforeEach(async () => {
    cajaService = {
      getBalanceDelDia: jest.fn(),
      cerrarCaja: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CajaController],
      providers: [
        { provide: CajaService, useValue: cajaService },
        // TenantInterceptor está referenciado vía @UseInterceptors a nivel de clase;
        // Nest lo resuelve al compilar el módulo aunque no se dispare ningún request.
        { provide: DRIZZLE_POOL_DB, useValue: {} },
      ],
    }).compile();

    controller = module.get<CajaController>(CajaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getBalance delega en CajaService.getBalanceDelDia', async () => {
    cajaService.getBalanceDelDia.mockResolvedValue({ efectivoEsperado: 42 });
    const result = await controller.getBalance();
    expect(result).toEqual({ efectivoEsperado: 42 });
  });

  it('cerrarCaja extrae el usuarioId del JWT y lo pasa al servicio', async () => {
    cajaService.cerrarCaja.mockResolvedValue({ id: 'cierre-1' });
    const req = { user: { userId: 'user-1' } } as any;
    const dto = { efectivoDeclarado: 100 } as any;

    await controller.cerrarCaja(req, dto, '127.0.0.1', 'jest');

    expect(cajaService.cerrarCaja).toHaveBeenCalledWith(
      'user-1',
      dto,
      '127.0.0.1',
      'jest',
    );
  });
});
