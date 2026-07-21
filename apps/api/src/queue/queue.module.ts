import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CitasProcessor } from './citas.processor';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    WhatsappModule,
    BullModule.registerQueue({
      name: 'CITAS_QUEUE',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    }),
  ],
  providers: [CitasProcessor],
  exports: [BullModule],
})
export class QueueModule {}
