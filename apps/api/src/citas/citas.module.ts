import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CitasController } from './citas.controller';
import { CitasService } from './citas.service';
import { CombosModule } from '../combos/combos.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'CITAS_QUEUE',
    }),
    CombosModule,
  ],
  controllers: [CitasController],
  providers: [CitasService],
  exports: [CitasService]
})
export class CitasModule {}
