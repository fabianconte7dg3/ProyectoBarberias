import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportacionesController } from './importaciones.controller';
import { ImportacionesService } from './importaciones.service';
import { ImportacionesProcessor } from './importaciones.processor';
import { ParserService } from './parser.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'importaciones',
    }),
  ],
  controllers: [ImportacionesController],
  providers: [
    ImportacionesService,
    ImportacionesProcessor,
    ParserService,
  ],
  exports: [ImportacionesService],
})
export class ImportacionesModule {}
