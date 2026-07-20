import { Controller, Get, Post, Body, Param, Query, UseInterceptors, UseGuards, Request } from '@nestjs/common';
import { TransaccionesService } from './transacciones.service';
import { CobrarCitaDto } from './dto/cobrar-cita.dto';
import { TenantInterceptor } from '../database/tenant/tenant.interceptor';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantInterceptor)
@Controller() // Dejamos en blanco para personalizar las rutas
export class TransaccionesController {
  constructor(private readonly transaccionesService: TransaccionesService) {}

  @Post('citas/:id/cobrar')
  @Roles('admin', 'recepcion')
  async cobrarCita(
    @Param('id') id: string,
    @Body() cobrarCitaDto: CobrarCitaDto,
  ) {
    return this.transaccionesService.cobrarCita(id, cobrarCitaDto);
  }

  @Post('citas/:id/confirmar-pago-manual')
  @Roles('admin', 'recepcion')
  async confirmarPagoManual(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const usuarioId = req.user.userId;
    return this.transaccionesService.confirmarPagoManual(id, usuarioId);
  }

  @Get('transacciones')
  @Roles('admin')
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.transaccionesService.findAll(Number(page), Number(limit));
  }
}

