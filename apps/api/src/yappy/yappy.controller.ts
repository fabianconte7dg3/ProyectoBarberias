import { Controller, Get, Query, Res, HttpStatus, Inject } from '@nestjs/common';
import { YappyService } from './yappy.service';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';

@Controller('yappy')
export class YappyController {
  constructor(
    private readonly yappyService: YappyService,
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  @Public() // Webhook expuesto públicamente
  @Get('ipn')
  async handleIpn(
    @Query('orderId') orderId: string,
    @Query('status') status: string,
    @Query('hash') hash: string,
    @Query('domain') domain: string,
    @Res() res: Response,
  ) {
    if (!orderId || !status || !hash || !domain) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing parameters' });
    }

    try {
      await this.yappyService.processIpn(orderId, status, hash, domain, this.db);
      return res.status(HttpStatus.OK).json({ success: true });
    } catch (error) {
      console.error('IPN Error:', error);
      // Responder 200 o 400 según se requiera por Yappy. A menudo los webhooks prefieren 200 aunque falle lógicamente,
      // para que no sigan reintentando si el hash es malo (algunos prefieren 400).
      return res.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
    }
  }
}

