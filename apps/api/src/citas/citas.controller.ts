import { Controller, Post, Body, Headers, Patch, Param, Get, Query, Req, UnauthorizedException, Inject, Res, HttpStatus, NotFoundException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { CitasService } from './citas.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { BloquearTurnoDto } from './dto/bloquear-turno.dto';
import { UpdateEstadoCitaDto } from './dto/update-estado.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { eq, and, gt, sql } from 'drizzle-orm';
import { citas, barberias } from '../database/schema';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { runInTenantScope } from '../database/tenant/tenant.utils';

@Controller('citas')
export class CitasController {
  constructor(
    private readonly citasService: CitasService,
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>
  ) {}

  @Public()
  @Post('publica')
  async crearCitaPublica(
    @Body() data: CreateCitaDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Headers('x-tenant-slug') tenantSlug: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!idempotencyKey) {
      idempotencyKey = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
    
    // Resolver Tenant por Slug para peticiones públicas
    const tenantResult = await this.db.execute(sql`SELECT id FROM barberias WHERE slug = ${tenantSlug || 'barberia-carlos'}`);
    const tenantId = tenantResult.rows[0]?.id as string;
    if (!tenantId) throw new NotFoundException('Barbería no encontrada');

    return runInTenantScope(this.db, tenantId, async () => {
      const result = await this.citasService.crearCita(data, idempotencyKey);
      if (result.isExisting) {
        res.status(HttpStatus.OK);
      }
      return result.cita;
    });
  }

  @Roles('admin', 'recepcion', 'barbero')
  @Post()
  async crearCita(
    @Body() data: CreateCitaDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
    }
    const result = await this.citasService.crearCita(data, idempotencyKey);
    
    if (result.isExisting) {
      res.status(HttpStatus.OK);
    }
    
    return result.cita;
  }

  @Roles('admin', 'recepcion', 'barbero')
  @Get()
  async getCitas(
    @Req() req: Request,
    @Query('fecha') fechaStr?: string,
    @Query('barberoId') barberoId?: string,
  ) {
    const user = (req as any).user;
    return this.citasService.obtenerCitasAgenda({
      user,
      fechaStr,
      barberoId,
    });
  }

  @Public() // Los clientes bloquean temporalmente desde la web sin auth
  @Post('bloquear')
  async bloquearTurno(@Body() data: BloquearTurnoDto) {
    return this.citasService.bloquearTurno(data);
  }

  @Roles('admin', 'recepcion', 'barbero')
  @Patch(':id/estado')
  async cambiarEstado(
    @Param('id') id: string,
    @Body() dto: UpdateEstadoCitaDto,
    @Req() req: Request
  ) {
    return this.citasService.cambiarEstado(id, dto.estado, (req as any).user);
  }

  @Roles('admin', 'recepcion', 'barbero')
  @Post(':id/cancelar')
  async cancelarCita(@Param('id') id: string) {
    return this.citasService.cancelarPorCliente(id);
  }
}
