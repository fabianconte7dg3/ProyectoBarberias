import { Test, TestingModule } from '@nestjs/testing';
import { TransaccionesController } from './transacciones.controller';

describe('TransaccionesController', () => {
  let controller: TransaccionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransaccionesController],
    }).compile();

    controller = module.get<TransaccionesController>(TransaccionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
