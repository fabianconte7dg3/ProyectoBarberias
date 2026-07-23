import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminService, CreateTenantDto, ActivateAdminDto } from './super-admin.service';
import { SuperAdminGuard } from './super-admin.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { Response, Request } from 'express';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Public()
  @Get('setup/status')
  async checkSetupStatus() {
    return this.superAdminService.checkSetupStatus();
  }

  @Public()
  @Get('setup/iniciar')
  async iniciarSetup() {
    return this.superAdminService.iniciarSetup();
  }

  @Public()
  @Post('setup/completar')
  async completarSetup(
    @Body() body: { email: string; password: string; totpSecret: string; codigoTotp: string },
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.superAdminService.completarSetup(body);
    res.cookie('jwt', result.accessToken, {
      httpOnly: true,
      secure: process.env?.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 12 * 60 * 60 * 1000,
    });
    return result;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async loginPaso1(
    @Body() body: { email: string; password: string },
    @Req() req: Request
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';
    return this.superAdminService.iniciarLogin(body.email, body.password, { ip, userAgent });
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login/verificar-totp')
  async loginPaso2(
    @Body() body: { tempToken: string; codigoTotp: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';
    const result = await this.superAdminService.verificarTotp(body.tempToken, body.codigoTotp, { ip, userAgent });

    res.cookie('jwt', result.accessToken, {
      httpOnly: true,
      secure: process.env?.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 12 * 60 * 60 * 1000,
    });

    return {
      message: result.message,
      usuario: result.usuario,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @UseGuards(SuperAdminGuard)
  @Get('stats')
  async getStats() {
    return this.superAdminService.obtenerEstadisticas();
  }

  @Public()
  @UseGuards(SuperAdminGuard)
  @Get('tenants')
  async getTenants() {
    return this.superAdminService.listarTenants();
  }

  @Public()
  @UseGuards(SuperAdminGuard)
  @Post('tenants')
  async crearTenant(@Body() body: CreateTenantDto) {
    return this.superAdminService.crearTenantManual(body);
  }

  @Public()
  @UseGuards(SuperAdminGuard)
  @Get('tenants/:id')
  async getTenantDetalle(@Param('id') id: string) {
    return this.superAdminService.obtenerDetalleTenant(id);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('activar-admin')
  async activarAdmin(@Body() body: ActivateAdminDto) {
    return this.superAdminService.activarAdminManual(body);
  }

  @Public()
  @UseGuards(SuperAdminGuard)
  @Patch('tenants/:id/estado')
  async cambiarEstado(
    @Param('id') id: string,
    @Body('estado') estado: 'activo' | 'suspendido_pago' | 'cancelado'
  ) {
    return this.superAdminService.cambiarEstadoTenant(id, estado);
  }

  @Public()
  @UseGuards(SuperAdminGuard)
  @Patch('tenants/:id/plan')
  async cambiarPlan(
    @Param('id') id: string,
    @Body('plan') plan: 'basico' | 'premium'
  ) {
    return this.superAdminService.cambiarPlanTenant(id, plan);
  }

  @Public()
  @UseGuards(SuperAdminGuard)
  @Post('tenants/:id/kill-switch')
  async toggleKillSwitch(
    @Param('id') id: string,
    @Body('bloqueado') bloqueado: boolean
  ) {
    return this.superAdminService.toggleKillSwitchPlatform(id, bloqueado);
  }

  @Public()
  @UseGuards(SuperAdminGuard)
  @Get('business-metrics')
  async getBusinessMetrics() {
    return this.superAdminService.obtenerMetricasNegocio();
  }

  @Public()
  @UseGuards(SuperAdminGuard)
  @Get('security-alerts')
  async getSecurityAlerts(@Query('atendida') atendidaStr?: string) {
    const atendida = atendidaStr === 'true' ? true : atendidaStr === 'false' ? false : undefined;
    return this.superAdminService.obtenerAlertasSeguridad(atendida);
  }

  @Public()
  @UseGuards(SuperAdminGuard)
  @Patch('security-alerts/:id/atendida')
  async marcarAlertaAtendida(@Param('id') id: string) {
    return this.superAdminService.marcarAlertaAtendida(id);
  }
}
