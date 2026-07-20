import { Module } from '@nestjs/common';
import { TransaccionesController } from './transacciones.controller';
import { TransaccionesService } from './transacciones.service';
import { YappyModule } from '../yappy/yappy.module';
import { DgiModule } from '../dgi/dgi.module';

@Module({
  imports: [YappyModule, DgiModule],
  controllers: [TransaccionesController],
  providers: [TransaccionesService]
})
export class TransaccionesModule {}

