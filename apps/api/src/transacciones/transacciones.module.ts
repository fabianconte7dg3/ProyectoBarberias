import { Module } from '@nestjs/common';
import { TransaccionesController } from './transacciones.controller';
import { TransaccionesService } from './transacciones.service';
import { YappyModule } from '../yappy/yappy.module';
import { DgiModule } from '../dgi/dgi.module';
import { ProductosModule } from '../productos/productos.module';

@Module({
  imports: [YappyModule, DgiModule, ProductosModule],
  controllers: [TransaccionesController],
  providers: [TransaccionesService],
  exports: [TransaccionesService],
})
export class TransaccionesModule {}
