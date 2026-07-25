import { Controller, Get, Param } from '@nestjs/common';
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
}
