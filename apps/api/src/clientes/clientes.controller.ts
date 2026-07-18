import { Controller, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Roles('admin', 'recepcion', 'barbero')
  @Post()
  create(@Body() dto: CreateClienteDto) {
    return this.clientesService.create(dto);
  }

  @Roles('admin', 'recepcion', 'barbero')
  @Get()
  findAll(@Query('q') q?: string) {
    return this.clientesService.findAll(q);
  }

  @Roles('admin', 'recepcion', 'barbero')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientesService.findOne(id);
  }

  @Roles('admin', 'recepcion')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClienteDto) {
    return this.clientesService.update(id, dto);
  }
}
