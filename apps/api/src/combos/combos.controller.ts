import { Controller, Post, Get, Patch, Delete, Body, Param } from '@nestjs/common';
import { CombosService } from './combos.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('combos')
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  @Public()
  @Get('publico/:slug')
  findPublicBySlug(@Param('slug') slug: string) {
    return this.combosService.findPublicBySlug(slug);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateComboDto) {
    return this.combosService.create(dto);
  }

  @Roles('admin', 'empleado', 'recepcion')
  @Get()
  findAll() {
    return this.combosService.findAll();
  }

  @Roles('admin', 'empleado', 'recepcion')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.combosService.findOne(id);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateComboDto) {
    return this.combosService.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.combosService.softDelete(id);
  }
}
