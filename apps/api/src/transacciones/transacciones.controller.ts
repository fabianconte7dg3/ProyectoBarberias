import { Controller, Get, Post, Body, Param, Query, UseInterceptors, UseGuards, Request, Res, HttpStatus } from '@nestjs/common';
import { TransaccionesService } from './transacciones.service';
import { CobrarCitaDto } from './dto/cobrar-cita.dto';
import { TenantInterceptor } from '../database/tenant/tenant.interceptor';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import type { Response } from 'express';

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
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.transaccionesService.cobrarCita(id, cobrarCitaDto, req.user);
    if (result.idempotent) {
      res.status(HttpStatus.OK);
    }
    return result;
  }

  @Post('transacciones/mostrador')
  @Roles('admin', 'recepcion', 'barbero')
  async ventaMostrador(
    @Request() req: any,
    @Body() cobrarCitaDto: CobrarCitaDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.transaccionesService.cobrarCita(null, cobrarCitaDto, req.user);
    if (result.idempotent) {
      res.status(HttpStatus.OK);
    }
    return result;
  }

  @Get('transacciones')
  @Roles('admin')
  async findAll() {
    return this.transaccionesService.getHistorialTransacciones(20);
  }
}
