import { Test, TestingModule } from '@nestjs/testing';
import { DgiService } from './dgi.service';

describe('DgiService', () => {
  let service: DgiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DgiService],
    }).compile();

    service = module.get<DgiService>(DgiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
