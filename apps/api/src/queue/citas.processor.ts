import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';
import { runInTenantScope } from '../database/tenant/tenant.utils';

@Processor('CITAS_QUEUE', {
  concurrency: 5,
  limiter: {
    max: 1,
    duration: 5000,
  }
})
export class CitasProcessor extends WorkerHost {
  private readonly logger = new Logger(CitasProcessor.name);

  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly whatsappService: WhatsappService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Procesando job ${job.name} (ID: ${job.id})`);
    
    switch (job.name) {
      case 'recordatorio_24h':
        return this.handleRecordatorio24h(job.data.citaId, job.data.tenantId);
      case 'cancelacion_retraso':
        return this.handleCancelacionRetraso(job.data.citaId, job.data.tenantId);
      case 'recordatorio_deuda':
        return this.handleRecordatorioDeuda(job.data.transaccionId, job.data.tenantId);
      case 'cierre_emergencia_masivo':
        return this.handleCierreEmergencia(job.data.clienteId, job.data.tenantId);
      default:
        this.logger.warn(`Job desconocido: ${job.name}`);
    }
  }

  private async handleRecordatorio24h(citaId: string, tenantId: string) {
    const result = await runInTenantScope(this.db, tenantId, async (tx) => {
      return await tx.query.citas.findFirst({
        where: eq(schema.citas.id, citaId),
        with: {
          cliente: true,
          barbero: true,
          servicio: true,
        },
      });
    });

    if (!result || result.estado !== 'programada') {
      this.logger.log(`Recordatorio omitido para cita ${citaId}: no encontrada o no está programada.`);
      return;
    }

    const fecha = new Date(result.inicioEstimado);
    const strHora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const mensaje = `Hola ${result.cliente?.nombreCompleto || ''}, te recordamos tu cita para *${result.servicio.nombre}* con ${result.barbero.nombreCompleto} mañana a las ${strHora}. \n\nResponde:\n1️⃣ para Confirmar\n2️⃣ para Cancelar`;
    
    if (result.cliente?.telefonoWhatsapp) {
      // Regla Antispam: Verificar que el cliente haya interactuado en las últimas 24h
      let interactedRecently = false;
      if (result.cliente.ultimoMensajeRecibidoAt) {
         const lastMsgDate = new Date(result.cliente.ultimoMensajeRecibidoAt);
         const diffHrs = (Date.now() - lastMsgDate.getTime()) / (1000 * 60 * 60);
         if (diffHrs <= 24) {
            interactedRecently = true;
         }
      }

      if (interactedRecently) {
         await this.whatsappService.enviarMensajeTexto(tenantId, result.cliente.telefonoWhatsapp, mensaje);
      } else {
         this.logger.log(`Recordatorio 24h omitido por falta de interacción reciente (Anti-Spam) para cita ${citaId}`);
      }
    }
  }

  private async handleCancelacionRetraso(citaId: string, tenantId: string) {
    await runInTenantScope(this.db, tenantId, async (tx) => {
      const cita = await tx.query.citas.findFirst({
        where: eq(schema.citas.id, citaId),
        with: { cliente: true },
      });

      if (!cita || cita.estado !== 'programada') {
        this.logger.log(`Cancelación automática omitida para cita ${citaId}: ya cambió de estado.`);
        return;
      }

      await tx.update(schema.citas).set({ estado: 'ausente_strike' }).where(eq(schema.citas.id, citaId));
      
      if (cita.clienteId) {
         // Incrementar strikes de forma segura sin raw query
         const clienteData = await tx.query.clientes.findFirst({
            where: eq(schema.clientes.id, cita.clienteId)
         });
         
         if (clienteData) {
            await tx.update(schema.clientes)
              .set({ ausenciasStrikes: clienteData.ausenciasStrikes + 1 })
              .where(eq(schema.clientes.id, cita.clienteId));
              
            if (clienteData.telefonoWhatsapp) {
              await this.whatsappService.enviarMensajeTexto(
                tenantId, 
                clienteData.telefonoWhatsapp, 
                `Hola ${clienteData.nombreCompleto || ''}, tu cita ha sido cancelada por inasistencia (15 min de retraso).`
              );
            }
         }
      }
    });
  }

  private async handleRecordatorioDeuda(transaccionId: string, tenantId: string) {
    this.logger.log(`Recordatorio de deuda enviado (simulado) para tx ${transaccionId}`);
  }

  private async handleCierreEmergencia(clienteId: string, tenantId: string) {
    this.logger.log(`Mensaje de cierre de emergencia (simulado) para cliente ${clienteId}`);
  }
}
