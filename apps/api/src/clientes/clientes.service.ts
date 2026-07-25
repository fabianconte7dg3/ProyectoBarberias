import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import * as schema from '../database/schema';
import { eq, or, ilike, asc, desc } from 'drizzle-orm';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  async create(dto: CreateClienteDto) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    try {
      const [nuevoCliente] = await db.insert(schema.clientes).values({
        tenantId,
        telefonoWhatsapp: dto.telefonoWhatsapp,
        nombreCompleto: dto.nombreCompleto,
        notasPreferencia: dto.notasPreferencia,
      }).returning();

      return nuevoCliente;
    } catch (error: any) {
      if (error.code === '23505' || error.cause?.code === '23505') {
        throw new ConflictException(`Ya existe un cliente con el teléfono ${dto.telefonoWhatsapp}.`);
      }
      throw error;
    }
  }

  async findAll(q?: string) {
    const db = TenantContext.getDb();
    
    if (q) {
      return db.query.clientes.findMany({
        where: or(
          ilike(schema.clientes.nombreCompleto, `%${q}%`),
          ilike(schema.clientes.telefonoWhatsapp, `%${q}%`)
        ),
        orderBy: [desc(schema.clientes.createdAt)],
      });
    }

    return db.query.clientes.findMany({
      orderBy: [desc(schema.clientes.createdAt)],
    });
  }

  async findOne(id: string) {
    const db = TenantContext.getDb();
    const cliente = await db.query.clientes.findFirst({
      where: eq(schema.clientes.id, id),
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado.`);
    }

    return cliente;
  }

  /**
   * Fechas de inasistencia del cliente (ver Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §5)
   * — respalda el badge de ausenciasStrikes con el detalle real, no solo el contador.
   */
  async obtenerInasistencias(id: string) {
    await this.findOne(id);
    const db = TenantContext.getDb();

    return db.query.inasistencias.findMany({
      where: eq(schema.inasistencias.clienteId, id),
      orderBy: [desc(schema.inasistencias.fecha)],
    });
  }

  async update(id: string, dto: UpdateClienteDto) {
    const db = TenantContext.getDb();
    
    await this.findOne(id);

    const [clienteActualizado] = await db.update(schema.clientes).set({
      ...(dto.nombreCompleto !== undefined && { nombreCompleto: dto.nombreCompleto }),
      ...(dto.emailFacturacion !== undefined && { emailFacturacion: dto.emailFacturacion }),
      ...(dto.notasPreferencia !== undefined && { notasPreferencia: dto.notasPreferencia }),
      ...(dto.empleadoFrecuenteId !== undefined && { empleadoFrecuenteId: dto.empleadoFrecuenteId }),
      ...(dto.bloqueado !== undefined && { bloqueado: dto.bloqueado }),
      ...(dto.aceptaMarketing !== undefined && { aceptaMarketing: dto.aceptaMarketing }),
    })
    .where(eq(schema.clientes.id, id))
    .returning();

    return clienteActualizado;
  }
}
