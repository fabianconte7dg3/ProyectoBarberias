import { Injectable, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { eq, and, lte, or } from 'drizzle-orm';
import { citas, bloqueosTemporales, servicios, clientes, usuarios } from '../database/schema';
import { TenantContext } from '../database/tenant/tenant-context';
import { CreateCitaDto } from './dto/create-cita.dto';
import { BloquearTurnoDto } from './dto/bloquear-turno.dto';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';

@Injectable()
export class CitasService {
  constructor(@Inject(DRIZZLE_POOL_DB) private readonly globalDb: NodePgDatabase<typeof schema>) {}
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
        return citaExistente;
      }

      return nuevaCita;
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
    // Es public, no hay TenantContext, usamos globalDb
    
    // Cleanup oportunista
    this.globalDb.delete(bloqueosTemporales)
      .where(lte(bloqueosTemporales.expiraEn, new Date()))
      .execute()
      .catch((err: any) => console.error('Error en cleanup de bloqueos:', err));

    const expiraEn = new Date(Date.now() + 3 * 60000); // +3 minutos

    try {
      // Deducir tenantId del barbero
      const [barbero] = await this.globalDb.select().from(usuarios).where(eq(usuarios.id, data.barberoId));
      if (!barbero) throw new NotFoundException('Barbero no encontrado');

      const [bloqueo] = await this.globalDb
        .insert(bloqueosTemporales)
        .values({
          tenantId: barbero.tenantId,
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
  }

  /**
   * Cambiar estado de una cita (con strike atómico).
   */
  async cambiarEstado(citaId: string, nuevoEstado: typeof citas.$inferInsert.estado) {
    const db = TenantContext.getDb();

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

      return cita;
    });
  }

  /**
   * Cliente cancela por su cuenta sin strike.
   */
  async cancelarPorCliente(citaId: string) {
    // Es public, usamos globalDb
    const [cita] = await this.globalDb
      .update(citas)
      .set({ estado: 'cancelada' })
      .where(eq(citas.id, citaId))
      .returning();
      
    if (!cita) throw new NotFoundException('Cita no encontrada');
    return cita;
  }
}
