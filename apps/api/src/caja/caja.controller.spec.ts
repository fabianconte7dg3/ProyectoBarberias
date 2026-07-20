import { Test, TestingModule } from '@nestjs/testing';
import { CajaController } from './caja.controller';

describe('CajaController', () => {
  let controller: CajaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CajaController],
    }).compile();

    controller = module.get<CajaController>(CajaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
