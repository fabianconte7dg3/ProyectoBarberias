import { Module } from '@nestjs/common';
import { DatosController } from './datos.controller';
import { DatosService } from './datos.service';

@Module({
  controllers: [DatosController],
  providers: [DatosService],
  exports: [DatosService],
})
export class DatosModule {}
