import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { runInTenantScope } from '../database/tenant/tenant.utils';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { sql, eq } from 'drizzle-orm';

@Injectable()
export class TenantsService {
  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>
  ) {}

  async findPublicBySlug(slug: string) {
    const tenantResult = await this.db.execute(sql`SELECT id FROM auth_get_tenant_by_slug(${slug})`);
    const tenantId = tenantResult.rows[0]?.id as string;
    if (!tenantId) throw new NotFoundException('Negocio no encontrado');

    return runInTenantScope(this.db, tenantId, async (tx) => {
      const tenant = await tx.query.barberias.findFirst({
        where: eq(schema.barberias.id, tenantId),
        columns: {
          nombreComercial: true,
          slug: true,
          colorPrimario: true,
          logoUrl: true,
          industria: true,
          terminologiaEmpleado: true,
          terminologiaServicio: true,
          terminologiaCliente: true,
          configCamposPersonalizados: true,
          configWidgetsDestacados: true,
        },
      });
      if (!tenant) throw new NotFoundException('Negocio no encontrado');
      return tenant;
    });
  }
}
