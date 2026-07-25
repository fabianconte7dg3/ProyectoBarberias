import { Controller, Post, Get, Patch, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { PacientesService } from './pacientes.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  @Roles('admin', 'recepcion', 'empleado')
  @Post()
  create(@Body() dto: CreatePacienteDto) {
    return this.pacientesService.create(dto);
  }

  @Roles('admin', 'recepcion', 'empleado')
  @Get()
  findAllByCliente(@Query('clienteId') clienteId?: string) {
    if (!clienteId) {
      throw new BadRequestException('El query param clienteId es requerido.');
    }
    return this.pacientesService.findAllByCliente(clienteId);
  }

  @Roles('admin', 'recepcion', 'empleado')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pacientesService.findOne(id);
  }

  @Roles('admin', 'recepcion', 'empleado')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePacienteDto) {
    return this.pacientesService.update(id, dto);
  }
}
