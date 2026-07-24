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
  @Post('empleado/:empleadoId')
  setHorarioSemanal(
    @Param('empleadoId') empleadoId: string, 
    @Body() dto: UpsertHorarioSemanalDto
  ) {
    return this.horariosService.setHorarioSemanal(empleadoId, dto);
  }

  // Lectura abierta para todo el staff
  @Roles('admin', 'empleado', 'recepcion')
  @Get('empleado/:empleadoId')
  getHorarioSemanal(@Param('empleadoId') empleadoId: string) {
    return this.horariosService.getHorarioSemanal(empleadoId);
  }

  // En Hito 3, bloqueos administrativos solo por admin
  @Roles('admin')
  @Post('bloqueos')
  createBloqueo(@Body() dto: CreateBloqueoDto) {
    return this.horariosService.createBloqueo(dto);
  }

  // Lectura abierta
  @Roles('admin', 'empleado', 'recepcion')
  @Get('bloqueos/:empleadoId')
  getBloqueos(@Param('empleadoId') empleadoId: string) {
    return this.horariosService.getBloqueosVigentes(empleadoId);
  }

  @Roles('admin', 'recepcion')
  @Get('bloqueos-historial')
  getHistorialBloqueos() {
    return this.horariosService.getHistorialBloqueosStaff();
  }

  @Public() // Para que el widget del frontend o WhatsApp consulte libremente
  @Get('disponibilidad')
  getDisponibilidad(
    @Query('empleadoId') empleadoId: string,
    @Query('fecha') fecha: string,
  ) {
    return this.horariosService.getDisponibilidad(empleadoId, fecha);
  }
}
