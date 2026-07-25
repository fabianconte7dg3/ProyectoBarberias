import { Module } from '@nestjs/common';
import { NotasClinicasController } from './notas-clinicas.controller';
import { NotasClinicasService } from './notas-clinicas.service';

@Module({
  controllers: [NotasClinicasController],
  providers: [NotasClinicasService],
})
export class NotasClinicasModule {}
