import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
  ) {}

  async enviarMensajeTexto(tenantId: string, telefono: string, mensaje: string): Promise<boolean> {
    try {
      // 1. Obtener config del tenant (ignoramos el contexto de RLS manual aquí si lo llamamos desde bullmq sin interceptor, 
      // pero tenantId viene explícito así que hacemos query directa)
      const config = await this.db.query.whatsappConfig.findFirst({
        where: eq(schema.whatsappConfig.tenantId, tenantId),
      });

      if (!config) {
        this.logger.warn(`No hay configuración de WhatsApp para el tenant ${tenantId}`);
        return false;
      }

      if (config.estado === 'desconectado' || config.estado === 'suspendido') {
        this.logger.error(`Tenant ${tenantId} intentó enviar mensaje pero su estado WhatsApp es ${config.estado}. Alertando a administrador.`);
        // Aquí iría una notificación al admin
        return false;
      }

      const globalApiKey = this.configService.get<string>('EVOLUTION_API_KEY');
      if (!globalApiKey) {
        this.logger.warn('EVOLUTION_API_KEY no está configurada en .env');
        return false;
      }

      const url = `${config.evolutionServerUrl.replace(/\/$/, '')}/message/sendText/${config.evolutionInstanceName}`;

      const cleanPhone = telefono.replace(/[^0-9]/g, '');

      this.logger.log(`Enviando mensaje a ${cleanPhone} vía Evolution API (${config.evolutionInstanceName})...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': globalApiKey,
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: mensaje,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Error enviando mensaje: HTTP ${response.status} - ${errorData}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Excepción enviando mensaje de WhatsApp:', error);
      return false;
    }
  }
}
