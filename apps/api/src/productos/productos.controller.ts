import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto, UpdateProductoDto } from './dto/producto.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('productos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateProductoDto) {
    return this.productosService.create(dto);
  }

  @Get()
  @Roles('admin', 'recepcion', 'barbero')
  async findAll(@Request() req: any) {
    const userRole = req.user?.rol;
    return this.productosService.findAll(userRole);
  }

  @Get(':id')
  @Roles('admin', 'recepcion', 'barbero')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const userRole = req.user?.rol;
    return this.productosService.findOne(id, userRole);
  }

  @Patch(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    return this.productosService.update(id, dto);
  }
}
