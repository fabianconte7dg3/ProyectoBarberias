import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import * as schema from '../database/schema';
import { eq, and, asc } from 'drizzle-orm';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';

@Injectable()
export class ServiciosService {
  async create(dto: CreateServicioDto) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    const [nuevoServicio] = await db.insert(schema.servicios).values({
      tenantId,
      nombre: dto.nombre,
      duracionMinutos: dto.duracionMinutos,
      precioBase: dto.precioBase.toString(),
    }).returning();

    return nuevoServicio;
  }

  async findAll() {
    const db = TenantContext.getDb();
    return db.query.servicios.findMany({
      where: eq(schema.servicios.activo, true),
      orderBy: [asc(schema.servicios.nombre)],
    });
  }

  async findOne(id: string) {
    const db = TenantContext.getDb();
    const servicio = await db.query.servicios.findFirst({
      where: and(eq(schema.servicios.id, id), eq(schema.servicios.activo, true)),
    });

    if (!servicio) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado.`);
    }

    return servicio;
  }

  async update(id: string, dto: UpdateServicioDto) {
    const db = TenantContext.getDb();
    
    // Validar que exista y esté activo
    await this.findOne(id);

    const [servicioActualizado] = await db.update(schema.servicios).set({
      ...(dto.nombre && { nombre: dto.nombre }),
      ...(dto.duracionMinutos !== undefined && { duracionMinutos: dto.duracionMinutos }),
      ...(dto.precioBase !== undefined && { precioBase: dto.precioBase.toString() }),
    })
    .where(eq(schema.servicios.id, id))
    .returning();

    return servicioActualizado;
  }

  async softDelete(id: string) {
    const db = TenantContext.getDb();
    
    await this.findOne(id);

    await db.update(schema.servicios)
      .set({ activo: false })
      .where(eq(schema.servicios.id, id));

    return { message: 'Servicio eliminado correctamente.' };
  }
}
