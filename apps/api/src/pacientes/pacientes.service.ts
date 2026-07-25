import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import * as schema from '../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';

@Injectable()
export class PacientesService {
  async create(dto: CreatePacienteDto) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    const [nuevoPaciente] = await db.insert(schema.pacientes).values({
      tenantId,
      clienteId: dto.clienteId,
      nombre: dto.nombre,
      camposPersonalizados: dto.camposPersonalizados ?? {},
    }).returning();

    return nuevoPaciente;
  }

  async findAllByCliente(clienteId: string) {
    const db = TenantContext.getDb();

    return db.query.pacientes.findMany({
      where: and(eq(schema.pacientes.clienteId, clienteId), eq(schema.pacientes.activo, true)),
      orderBy: [desc(schema.pacientes.createdAt)],
    });
  }

  async findOne(id: string) {
    const db = TenantContext.getDb();
    const paciente = await db.query.pacientes.findFirst({
      where: eq(schema.pacientes.id, id),
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${id} no encontrado.`);
    }

    return paciente;
  }

  async update(id: string, dto: UpdatePacienteDto) {
    const db = TenantContext.getDb();

    await this.findOne(id);

    const [pacienteActualizado] = await db.update(schema.pacientes).set({
      ...(dto.nombre !== undefined && { nombre: dto.nombre }),
      ...(dto.camposPersonalizados !== undefined && { camposPersonalizados: dto.camposPersonalizados }),
      ...(dto.activo !== undefined && { activo: dto.activo }),
    })
    .where(eq(schema.pacientes.id, id))
    .returning();

    return pacienteActualizado;
  }
}
