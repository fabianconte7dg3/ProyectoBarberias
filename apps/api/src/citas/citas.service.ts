import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { eq, and, lte, gte, or, between, ne, inArray, desc, sql } from 'drizzle-orm';
import { citas, bloqueosTemporales, servicios, combos, clientes, usuarios, pacientes } from '../database/schema';
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

@Injectable()
export class CitasService {
  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
    @InjectQueue('CITAS_QUEUE') private readonly citasQueue: Queue,
    private readonly combosService: CombosService,
  ) {}

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
   * Crea una nueva cita, manejando idempotencia y concurrencia.
   */
  async crearCita(data: CreateCitaDto, idempotencyKey: string) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    const duracionMinutos = await this.resolverDuracionMinutos(db, data);
    const resolvedEmpleadoId = await this.resolverEmpleadoId(db, data.empleadoId);

    const inicio = new Date(data.inicioEstimado);
    const fin = new Date(inicio.getTime() + duracionMinutos * 60000);

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
          inicioEstimado: inicio,
          finEstimado: fin,
          origen: data.origen,
          idempotencyKey,
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

      await this.encolarJobsCita(nuevaCita, tenantId, inicio);

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

  private async encolarJobsCita(nuevaCita: typeof citas.$inferSelect, tenantId: string, inicio: Date) {
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
  }

  /**
   * Citas grupales (cliente + acompañante, ver Plan_Multi_Industria_Fase4_CombosGruposTemplates.md
   * §3): crea 2+ citas en una sola operación transaccional, todas con el mismo grupoReservaId
   * generado acá. Si cualquiera choca con el EXCLUDE constraint, toda la operación revierte —
   * no se permite un grupo a medio crear.
   */
  async crearCitasGrupales(data: CreateCitasGrupalesDto, idempotencyKeyBase: string) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();
    const grupoReservaId = crypto.randomUUID();

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

          const [nuevaCita] = await tx
            .insert(citas)
            .values({
              tenantId,
              clienteId: citaData.clienteId,
              empleadoId: resolvedEmpleadoId,
              servicioId: citaData.servicioId || null,
              comboId: citaData.comboId || null,
              pacienteId: citaData.pacienteId,
              grupoReservaId,
              inicioEstimado: inicio,
              finEstimado: fin,
              origen: citaData.origen,
              idempotencyKey: idempotencyKeys[i],
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
      await this.encolarJobsCita(nuevaCita, tenantId, new Date(nuevaCita.inicioEstimado));
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
        }
      }
      
      if (nuevoEstado !== 'programada') {
        await this.citasQueue.remove(`recordatorio_${citaId}`).catch(() => {});
        await this.citasQueue.remove(`retraso_${citaId}`).catch(() => {});
      }

      return cita;
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
      }
        
      return citaCancelada;
    });
  }
}
