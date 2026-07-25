import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { eq, and, lte, gte, or, between, ne, inArray, desc, sql } from 'drizzle-orm';
import { citas, bloqueosTemporales, servicios, combos, clientes, usuarios, pacientes, barberias, inasistencias } from '../database/schema';
import { TenantContext } from '../database/tenant/tenant-context';
import { runInTenantScope } from '../database/tenant/tenant.utils';
import { CreateCitaDto } from './dto/create-cita.dto';
import { CreateCitasGrupalesDto } from './dto/create-citas-grupales.dto';
import { BloquearTurnoDto } from './dto/bloquear-turno.dto';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CombosService } from '../combos/combos.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AGENDA_ACTUALIZADA } from '../common/events/agenda-actualizada.event';
import { format } from 'date-fns';

@Injectable()
export class CitasService {
  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
    @InjectQueue('CITAS_QUEUE') private readonly citasQueue: Queue,
    private readonly combosService: CombosService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private emitirAgendaActualizada(tenantId: string, empleadoId: string, fecha: Date) {
    this.eventEmitter.emit(AGENDA_ACTUALIZADA, { tenantId, empleadoId, fecha: format(fecha, 'yyyy-MM-dd') });
  }

  /**
   * Resuelve la duración en minutos de una cita a partir de servicioId o comboId
   * (exactamente uno debe venir — regla de aplicación, ver create-cita.dto.ts).
   * Para combos: duracionAjustadaMinutos si el combo la define, si no la suma de
   * duracionMinutos de sus servicios (ver Plan_Multi_Industria_Fase4_CombosGruposTemplates.md §2).
   */
  private async resolverDuracionMinutos(db: any, data: Pick<CreateCitaDto, 'servicioId' | 'comboId'>): Promise<number> {
    if (data.servicioId && data.comboId) {
      throw new BadRequestException('Una cita no puede tener servicioId y comboId a la vez.');
    }

    if (data.comboId) {
      const combo = await this.combosService.findOne(data.comboId);
      if (combo.duracionAjustadaMinutos) return combo.duracionAjustadaMinutos;
      return combo.servicios.reduce((total: number, cs: any) => total + cs.servicio.duracionMinutos, 0);
    }

    if (data.servicioId) {
      const [servicio] = await db.select().from(servicios).where(eq(servicios.id, data.servicioId));
      if (!servicio) throw new NotFoundException('Servicio no encontrado');
      return servicio.duracionMinutos;
    }

    throw new BadRequestException('Una cita debe tener servicioId o comboId.');
  }

  /**
   * Auto-resolver empleadoId si no viene en el request (caso Solo-preneur).
   * Se busca el único empleado activo del tenant; si hay más de uno y no se
   * especificó, se lanza un error descriptivo para que el frontend lo maneje.
   */
  private async resolverEmpleadoId(db: any, empleadoId?: string): Promise<string> {
    if (empleadoId) return empleadoId;

    const staff = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(and(
        eq(usuarios.activo, true),
      ))
      .limit(2);

    if (staff.length === 1) return staff[0].id;
    if (staff.length > 1) throw new NotFoundException('Debes seleccionar un empleado para continuar con la reserva.');
    throw new NotFoundException('No hay empleados disponibles en esta barbería.');
  }

  /**
   * Config del tenant relevante para crear una cita: ventana de anticipación
   * (horas) para pedir confirmación, e industria (para exigir "motivo" —
   * ver Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §2 y §6).
   */
  private async resolverConfigTenant(db: any, tenantId: string): Promise<{ horasAntesConfirmacion: number; industria: string }> {
    const [tenant] = await db
      .select({ horasAntesConfirmacion: barberias.horasAntesConfirmacion, industria: barberias.industria })
      .from(barberias)
      .where(eq(barberias.id, tenantId));
    return {
      horasAntesConfirmacion: tenant?.horasAntesConfirmacion ?? 4,
      industria: tenant?.industria ?? 'barberia',
    };
  }

  private static readonly INDUSTRIAS_QUE_EXIGEN_MOTIVO = ['veterinaria', 'clinica_medica'];

  /**
   * Campos de confirmación para una cita nueva. Si se reserva con menos
   * anticipación que la ventana configurada, no tiene sentido pedir
   * confirmación (no habría tiempo de esperar respuesta) — se auto-confirma.
   */
  private construirCamposConfirmacion(inicio: Date, horasAntesConfirmacion: number) {
    const msVentana = horasAntesConfirmacion * 60 * 60 * 1000;
    const requiereConfirmacion = (inicio.getTime() - Date.now()) >= msVentana;
    return {
      confirmada: !requiereConfirmacion,
      tokenCliente: crypto.randomUUID(),
      tokenExpiraEn: inicio,
    };
  }

  /**
   * Reglas anti-abuso que SOLO aplican a la vía pública (el staff creando
   * citas manuales ya tiene contexto real del cliente frente a él — ver
   * Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §3 y §4).
   */
  private async validarReglasAntiAbusoPublicas(db: any, clienteId?: string) {
    if (!clienteId) return;

    const [cliente] = await db.select({ bloqueado: clientes.bloqueado }).from(clientes).where(eq(clientes.id, clienteId));
    if (cliente?.bloqueado) {
      throw new ForbiddenException('No fue posible completar la reserva. Por favor contacta directamente al negocio.');
    }

    const [citaPendiente] = await db
      .select({ id: citas.id })
      .from(citas)
      .where(and(
        eq(citas.clienteId, clienteId),
        eq(citas.estado, 'programada'),
        eq(citas.confirmada, false),
      ))
      .limit(1);

    if (citaPendiente) {
      throw new ConflictException('Ya tienes una reserva pendiente de confirmar. Confírmala o espera a que se libere para agendar otra.');
    }
  }

  /**
   * Crea una nueva cita, manejando idempotencia y concurrencia.
   * `esPublica` activa las reglas anti-abuso (Fase 2.3) que no aplican
   * cuando el staff agenda manualmente.
   */
  async crearCita(data: CreateCitaDto, idempotencyKey: string, esPublica = false) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    if (esPublica) {
      await this.validarReglasAntiAbusoPublicas(db, data.clienteId);
    }

    const duracionMinutos = await this.resolverDuracionMinutos(db, data);
    const resolvedEmpleadoId = await this.resolverEmpleadoId(db, data.empleadoId);
    const { horasAntesConfirmacion, industria } = await this.resolverConfigTenant(db, tenantId);

    if (CitasService.INDUSTRIAS_QUE_EXIGEN_MOTIVO.includes(industria) && !data.notas?.trim()) {
      throw new BadRequestException('Indica el motivo de la visita para continuar.');
    }

    const inicio = new Date(data.inicioEstimado);
    const fin = new Date(inicio.getTime() + duracionMinutos * 60000);
    const camposConfirmacion = this.construirCamposConfirmacion(inicio, horasAntesConfirmacion);

    // 2. Limpieza oportunista de bloqueos temporales expirados (fire and forget)
    db.delete(bloqueosTemporales)
      .where(lte(bloqueosTemporales.expiraEn, new Date()))
      .execute()
      .catch((err: any) => console.error('Error en cleanup de bloqueos:', err));

    // 3. Insertar la cita
    try {
      let [nuevaCita] = await db
        .insert(citas)
        .values({
          tenantId,
          clienteId: data.clienteId,
          empleadoId: resolvedEmpleadoId,
          servicioId: data.servicioId || null,
          comboId: data.comboId || null,
          pacienteId: data.pacienteId,
          notas: data.notas,
          inicioEstimado: inicio,
          finEstimado: fin,
          origen: data.origen,
          idempotencyKey,
          ...camposConfirmacion,
        })
        .onConflictDoNothing({ target: citas.idempotencyKey })
        .returning();

      if (!nuevaCita) {
        // Hubo conflicto de idempotencia, devolvemos la existente
        const [citaExistente] = await db
          .select()
          .from(citas)
          .where(eq(citas.idempotencyKey, idempotencyKey));
        return { cita: citaExistente, isExisting: true };
      }

      this.emitirAgendaActualizada(tenantId, resolvedEmpleadoId, inicio);
      await this.encolarJobsCita(nuevaCita, tenantId, inicio, horasAntesConfirmacion);

      return { cita: nuevaCita, isExisting: false };
    } catch (error: any) {
      const code = error.code || error.cause?.code;

      // Concurrencia: si choca con EXCLUDE constraint (btree_gist)
      if (code === '23P01') {
        throw new ConflictException('Ese horario ya no está disponible.');
      }

      throw error;
    }
  }

  private async encolarJobsCita(nuevaCita: typeof citas.$inferSelect, tenantId: string, inicio: Date, horasAntesConfirmacion: number) {
    const inicioTime = inicio.getTime();
    const now = Date.now();

    const delay24h = inicioTime - now - (24 * 60 * 60 * 1000);
    if (delay24h > 0) {
      await this.citasQueue.add('recordatorio_24h',
        { citaId: nuevaCita.id, tenantId },
        { delay: delay24h, jobId: `recordatorio_${nuevaCita.id}` }
      );
    }

    const delayRetraso = inicioTime - now + (15 * 60 * 1000);
    if (delayRetraso > 0) {
      await this.citasQueue.add('cancelacion_retraso',
        { citaId: nuevaCita.id, tenantId },
        { delay: delayRetraso, jobId: `retraso_${nuevaCita.id}` }
      );
    }

    // Confirmación obligatoria (ver §2 del doc de diseño) — solo si la cita
    // no quedó auto-confirmada por falta de anticipación.
    if (!nuevaCita.confirmada) {
      const deadline = inicioTime - (horasAntesConfirmacion * 60 * 60 * 1000);

      const delaySolicitar = deadline - now;
      if (delaySolicitar > 0) {
        await this.citasQueue.add('solicitar_confirmacion',
          { citaId: nuevaCita.id, tenantId },
          { delay: delaySolicitar, jobId: `confirmacion_${nuevaCita.id}` }
        );
      }

      // Margen de 30 min después del deadline para que el cliente alcance a responder.
      const delayLiberar = deadline + (30 * 60 * 1000) - now;
      if (delayLiberar > 0) {
        await this.citasQueue.add('liberar_si_no_confirmo',
          { citaId: nuevaCita.id, tenantId },
          { delay: delayLiberar, jobId: `liberar_${nuevaCita.id}` }
        );
      }
    }
  }

  /**
   * Citas grupales (cliente + acompañante, ver Plan_Multi_Industria_Fase4_CombosGruposTemplates.md
   * §3): crea 2+ citas en una sola operación transaccional, todas con el mismo grupoReservaId
   * generado acá. Si cualquiera choca con el EXCLUDE constraint, toda la operación revierte —
   * no se permite un grupo a medio crear.
   */
  async crearCitasGrupales(data: CreateCitasGrupalesDto, idempotencyKeyBase: string, esPublica = false) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();
    const grupoReservaId = crypto.randomUUID();

    if (esPublica) {
      const clienteIdsUnicos = [...new Set(data.citas.map((c) => c.clienteId).filter(Boolean))];
      for (const clienteId of clienteIdsUnicos) {
        await this.validarReglasAntiAbusoPublicas(db, clienteId);
      }
    }

    const { horasAntesConfirmacion, industria } = await this.resolverConfigTenant(db, tenantId);

    if (CitasService.INDUSTRIAS_QUE_EXIGEN_MOTIVO.includes(industria) && data.citas.some((c) => !c.notas?.trim())) {
      throw new BadRequestException('Indica el motivo de la visita para cada persona del grupo.');
    }

    db.delete(bloqueosTemporales)
      .where(lte(bloqueosTemporales.expiraEn, new Date()))
      .execute()
      .catch((err: any) => console.error('Error en cleanup de bloqueos:', err));

    const idempotencyKeys = data.citas.map((_, i) => `${idempotencyKeyBase}_${i}`);

    let nuevasCitas: (typeof citas.$inferSelect)[];
    try {
      nuevasCitas = await db.transaction(async (tx: any) => {
        const resultados: (typeof citas.$inferSelect)[] = [];
        for (let i = 0; i < data.citas.length; i++) {
          const citaData = data.citas[i];
          const duracionMinutos = await this.resolverDuracionMinutos(tx, citaData);
          const resolvedEmpleadoId = await this.resolverEmpleadoId(tx, citaData.empleadoId);
          const inicio = new Date(citaData.inicioEstimado);
          const fin = new Date(inicio.getTime() + duracionMinutos * 60000);
          const camposConfirmacion = this.construirCamposConfirmacion(inicio, horasAntesConfirmacion);

          const [nuevaCita] = await tx
            .insert(citas)
            .values({
              tenantId,
              clienteId: citaData.clienteId,
              empleadoId: resolvedEmpleadoId,
              servicioId: citaData.servicioId || null,
              comboId: citaData.comboId || null,
              pacienteId: citaData.pacienteId,
              notas: citaData.notas,
              grupoReservaId,
              inicioEstimado: inicio,
              finEstimado: fin,
              origen: citaData.origen,
              idempotencyKey: idempotencyKeys[i],
              ...camposConfirmacion,
            })
            .returning();

          resultados.push(nuevaCita);
        }
        return resultados;
      });
    } catch (error: any) {
      const code = error.code || error.cause?.code;

      if (code === '23P01') {
        throw new ConflictException('Uno de los horarios del grupo ya no está disponible.');
      }

      if (code === '23505') {
        // Reintento con el mismo idempotencyKeyBase: el grupo ya fue creado antes.
        const existentes = await db.select().from(citas).where(inArray(citas.idempotencyKey, idempotencyKeys));
        if (existentes.length === data.citas.length) {
          return { citas: existentes, grupoReservaId: existentes[0].grupoReservaId, isExisting: true };
        }
      }

      throw error;
    }

    for (const nuevaCita of nuevasCitas) {
      this.emitirAgendaActualizada(tenantId, nuevaCita.empleadoId, new Date(nuevaCita.inicioEstimado));
      await this.encolarJobsCita(nuevaCita, tenantId, new Date(nuevaCita.inicioEstimado), horasAntesConfirmacion);
    }

    return { citas: nuevasCitas, grupoReservaId, isExisting: false };
  }

  /**
   * Bloqueo optimista (3 minutos).
   */
  async bloquearTurno(data: BloquearTurnoDto) {
    // Es public, usamos SECURITY DEFINER para buscar el tenant del empleado
    const result = await this.db.execute(sql`SELECT get_tenant_for_usuario(${data.empleadoId}) as tenant_id`);
    const tenantId = result.rows[0]?.tenant_id as string | undefined;
    if (!tenantId) throw new NotFoundException('Empleado no encontrado o inactivo');

    const expiraEn = new Date(Date.now() + 3 * 60000); // +3 minutos

    // Usamos runInTenantScope para aplicar RLS
    return await runInTenantScope(this.db, tenantId, async (tx) => {
      // Cleanup oportunista
      tx.delete(bloqueosTemporales)
        .where(lte(bloqueosTemporales.expiraEn, new Date()))
        .execute()
        .catch((err: any) => console.error('Error en cleanup de bloqueos:', err));

      try {
        const [bloqueo] = await tx
          .insert(bloqueosTemporales)
          .values({
            tenantId: tenantId,
            empleadoId: data.empleadoId,
            inicio: new Date(data.inicio),
            fin: new Date(data.fin),
            tipo: 'lock_reserva',
            origen: 'sistema',
            notas: data.notas,
            expiraEn,
          })
          .returning();

        this.emitirAgendaActualizada(tenantId, data.empleadoId, new Date(data.inicio));
        return bloqueo;
      } catch (error: any) {
        const code = error.code || error.cause?.code;
        if (code === '23P01') {
          throw new ConflictException('Ese horario ya no está disponible para bloqueo.');
        }
        throw error;
      }
    });
  }

  /**
   * Obtiene las citas de la agenda para una fecha dada, aplicando filtrado por rol y RLS.
   */
  async obtenerCitasAgenda({ user, fechaStr, empleadoId }: { user: any; fechaStr?: string; empleadoId?: string }) {
    const db = TenantContext.getDb();

    // Normalizar fecha (por defecto hoy)
    const targetDate = fechaStr ? new Date(fechaStr + 'T00:00:00') : new Date();
    const inicioDia = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const finDia = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const conditions = [
      gte(citas.inicioEstimado, inicioDia),
      lte(citas.inicioEstimado, finDia),
    ];

    // Regla de Autorización: Si es empleado, filtrar ESTRICTAMENTE por su id
    if (user.rol === 'empleado') {
      conditions.push(eq(citas.empleadoId, user.userId));
    } else if (empleadoId) {
      conditions.push(eq(citas.empleadoId, empleadoId));
    }

    const listaCitas = await db
      .select({
        id: citas.id,
        inicioEstimado: citas.inicioEstimado,
        finEstimado: citas.finEstimado,
        estado: citas.estado,
        origen: citas.origen,
        empleadoId: citas.empleadoId,
        empleadoNombre: usuarios.nombreCompleto,
        clienteId: citas.clienteId,
        clienteNombre: clientes.nombreCompleto,
        clienteTelefono: clientes.telefonoWhatsapp,
        servicioId: citas.servicioId,
        servicioNombre: servicios.nombre,
        servicioPrecio: servicios.precioBase,
        servicioDuracion: servicios.duracionMinutos,
        comboId: citas.comboId,
        comboNombre: combos.nombre,
        comboPrecio: combos.precioTotal,
        pacienteId: citas.pacienteId,
        pacienteNombre: pacientes.nombre,
        grupoReservaId: citas.grupoReservaId,
      })
      .from(citas)
      .leftJoin(usuarios, eq(citas.empleadoId, usuarios.id))
      .leftJoin(clientes, eq(citas.clienteId, clientes.id))
      .leftJoin(servicios, eq(citas.servicioId, servicios.id))
      .leftJoin(combos, eq(citas.comboId, combos.id))
      .leftJoin(pacientes, eq(citas.pacienteId, pacientes.id))
      .where(and(...conditions))
      .orderBy(citas.inicioEstimado);

    return listaCitas;
  }

  /**
   * Cambiar estado de una cita (con strike atómico y autorización estricta).
   */
  async cambiarEstado(citaId: string, nuevoEstado: typeof citas.$inferInsert.estado, user?: any) {
    const db = TenantContext.getDb();

    // 1. Validar propiedad si es un empleado
    if (user && user.rol === 'empleado') {
      const [existente] = await db.select({ empleadoId: citas.empleadoId }).from(citas).where(eq(citas.id, citaId));
      if (!existente) throw new NotFoundException('Cita no encontrada');
      if (existente.empleadoId !== user.userId) {
        throw new ForbiddenException('No tienes permisos para modificar las citas de otro empleado.');
      }
    }

    return await db.transaction(async (tx: any) => {
      // Usar transaction instance directamente, NO tx.query.citas (tipado más seguro)
      const [cita] = await tx
        .update(citas)
        .set({ estado: nuevoEstado })
        .where(eq(citas.id, citaId))
        .returning();

      if (!cita) throw new NotFoundException('Cita no encontrada');

      if (nuevoEstado === 'ausente_strike' && cita.clienteId) {
        // Obtener strikes actuales
        const [cliente] = await tx.select().from(clientes).where(eq(clientes.id, cita.clienteId));
        if (cliente) {
          await tx
            .update(clientes)
            .set({ ausenciasStrikes: cliente.ausenciasStrikes + 1 })
            .where(eq(clientes.id, cita.clienteId));

          // Historial con fecha (ver Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §5) —
          // respalda el contador de arriba, insert-only.
          await tx.insert(inasistencias).values({
            tenantId: cita.tenantId,
            clienteId: cita.clienteId,
            citaId: cita.id,
            fecha: cita.inicioEstimado,
          });
        }
      }

      if (nuevoEstado !== 'programada') {
        await this.citasQueue.remove(`recordatorio_${citaId}`).catch(() => {});
        await this.citasQueue.remove(`retraso_${citaId}`).catch(() => {});
        await this.citasQueue.remove(`confirmacion_${citaId}`).catch(() => {});
        await this.citasQueue.remove(`liberar_${citaId}`).catch(() => {});
      }

      if (nuevoEstado === 'cancelada' || nuevoEstado === 'ausente_strike') {
        this.emitirAgendaActualizada(cita.tenantId, cita.empleadoId, new Date(cita.inicioEstimado));
      }

      return cita;
    });
  }

  /**
   * Confirma una cita vía el token público (WhatsApp o link web de respaldo —
   * ver Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §2). Idempotente: confirmar
   * una cita ya confirmada simplemente la devuelve sin error.
   */
  async confirmarCita(citaId: string, token: string) {
    const result = await this.db.execute(sql`SELECT get_tenant_for_cita(${citaId}) as tenant_id`);
    const tenantId = result.rows[0]?.tenant_id as string | undefined;
    if (!tenantId) throw new NotFoundException('Cita no encontrada');

    return runInTenantScope(this.db, tenantId, async (tx) => {
      const [cita] = await tx.select().from(citas).where(eq(citas.id, citaId));
      if (!cita) throw new NotFoundException('Cita no encontrada');

      if (!token || !cita.tokenCliente || cita.tokenCliente !== token || !cita.tokenExpiraEn || cita.tokenExpiraEn < new Date()) {
        throw new BadRequestException('El enlace de confirmación es inválido o ya expiró.');
      }

      if (cita.confirmada) {
        return cita;
      }

      if (cita.estado !== 'programada') {
        throw new BadRequestException('Esta cita ya no está programada, no se puede confirmar.');
      }

      const [citaConfirmada] = await tx
        .update(citas)
        .set({ confirmada: true })
        .where(eq(citas.id, citaId))
        .returning();

      await this.citasQueue.remove(`liberar_${citaId}`).catch(() => {});

      return citaConfirmada;
    });
  }

  /**
   * Cliente cancela por su cuenta sin strike.
   */
  async cancelarPorCliente(citaId: string) {
    // Es public, usamos SECURITY DEFINER para buscar el tenant de la cita
    const result = await this.db.execute(sql`SELECT get_tenant_for_cita(${citaId}) as tenant_id`);
    const tenantId = result.rows[0]?.tenant_id as string | undefined;
      
    if (!tenantId) throw new NotFoundException('Cita no encontrada');
    
    // Y luego hacemos el update bajo su tenant scope para validar RLS
    return await runInTenantScope(this.db, tenantId, async (tx) => {
      const [citaCancelada] = await tx
        .update(citas)
        .set({ estado: 'cancelada' })
        .where(eq(citas.id, citaId))
        .returning();
        
      if (citaCancelada) {
        await this.citasQueue.remove(`recordatorio_${citaId}`).catch(() => {});
        await this.citasQueue.remove(`retraso_${citaId}`).catch(() => {});
        await this.citasQueue.remove(`confirmacion_${citaId}`).catch(() => {});
        await this.citasQueue.remove(`liberar_${citaId}`).catch(() => {});
        this.emitirAgendaActualizada(citaCancelada.tenantId, citaCancelada.empleadoId, new Date(citaCancelada.inicioEstimado));
      }

      return citaCancelada;
    });
  }
}
