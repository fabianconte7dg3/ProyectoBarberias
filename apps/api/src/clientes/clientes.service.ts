import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import * as schema from '../database/schema';
import { eq, or, ilike, asc } from 'drizzle-orm';
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
        orderBy: [asc(schema.clientes.nombreCompleto)],
      });
    }

    return db.query.clientes.findMany({
      orderBy: [asc(schema.clientes.nombreCompleto)],
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

  async update(id: string, dto: UpdateClienteDto) {
    const db = TenantContext.getDb();
    
    await this.findOne(id);

    const [clienteActualizado] = await db.update(schema.clientes).set({
      ...(dto.nombreCompleto !== undefined && { nombreCompleto: dto.nombreCompleto }),
      ...(dto.notasPreferencia !== undefined && { notasPreferencia: dto.notasPreferencia }),
      ...(dto.barberoFrecuenteId !== undefined && { barberoFrecuenteId: dto.barberoFrecuenteId }),
      ...(dto.bloqueado !== undefined && { bloqueado: dto.bloqueado }),
    })
    .where(eq(schema.clientes.id, id))
    .returning();

    return clienteActualizado;
  }
}
