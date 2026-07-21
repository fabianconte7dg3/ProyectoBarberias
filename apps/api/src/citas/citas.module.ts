import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CitasController } from './citas.controller';
import { CitasService } from './citas.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'CITAS_QUEUE',
    }),
  ],
  controllers: [CitasController],
  providers: [CitasService],
  exports: [CitasService]
})
export class CitasModule {}
