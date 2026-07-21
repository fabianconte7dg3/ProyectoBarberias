import { Controller, Get, Post, Body, Param, Query, UseInterceptors, UseGuards, Request } from '@nestjs/common';
import { TransaccionesService } from './transacciones.service';
import { CobrarCitaDto } from './dto/cobrar-cita.dto';
import { TenantInterceptor } from '../database/tenant/tenant.interceptor';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantInterceptor)
@Controller()
export class TransaccionesController {
  constructor(private readonly transaccionesService: TransaccionesService) {}

  @Post('citas/:id/cobrar')
  @Roles('admin', 'recepcion', 'barbero')
  async cobrarCita(
    @Request() req: any,
    @Param('id') id: string,
    @Body() cobrarCitaDto: CobrarCitaDto,
  ) {
    return this.transaccionesService.cobrarCita(id, cobrarCitaDto, req.user);
  }

  @Post('transacciones/mostrador')
  @Roles('admin', 'recepcion', 'barbero')
  async ventaMostrador(
    @Request() req: any,
    @Body() cobrarCitaDto: CobrarCitaDto,
  ) {
    return this.transaccionesService.cobrarCita(null, cobrarCitaDto, req.user);
  }

  @Get('transacciones')
  @Roles('admin')
  async findAll() {
    return this.transaccionesService.getHistorialTransacciones(20);
  }
}
