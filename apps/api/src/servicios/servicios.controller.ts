import { Controller, Post, Get, Patch, Delete, Body, Param } from '@nestjs/common';
import { ServiciosService } from './servicios.service';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('servicios')
export class ServiciosController {
  constructor(private readonly serviciosService: ServiciosService) {}

  @Public()
  @Get('publico/:slug')
  findPublicBySlug(@Param('slug') slug: string) {
    return this.serviciosService.findPublicBySlug(slug);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateServicioDto) {
    return this.serviciosService.create(dto);
  }

  @Roles('admin', 'barbero', 'recepcion')
  @Get()
  findAll() {
    return this.serviciosService.findAll();
  }

  @Roles('admin', 'barbero', 'recepcion')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serviciosService.findOne(id);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServicioDto) {
    return this.serviciosService.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.serviciosService.softDelete(id);
  }
}
