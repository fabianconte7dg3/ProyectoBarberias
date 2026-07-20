import { Module } from '@nestjs/common';
import { DgiService } from './dgi.service';

@Module({
  providers: [DgiService],
  exports: [DgiService],
})
export class DgiModule {}

