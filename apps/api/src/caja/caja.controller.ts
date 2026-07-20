import { Controller, Get, Post, Body, UseGuards, UseInterceptors, Request } from '@nestjs/common';
import { CajaService } from './caja.service';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantInterceptor } from '../database/tenant/tenant.interceptor';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantInterceptor)
@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Get('balance')
  @Roles('admin', 'recepcion')
  async getBalance() {
    return this.cajaService.getBalanceDelDia();
  }

  @Post('cerrar')
  @Roles('admin') // Normalmente solo admin puede cerrar caja
  async cerrarCaja(@Request() req, @Body() dto: CerrarCajaDto) {
    const usuarioId = req.user.sub; // el id del usuario desde el JWT
    return this.cajaService.cerrarCaja(usuarioId, dto);
  }
}

