import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { Response } from 'express';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async loginPaso1(@Body() body: { email: string; password: string }) {
    return this.superAdminService.iniciarLogin(body.email, body.password);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login/verificar-totp')
  async loginPaso2(
    @Body() body: { tempToken: string; codigoTotp: string },
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.superAdminService.verificarTotp(body.tempToken, body.codigoTotp);

    res.cookie('jwt', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000, // 12 horas
    });

    return {
      message: result.message,
      usuario: result.usuario,
      accessToken: result.accessToken,
    };
  }

  @Roles('superadmin')
  @Get('stats')
  async getStats() {
    return this.superAdminService.obtenerEstadisticas();
  }

  @Roles('superadmin')
  @Get('tenants')
  async getTenants() {
    return this.superAdminService.listarTenants();
  }

  @Roles('superadmin')
  @Patch('tenants/:id/estado')
  async cambiarEstado(
    @Param('id') id: string,
    @Body('estado') estado: 'activo' | 'suspendido_pago' | 'cancelado'
  ) {
    return this.superAdminService.cambiarEstadoTenant(id, estado);
  }

  @Roles('superadmin')
  @Patch('tenants/:id/plan')
  async cambiarPlan(
    @Param('id') id: string,
    @Body('plan') plan: 'basico' | 'premium'
  ) {
    return this.superAdminService.cambiarPlanTenant(id, plan);
  }

  @Roles('superadmin')
  @Post('tenants/:id/kill-switch')
  async toggleKillSwitch(
    @Param('id') id: string,
    @Body('bloqueado') bloqueado: boolean
  ) {
    return this.superAdminService.toggleKillSwitchPlatform(id, bloqueado);
  }
}
