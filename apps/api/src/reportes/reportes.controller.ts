import { Controller, Get, Query, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantInterceptor } from '../database/tenant/tenant.interceptor';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantInterceptor)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('dashboard')
  @Roles('admin')
  async getDashboardMetrics(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.reportesService.getDashboardMetrics(desde, hasta);
  }

  @Get('mi-desempeno')
  @Roles('barbero', 'admin', 'recepcion')
  async getMiDesempeno(
    @Request() req: any,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return this.reportesService.getMiDesempeno(userId, desde, hasta);
  }
}
