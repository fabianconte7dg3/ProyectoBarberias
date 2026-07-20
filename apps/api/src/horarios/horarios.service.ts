import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import * as schema from '../database/schema';
import { eq, and, gt, or, isNull, asc, lte } from 'drizzle-orm';
import { UpsertHorarioSemanalDto, DiaHorarioDto } from './dto/upsert-horario-semanal.dto';
import { CreateBloqueoDto } from './dto/create-bloqueo.dto';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class HorariosService {
  constructor(@Inject(DRIZZLE_POOL_DB) private readonly globalDb: NodePgDatabase<typeof schema>) {}
  
  // Helpers para validación de tiempo "HH:mm"
  private parseTime(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m; // minutos desde medianoche
  }

  private validateDia(dia: DiaHorarioDto) {
    const inicio = this.parseTime(dia.horaInicio);
    const fin = this.parseTime(dia.horaFin);
    
    if (inicio >= fin) {
      throw new BadRequestException(`Para el día ${dia.diaSemana}, la hora de inicio (${dia.horaInicio}) debe ser anterior a la hora de fin (${dia.horaFin}).`);
    }

    if (dia.horaAlmuerzoInicio && dia.horaAlmuerzoFin) {
      const almInicio = this.parseTime(dia.horaAlmuerzoInicio);
      const almFin = this.parseTime(dia.horaAlmuerzoFin);

      if (almInicio >= almFin) {
        throw new BadRequestException(`Para el día ${dia.diaSemana}, el inicio del almuerzo debe ser anterior a su fin.`);
      }

      if (almInicio < inicio || almFin > fin) {
        throw new BadRequestException(`Para el día ${dia.diaSemana}, el horario de almuerzo debe estar contenido dentro de la jornada laboral.`);
      }
    } else if (dia.horaAlmuerzoInicio || dia.horaAlmuerzoFin) {
      throw new BadRequestException(`Para el día ${dia.diaSemana}, debe especificar inicio y fin de almuerzo, o ninguno de los dos.`);
    }
  }

  async setHorarioSemanal(barberoId: string, dto: UpsertHorarioSemanalDto) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    // 1. Validar reglas de negocio para todos los días
    dto.dias.forEach(dia => this.validateDia(dia));

    // 2. Transacción para reemplazar horarios existentes
    return await db.transaction(async (tx: any) => {
      // Eliminar configuración anterior
      await tx.delete(schema.horarios).where(
        and(
          eq(schema.horarios.tenantId, tenantId),
          eq(schema.horarios.barberoId, barberoId)
        )
      );

      // Insertar nuevos días
      if (dto.dias.length > 0) {
        const valores = dto.dias.map(d => ({
          tenantId,
          barberoId,
          diaSemana: d.diaSemana,
          horaInicio: d.horaInicio,
          horaFin: d.horaFin,
          horaAlmuerzoInicio: d.horaAlmuerzoInicio || null,
          horaAlmuerzoFin: d.horaAlmuerzoFin || null,
          activo: true,
        }));
        await tx.insert(schema.horarios).values(valores);
      }

      return { message: 'Horario semanal actualizado correctamente.' };
    });
  }

  async getHorarioSemanal(barberoId: string) {
    const db = TenantContext.getDb();
    return db.query.horarios.findMany({
      where: and(
        eq(schema.horarios.barberoId, barberoId),
        eq(schema.horarios.activo, true)
      ),
    });
  }

  async createBloqueo(dto: CreateBloqueoDto) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    const inicio = new Date(dto.inicio);
    const fin = new Date(dto.fin);

    if (inicio >= fin) {
      throw new BadRequestException('La fecha/hora de inicio del bloqueo debe ser anterior a la de fin.');
    }

    const [bloqueo] = await db.insert(schema.bloqueosTemporales).values({
      tenantId,
      barberoId: dto.barberoId,
      inicio,
      fin,
      tipo: dto.tipo,
      origen: 'admin', // En este hito, todo es originado por admin/sistema
      notas: dto.motivo,
      expiraEn: fin, // El bloqueo expira automáticamente cuando llega su fin
    }).returning();

    return bloqueo;
  }

  async getBloqueosVigentes(barberoId: string) {
    const db = TenantContext.getDb();
    const ahora = new Date();

    return db.query.bloqueosTemporales.findMany({
      where: and(
        eq(schema.bloqueosTemporales.barberoId, barberoId),
        or(
          gt(schema.bloqueosTemporales.expiraEn, ahora),
          isNull(schema.bloqueosTemporales.expiraEn)
        )
      ),
      orderBy: [asc(schema.bloqueosTemporales.inicio)],
    });
  }

  async getDisponibilidad(barberoId: string, fechaYYYYMMDD: string) {
    // Endpoint @Public(), usamos this.globalDb
    const db = this.globalDb;
    const fechaDate = new Date(`${fechaYYYYMMDD}T00:00:00Z`); // UTC start of day
    
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaString = diasSemana[fechaDate.getUTCDay()] as typeof schema.diaSemanaEnum.enumValues[number];

    const [horario] = await db.query.horarios.findMany({
      where: and(
        eq(schema.horarios.barberoId, barberoId),
        eq(schema.horarios.diaSemana, diaString),
        eq(schema.horarios.activo, true)
      ),
    });

    if (!horario) {
      return { disponible: false, jornada: null, ocupados: [], almuerzo: null };
    }

    // Buscar citas del día
    const inicioDia = new Date(fechaDate);
    const finDia = new Date(fechaDate);
    finDia.setUTCDate(finDia.getUTCDate() + 1);

    const citasHoy = await db.query.citas.findMany({
      where: and(
        eq(schema.citas.barberoId, barberoId),
        gt(schema.citas.finEstimado, inicioDia),
        lte(schema.citas.inicioEstimado, finDia),
        or(
          eq(schema.citas.estado, 'programada'),
          eq(schema.citas.estado, 'en_curso'),
          eq(schema.citas.estado, 'completada'),
          eq(schema.citas.estado, 'revision_manual')
        )
      ),
    });

    const bloqueosHoy = await db.query.bloqueosTemporales.findMany({
      where: and(
        eq(schema.bloqueosTemporales.barberoId, barberoId),
        gt(schema.bloqueosTemporales.fin, inicioDia),
        lte(schema.bloqueosTemporales.inicio, finDia),
        or(
          gt(schema.bloqueosTemporales.expiraEn, new Date()),
          isNull(schema.bloqueosTemporales.expiraEn)
        )
      ),
    });

    // Calcular máximo retraso acumulado del día
    let maxRetrasoMinutos = 0;
    for (const c of citasHoy) {
      if (c.inicioReal && c.inicioEstimado) {
        const diffMs = c.inicioReal.getTime() - c.inicioEstimado.getTime();
        if (diffMs > 0) {
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins > maxRetrasoMinutos) {
            maxRetrasoMinutos = diffMins;
          }
        }
      }
    }

    // Calcular auto-almuerzo dinámico
    let almuerzoCalculado = null;
    if (horario.horaAlmuerzoInicio && horario.horaAlmuerzoFin) {
      const almInicioMins = this.parseTime(horario.horaAlmuerzoInicio) + maxRetrasoMinutos;
      const jornadaFinMins = this.parseTime(horario.horaFin);
      const duracionOriginalMins = this.parseTime(horario.horaAlmuerzoFin) - this.parseTime(horario.horaAlmuerzoInicio);
      
      let almFinMins = almInicioMins + duracionOriginalMins;
      
      // Regla de compresión contra horaFin
      if (almFinMins > jornadaFinMins) {
        almFinMins = jornadaFinMins;
      }
      
      if (almInicioMins < jornadaFinMins && almFinMins > almInicioMins) {
        almuerzoCalculado = {
          inicioMinutos: almInicioMins,
          finMinutos: almFinMins,
          strInicio: `${Math.floor(almInicioMins/60).toString().padStart(2,'0')}:${(almInicioMins%60).toString().padStart(2,'0')}`,
          strFin: `${Math.floor(almFinMins/60).toString().padStart(2,'0')}:${(almFinMins%60).toString().padStart(2,'0')}`,
        };
      }
    }

    // Formatear bloques ocupados para el frontend
    const ocupados = [
      ...citasHoy.map((c: any) => ({ tipo: 'cita', id: c.id, inicio: c.inicioEstimado, fin: c.finEstimado })),
      ...bloqueosHoy.map((b: any) => ({ tipo: 'bloqueo', id: b.id, inicio: b.inicio, fin: b.fin }))
    ];

    return {
      disponible: true,
      jornada: { inicio: horario.horaInicio, fin: horario.horaFin },
      retrasoActualMinutos: maxRetrasoMinutos,
      almuerzo: almuerzoCalculado,
      ocupados,
    };
  }
}
