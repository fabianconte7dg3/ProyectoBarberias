import { Injectable, ConflictException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { eq, and, lte, gte, or, between, ne, desc, sql } from 'drizzle-orm';
import { citas, bloqueosTemporales, servicios, clientes, usuarios } from '../database/schema';
import { TenantContext } from '../database/tenant/tenant-context';
import { runInTenantScope } from '../database/tenant/tenant.utils';
import { CreateCitaDto } from './dto/create-cita.dto';
import { BloquearTurnoDto } from './dto/bloquear-turno.dto';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CitasService {
  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
    @InjectQueue('CITAS_QUEUE') private readonly citasQueue: Queue
  ) {}

  /**
   * Crea una nueva cita, manejando idempotencia y concurrencia.
   */
  async crearCita(data: CreateCitaDto, idempotencyKey: string) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    // 1. Obtener duración del servicio para calcular finEstimado
    const [servicio] = await db
      .select()
      .from(servicios)
      .where(eq(servicios.id, data.servicioId));

    if (!servicio) throw new NotFoundException('Servicio no encontrado');

    const inicio = new Date(data.inicioEstimado);
    const fin = new Date(inicio.getTime() + servicio.duracionMinutos * 60000);

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
          barberoId: data.barberoId,
          servicioId: data.servicioId,
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

      // Encolar trabajos asíncronos para Hito 6
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

  /**
   * Bloqueo optimista (3 minutos).
   */
  async bloquearTurno(data: BloquearTurnoDto) {
    // Es public, usamos SECURITY DEFINER para buscar el tenant del barbero
    const result = await this.db.execute(sql`SELECT get_tenant_for_usuario(${data.barberoId}) as tenant_id`);
    const tenantId = result.rows[0]?.tenant_id as string | undefined;
    if (!tenantId) throw new NotFoundException('Barbero no encontrado o inactivo');

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
            barberoId: data.barberoId,
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
  async obtenerCitasAgenda({ user, fechaStr, barberoId }: { user: any; fechaStr?: string; barberoId?: string }) {
    const db = TenantContext.getDb();

    // Normalizar fecha (por defecto hoy)
    const targetDate = fechaStr ? new Date(fechaStr + 'T00:00:00') : new Date();
    const inicioDia = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const finDia = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const conditions = [
      gte(citas.inicioEstimado, inicioDia),
      lte(citas.inicioEstimado, finDia),
    ];

    // Regla de Autorización: Si es barbero, filtrar ESTRICTAMENTE por su id
    if (user.rol === 'barbero') {
      conditions.push(eq(citas.barberoId, user.userId));
    } else if (barberoId) {
      conditions.push(eq(citas.barberoId, barberoId));
    }

    const listaCitas = await db
      .select({
        id: citas.id,
        inicioEstimado: citas.inicioEstimado,
        finEstimado: citas.finEstimado,
        estado: citas.estado,
        origen: citas.origen,
        barberoId: citas.barberoId,
        barberoNombre: usuarios.nombreCompleto,
        clienteId: citas.clienteId,
        clienteNombre: clientes.nombreCompleto,
        clienteTelefono: clientes.telefonoWhatsapp,
        servicioId: citas.servicioId,
        servicioNombre: servicios.nombre,
        servicioPrecio: servicios.precioBase,
        servicioDuracion: servicios.duracionMinutos,
      })
      .from(citas)
      .leftJoin(usuarios, eq(citas.barberoId, usuarios.id))
      .leftJoin(clientes, eq(citas.clienteId, clientes.id))
      .leftJoin(servicios, eq(citas.servicioId, servicios.id))
      .where(and(...conditions))
      .orderBy(citas.inicioEstimado);

    return listaCitas;
  }

  /**
   * Cambiar estado de una cita (con strike atómico y autorización estricta).
   */
  async cambiarEstado(citaId: string, nuevoEstado: typeof citas.$inferInsert.estado, user?: any) {
    const db = TenantContext.getDb();

    // 1. Validar propiedad si es un barbero
    if (user && user.rol === 'barbero') {
      const [existente] = await db.select({ barberoId: citas.barberoId }).from(citas).where(eq(citas.id, citaId));
      if (!existente) throw new NotFoundException('Cita no encontrada');
      if (existente.barberoId !== user.userId) {
        throw new ForbiddenException('No tienes permisos para modificar las citas de otro barbero.');
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
