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
          // Pausa de Auto-Servicio (ver matriz-permisos-y-bloqueos.md §2) — el frontend
          // la usa para mostrar el banner de "Reserva Pausada" en el portal público.
          killSwitchActivo: true,
        },
      });
      if (!tenant) throw new NotFoundException('Negocio no encontrado');
      return tenant;
    });
  }

  /**
   * Hosts fijos de la plataforma (dominio raíz, www, api) — siempre válidos
   * para emisión de certificado, no representan un tenant.
   */
  private static readonly HOSTS_FIJOS = new Set([
    'volumetrixpa.com',
    'www.volumetrixpa.com',
    'api.volumetrixpa.com',
  ]);

  /**
   * Endpoint `ask` de Caddy on-demand TLS (Fase 4 — infraestructura/production/Caddyfile).
   * Caddy llama `GET ?domain=<host>` antes de emitir cada certificado; sin esta
   * validación, on-demand TLS emitiría un certificado para CUALQUIER hostname que
   * alguien apunte a la IP del servidor (abuso / agotamiento de rate limits de
   * Let's Encrypt). Solo autoriza los hosts fijos de la plataforma o un subdominio
   * cuyo primer label sea el slug de un tenant activo real.
   */
  async validarDominioParaTls(domain: string): Promise<boolean> {
    if (TenantsService.HOSTS_FIJOS.has(domain)) return true;

    const slug = domain.split('.')[0];
    const tenantResult = await this.db.execute(sql`SELECT id FROM auth_get_tenant_by_slug(${slug})`);
    return Boolean(tenantResult.rows[0]?.id);
  }
}
