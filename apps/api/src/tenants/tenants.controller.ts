import { Controller, ForbiddenException, Get, Param, Query } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Public()
  @Get('publico/:slug')
  findPublicBySlug(@Param('slug') slug: string) {
    return this.tenantsService.findPublicBySlug(slug);
  }

  /**
   * Endpoint `ask` de Caddy on-demand TLS (infrastructure/production/Caddyfile).
   * Caddy espera 200 para autorizar la emisión del certificado, cualquier otro
   * código para denegarla — sin este chequeo, on-demand TLS emitiría un
   * certificado para cualquier hostname apuntado a la IP del servidor.
   */
  @Public()
  @Get('validar-dominio')
  async validarDominio(@Query('domain') domain: string) {
    const permitido = domain ? await this.tenantsService.validarDominioParaTls(domain) : false;
    if (!permitido) throw new ForbiddenException();
    return { ok: true };
  }
}
