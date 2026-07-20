import { Controller, Post, Body, Headers, Patch, Param, UnauthorizedException, Inject } from '@nestjs/common';
import { CitasService } from './citas.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { BloquearTurnoDto } from './dto/bloquear-turno.dto';
import { UpdateEstadoCitaDto } from './dto/update-estado.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { eq, and, gt } from 'drizzle-orm';
import { citas } from '../database/schema';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';

@Controller('citas')
export class CitasController {
  constructor(
    private readonly citasService: CitasService,
    @Inject(DRIZZLE_POOL_DB) private readonly globalDb: NodePgDatabase<typeof schema>
  ) {}

  @Roles('admin', 'recepcion', 'barbero')
  @Post()
  async crearCita(
    @Body() data: CreateCitaDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
    }
    return this.citasService.crearCita(data, idempotencyKey);
  }

  @Public() // Los clientes bloquean temporalmente desde la web sin auth
  @Post('bloquear')
  async bloquearTurno(@Body() data: BloquearTurnoDto) {
    return this.citasService.bloquearTurno(data);
  }

  @Roles('admin', 'recepcion', 'barbero')
  @Patch(':id/estado')
  async cambiarEstado(@Param('id') id: string, @Body() data: UpdateEstadoCitaDto) {
    return this.citasService.cambiarEstado(id, data.estado);
  }

  @Public()
  @Post(':id/cancelar')
  async cancelarPorCliente(@Param('id') id: string, @Body('token') token: string) {
    if (!token) throw new UnauthorizedException('Token de cancelación requerido');
    
    // Verificación manual simple para el cliente (public route, usa globalDb)
    const [cita] = await this.globalDb
      .select()
      .from(citas)
      .where(
        and(
          eq(citas.id, id),
          eq(citas.tokenCliente, token),
          gt(citas.tokenExpiraEn, new Date())
        )
      );

    if (!cita) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return this.citasService.cancelarPorCliente(id);
  }
}
