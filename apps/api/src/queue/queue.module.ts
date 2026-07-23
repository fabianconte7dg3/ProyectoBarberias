import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CitasProcessor } from './citas.processor';
import { CanaryProcessor } from './canary.processor';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    WhatsappModule,
    BullModule.registerQueue(
      {
        name: 'CITAS_QUEUE',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: 'CANARY_QUEUE',
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: false,
        },
      }
    ),
  ],
  providers: [CitasProcessor, CanaryProcessor],
  exports: [BullModule],
})
export class QueueModule implements OnModuleInit {
  constructor(@InjectQueue('CANARY_QUEUE') private readonly canaryQueue: Queue) {}

  async onModuleInit() {
    try {
      await this.canaryQueue.add(
        'VERIFY_RLS',
        {},
        {
          repeat: { pattern: '0 * * * *' },
          jobId: 'canary-rls-hourly-job',
        }
      );
    } catch (err) {
      console.error('Error al inicializar Canary Queue:', err);
    }
  }
}
