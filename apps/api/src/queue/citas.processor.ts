import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';
import { runInTenantScope } from '../database/tenant/tenant.utils';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AGENDA_ACTUALIZADA } from '../common/events/agenda-actualizada.event';
import { format } from 'date-fns';

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
    private readonly eventEmitter: EventEmitter2,
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
      case 'solicitar_confirmacion':
        return this.handleSolicitarConfirmacion(job.data.citaId, job.data.tenantId);
      case 'liberar_si_no_confirmo':
        return this.handleLiberarSiNoConfirmo(job.data.citaId, job.data.tenantId);
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
          empleado: true,
          servicio: true,
          combo: true,
        },
      });
    });

    if (!result || result.estado !== 'programada') {
      this.logger.log(`Recordatorio omitido para cita ${citaId}: no encontrada o no está programada.`);
      return;
    }

    const fecha = new Date(result.inicioEstimado);
    const strHora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    // No promete un flujo de respuesta numérica (1/2) — el webhook del bot no lo conecta
    // a esta cita específica. La confirmación real llega por separado vía el job
    // solicitar_confirmacion, con un link directo (ver handleSolicitarConfirmacion).
    const mensaje = `Hola ${result.cliente?.nombreCompleto || ''}, te recordamos tu cita para *${result.servicio?.nombre || result.combo?.nombre || ''}* con ${result.empleado.nombreCompleto} mañana a las ${strHora}.`;

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
      this.eventEmitter.emit(AGENDA_ACTUALIZADA, { tenantId, empleadoId: cita.empleadoId, fecha: format(new Date(cita.inicioEstimado), 'yyyy-MM-dd') });

      if (cita.clienteId) {
         // Incrementar strikes de forma segura sin raw query
         const clienteData = await tx.query.clientes.findFirst({
            where: eq(schema.clientes.id, cita.clienteId)
         });

         if (clienteData) {
            await tx.update(schema.clientes)
              .set({ ausenciasStrikes: clienteData.ausenciasStrikes + 1 })
              .where(eq(schema.clientes.id, cita.clienteId));

            // Historial con fecha (ver Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §5).
            await tx.insert(schema.inasistencias).values({
              tenantId,
              clienteId: cita.clienteId,
              citaId: cita.id,
              fecha: cita.inicioEstimado,
            });

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

  /**
   * Envía el pedido de confirmación (WhatsApp con link + respaldo web) a
   * horasAntesConfirmacion de la cita — ver
   * Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §2.
   */
  private async handleSolicitarConfirmacion(citaId: string, tenantId: string) {
    const resultado = await runInTenantScope(this.db, tenantId, async (tx) => {
      const cita = await tx.query.citas.findFirst({
        where: eq(schema.citas.id, citaId),
        with: { cliente: true, empleado: true, servicio: true, combo: true },
      });

      if (!cita || cita.estado !== 'programada' || cita.confirmada || cita.confirmacionSolicitadaEn) {
        return null;
      }

      await tx.update(schema.citas).set({ confirmacionSolicitadaEn: new Date() }).where(eq(schema.citas.id, citaId));

      const [tenant] = await tx.select({ slug: schema.barberias.slug }).from(schema.barberias).where(eq(schema.barberias.id, tenantId));
      return { cita, slug: tenant?.slug };
    });

    if (!resultado) {
      this.logger.log(`Solicitud de confirmación omitida para cita ${citaId}: no encontrada, cancelada, ya confirmada o ya solicitada.`);
      return;
    }

    const { cita, slug } = resultado;
    if (!cita.cliente?.telefonoWhatsapp) return;

    // Regla Antispam: mismo criterio que handleRecordatorio24h — la ventana de sesión
    // de WhatsApp Business API requiere interacción reciente para mensajes libres.
    let interactedRecently = false;
    if (cita.cliente.ultimoMensajeRecibidoAt) {
      const diffHrs = (Date.now() - new Date(cita.cliente.ultimoMensajeRecibidoAt).getTime()) / (1000 * 60 * 60);
      interactedRecently = diffHrs <= 24;
    }

    if (!interactedRecently) {
      this.logger.log(`Solicitud de confirmación omitida por falta de interacción reciente (Anti-Spam) para cita ${citaId}`);
      return;
    }

    const nombreServicio = cita.servicio?.nombre || cita.combo?.nombre || 'tu cita';
    const fecha = new Date(cita.inicioEstimado);
    const strHora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const strFecha = fecha.toLocaleDateString('es-ES');
    const linkConfirmar = `${process.env.WEB_URL || 'http://localhost:3000'}/${slug}/confirmar-cita?citaId=${cita.id}&token=${cita.tokenCliente}`;

    const mensaje = `Hola ${cita.cliente.nombreCompleto || ''}, confirma tu cita para *${nombreServicio}* con ${cita.empleado.nombreCompleto} el ${strFecha} a las ${strHora}.\n\nConfirma aquí: ${linkConfirmar}\n\nSi no confirmas a tiempo, el horario se liberará automáticamente.`;

    await this.whatsappService.enviarMensajeTexto(tenantId, cita.cliente.telefonoWhatsapp, mensaje);
  }

  /**
   * Libera el horario si la cita sigue sin confirmar pasado el deadline —
   * ver Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §2.
   */
  private async handleLiberarSiNoConfirmo(citaId: string, tenantId: string) {
    const resultado = await runInTenantScope(this.db, tenantId, async (tx) => {
      const cita = await tx.query.citas.findFirst({
        where: eq(schema.citas.id, citaId),
        with: { cliente: true },
      });

      if (!cita || cita.estado !== 'programada' || cita.confirmada) {
        this.logger.log(`Liberación por falta de confirmación omitida para cita ${citaId}: ya cambió de estado o ya está confirmada.`);
        return null;
      }

      const [actualizada] = await tx.update(schema.citas).set({ estado: 'cancelada' }).where(eq(schema.citas.id, citaId)).returning();
      return { cita: actualizada, cliente: cita.cliente };
    });

    if (!resultado) return;

    const { cita, cliente } = resultado;
    this.eventEmitter.emit(AGENDA_ACTUALIZADA, { tenantId, empleadoId: cita.empleadoId, fecha: format(new Date(cita.inicioEstimado), 'yyyy-MM-dd') });

    if (cliente?.telefonoWhatsapp) {
      await this.whatsappService.enviarMensajeTexto(
        tenantId,
        cliente.telefonoWhatsapp,
        `Hola ${cliente.nombreCompleto || ''}, tu horario fue liberado automáticamente por falta de confirmación. Si aún lo necesitas, puedes agendar de nuevo cuando quieras.`
      );
    }
  }

  private async handleRecordatorioDeuda(transaccionId: string, tenantId: string) {
    this.logger.log(`Recordatorio de deuda enviado (simulado) para tx ${transaccionId}`);
  }

  private async handleCierreEmergencia(clienteId: string, tenantId: string) {
    this.logger.log(`Mensaje de cierre de emergencia (simulado) para cliente ${clienteId}`);
  }
}
