import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import * as schema from '../database/schema';
import { eq, desc } from 'drizzle-orm';
import { CreateNotaClinicaDto } from './dto/create-nota-clinica.dto';

@Injectable()
export class NotasClinicasService {
  /**
   * El autor (empleadoId) siempre se deriva del usuario autenticado, nunca del
   * DTO del cliente — es la identidad que luego decide quién puede leer el
   * contenido completo (ver findFullByCita).
   */
  async create(dto: CreateNotaClinicaDto, user: any) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    const [nuevaNota] = await db.insert(schema.notasClinicas).values({
      tenantId,
      citaId: dto.citaId,
      pacienteId: dto.pacienteId,
      empleadoId: user.userId,
      diagnostico: dto.diagnostico,
      tratamiento: dto.tratamiento,
      proximaRevisionEn: dto.proximaRevisionEn,
    }).returning();

    return nuevaNota;
  }

  /**
   * Contenido clínico completo — solo visible para el autor de la nota.
   * Cualquier otro usuario (incluido admin) recibe 403: el admin usa
   * findMetadataByPaciente() en su lugar (ver diseño en
   * docs/02-arquitectura-y-db/Plan_Multi_Industria_Fase3_DatosPorVertical.md §4).
   */
  async findFullByCita(citaId: string, user: any) {
    const db = TenantContext.getDb();
    const nota = await db.query.notasClinicas.findFirst({
      where: eq(schema.notasClinicas.citaId, citaId),
    });

    if (!nota) {
      throw new NotFoundException('No existe una nota clínica para esta cita.');
    }

    if (nota.empleadoId !== user.userId) {
      throw new ForbiddenException('Solo el profesional que atendió esta cita puede ver el contenido clínico.');
    }

    return nota;
  }

  /**
   * Vista de admin: metadata de auditoría (existe, cuándo, quién la escribió),
   * nunca diagnóstico/tratamiento.
   */
  async findMetadataByPaciente(pacienteId: string) {
    const db = TenantContext.getDb();

    const notas = await db
      .select({
        id: schema.notasClinicas.id,
        citaId: schema.notasClinicas.citaId,
        empleadoId: schema.notasClinicas.empleadoId,
        empleadoNombre: schema.usuarios.nombreCompleto,
        proximaRevisionEn: schema.notasClinicas.proximaRevisionEn,
        createdAt: schema.notasClinicas.createdAt,
      })
      .from(schema.notasClinicas)
      .leftJoin(schema.usuarios, eq(schema.notasClinicas.empleadoId, schema.usuarios.id))
      .where(eq(schema.notasClinicas.pacienteId, pacienteId))
      .orderBy(desc(schema.notasClinicas.createdAt));

    return notas;
  }
}
