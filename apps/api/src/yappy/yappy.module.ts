import { Module } from '@nestjs/common';
import { YappyService } from './yappy.service';
import { YappyController } from './yappy.controller';
import { DgiModule } from '../dgi/dgi.module';

@Module({
  imports: [DgiModule],
  controllers: [YappyController],
  providers: [YappyService],
  exports: [YappyService],
})
export class YappyModule {}

