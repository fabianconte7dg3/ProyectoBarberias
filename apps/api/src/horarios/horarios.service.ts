import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import * as schema from '../database/schema';
import { eq, and, gt, or, isNull, asc } from 'drizzle-orm';
import { UpsertHorarioSemanalDto, DiaHorarioDto } from './dto/upsert-horario-semanal.dto';
import { CreateBloqueoDto } from './dto/create-bloqueo.dto';

@Injectable()
export class HorariosService {
  
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
}
