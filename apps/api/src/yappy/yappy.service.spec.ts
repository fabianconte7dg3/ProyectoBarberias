import { Test, TestingModule } from '@nestjs/testing';
import { YappyService } from './yappy.service';

describe('YappyService', () => {
  let service: YappyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YappyService],
    }).compile();

    service = module.get<YappyService>(YappyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
