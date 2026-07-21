import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { HorariosService } from './horarios.service';
import { UpsertHorarioSemanalDto } from './dto/upsert-horario-semanal.dto';
import { CreateBloqueoDto } from './dto/create-bloqueo.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('horarios')
export class HorariosController {
  constructor(private readonly horariosService: HorariosService) {}

  // En Hito 3, edición restringida exclusivamente a admin
  @Roles('admin')
  @Post('barbero/:barberoId')
  setHorarioSemanal(
    @Param('barberoId') barberoId: string, 
    @Body() dto: UpsertHorarioSemanalDto
  ) {
    return this.horariosService.setHorarioSemanal(barberoId, dto);
  }

  // Lectura abierta para todo el staff
  @Roles('admin', 'barbero', 'recepcion')
  @Get('barbero/:barberoId')
  getHorarioSemanal(@Param('barberoId') barberoId: string) {
    return this.horariosService.getHorarioSemanal(barberoId);
  }

  // En Hito 3, bloqueos administrativos solo por admin
  @Roles('admin')
  @Post('bloqueos')
  createBloqueo(@Body() dto: CreateBloqueoDto) {
    return this.horariosService.createBloqueo(dto);
  }

  // Lectura abierta
  @Roles('admin', 'barbero', 'recepcion')
  @Get('bloqueos/:barberoId')
  getBloqueos(@Param('barberoId') barberoId: string) {
    return this.horariosService.getBloqueosVigentes(barberoId);
  }

  @Roles('admin', 'recepcion')
  @Get('bloqueos-historial')
  getHistorialBloqueos() {
    return this.horariosService.getHistorialBloqueosStaff();
  }

  @Public() // Para que el widget del frontend o WhatsApp consulte libremente
  @Get('disponibilidad')
  getDisponibilidad(
    @Query('barberoId') barberoId: string,
    @Query('fecha') fecha: string,
  ) {
    return this.horariosService.getDisponibilidad(barberoId, fecha);
  }
}
