import { Controller, Post, Get, Body, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { NotasClinicasService } from './notas-clinicas.service';
import { CreateNotaClinicaDto } from './dto/create-nota-clinica.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('notas-clinicas')
export class NotasClinicasController {
  constructor(private readonly notasClinicasService: NotasClinicasService) {}

  @Roles('admin', 'recepcion', 'empleado')
  @Post()
  create(@Body() dto: CreateNotaClinicaDto, @Req() req: Request) {
    return this.notasClinicasService.create(dto, (req as any).user);
  }

  @Roles('admin', 'recepcion', 'empleado')
  @Get('cita/:citaId')
  findFullByCita(@Param('citaId') citaId: string, @Req() req: Request) {
    return this.notasClinicasService.findFullByCita(citaId, (req as any).user);
  }

  @Roles('admin', 'recepcion', 'empleado')
  @Get('mias')
  findMisNotas(@Req() req: Request) {
    return this.notasClinicasService.findMisNotas((req as any).user.userId);
  }

  @Roles('admin')
  @Get('metadata/paciente/:pacienteId')
  findMetadataByPaciente(@Param('pacienteId') pacienteId: string) {
    return this.notasClinicasService.findMetadataByPaciente(pacienteId);
  }
}
