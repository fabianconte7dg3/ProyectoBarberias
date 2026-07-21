import { Controller, Post, Param, Body, Logger, Inject } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { Public } from '../common/decorators/public.decorator';
import { runInTenantScope } from '../database/tenant/tenant.utils';
import { TenantContext } from '../database/tenant/tenant-context';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  @Public()
  @Post('webhook/:tenantId')
  async handleEvolutionWebhook(
    @Param('tenantId') tenantId: string,
    @Body() payload: any,
  ) {
    this.logger.log(`Recibido webhook de Evolution API para tenant ${tenantId}`);

    // Evolution API manda un array de eventos o un evento principal
    // Asumiremos la estructura básica "messages.upsert" para un mensaje entrante
    if (payload?.event === 'messages.upsert' && payload?.data?.message) {
      const msg = payload.data;
      const remoteJid = msg.key.remoteJid;
      const fromMe = msg.key.fromMe;
      
      // Solo responder a mensajes que provienen de clientes, no del propio bot
      if (!fromMe && remoteJid && !remoteJid.includes('@g.us')) { // ignorar grupos
        
        // Extraer texto
        const messageContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const incomingText = messageContent.trim().toLowerCase();
        const telefono = remoteJid.split('@')[0];

        this.logger.log(`Mensaje entrante de ${telefono}: "${incomingText}"`);

        // Actualizar ultimoMensajeRecibidoAt en background
        runInTenantScope(this.db, tenantId, async () => {
          try {
            const txDb = TenantContext.getDb();
            await txDb.update(schema.clientes)
              .set({ ultimoMensajeRecibidoAt: new Date() })
              .where(eq(schema.clientes.telefonoWhatsapp, telefono));
          } catch (error) {
            this.logger.error(`Error actualizando last interaction para ${telefono}: ${error.message}`);
          }
        }).catch(err => this.logger.error(err));

        // Lógica de Menú Numerado o Fallback (Bot estricto anti-frustración)
        if (incomingText === '1') {
          // Reservar
          await this.whatsappService.enviarMensajeTexto(
            tenantId, 
            telefono, 
            `¡Perfecto! Para agendar tu cita y ver nuestra disponibilidad en tiempo real, ingresa a nuestro portal web:\n\n🌐 https://reserva.tuberberia.com/${tenantId}`
          );
        } else if (incomingText === '2') {
          // Cancelar
          await this.whatsappService.enviarMensajeTexto(
            tenantId, 
            telefono, 
            `Entendido. Para cancelar tu cita de forma segura, por favor ingresa al link que te llegó en el correo de confirmación, o escribe '3' para hablar con un humano.`
          );
        } else if (incomingText === '3') {
          // Hablar con alguien
          await this.whatsappService.enviarMensajeTexto(
            tenantId, 
            telefono, 
            `Hemos notificado a nuestro equipo. Un humano se pondrá en contacto contigo a la brevedad posible. 🕒`
          );
          // (Acá se crearía una notificación para el staff o cita en estado 'revision_manual')
        } else {
          // Mensaje no reconocido - Mostrar menú principal
          const menu = `¡Hola! Soy el asistente virtual de la barbería. 🤖\n\nPor favor, responde con el número de la opción que deseas:\n\n1️⃣ Agendar una nueva cita\n2️⃣ Cancelar una cita existente\n3️⃣ Hablar con un humano\n\n*Nota:* Para garantizar la mejor atención, mi comprensión de texto es limitada, ¡solo escribe el número!`;
          await this.whatsappService.enviarMensajeTexto(tenantId, telefono, menu);
        }
      }
    }

    return { status: 'ok' };
  }
}
