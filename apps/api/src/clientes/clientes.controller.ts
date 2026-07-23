import { Controller, Post, Get, Patch, Body, Param, Query, Headers, Inject, NotFoundException } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { sql } from 'drizzle-orm';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { runInTenantScope } from '../database/tenant/tenant.utils';

@Controller('clientes')
export class ClientesController {
  constructor(
    private readonly clientesService: ClientesService,
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>
  ) {}

  @Public()
  @Post('publico')
  async createPublico(
    @Body() dto: CreateClienteDto,
    @Headers('x-tenant-slug') tenantSlug: string,
  ) {
    const slug = tenantSlug || 'barberia-demo';
    const tenantResult = await this.db.execute(sql`SELECT id FROM auth_get_tenant_by_slug(${slug})`);
    const tenantId = tenantResult.rows[0]?.id as string;
    if (!tenantId) throw new NotFoundException('Barbería no encontrada');

    return runInTenantScope(this.db, tenantId, async () => {
      try {
        return await this.clientesService.create(dto);
      } catch (err: any) {
        const clientes = await this.clientesService.findAll(dto.telefonoWhatsapp);
        if (clientes && clientes.length > 0) {
          return clientes[0];
        }
        throw err;
      }
    });
  }

  @Roles('admin', 'recepcion', 'barbero')
  @Post()
  create(@Body() dto: CreateClienteDto) {
    return this.clientesService.create(dto);
  }

  @Roles('admin', 'recepcion', 'barbero')
  @Get()
  findAll(@Query('q') q?: string) {
    return this.clientesService.findAll(q);
  }

  @Roles('admin', 'recepcion', 'barbero')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientesService.findOne(id);
  }

  @Roles('admin', 'recepcion')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClienteDto) {
    return this.clientesService.update(id, dto);
  }
}
