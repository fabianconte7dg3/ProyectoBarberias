import { Test, TestingModule } from '@nestjs/testing';
import { YappyController } from './yappy.controller';

describe('YappyController', () => {
  let controller: YappyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [YappyController],
    }).compile();

    controller = module.get<YappyController>(YappyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
