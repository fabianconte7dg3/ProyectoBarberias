import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import { productos } from '../database/schema';
import { eq, and, sql, asc } from 'drizzle-orm';
import { CreateProductoDto, UpdateProductoDto } from './dto/producto.dto';

@Injectable()
export class ProductosService {
  async create(dto: CreateProductoDto) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    const [nuevo] = await db
      .insert(productos)
      .values({
        tenantId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        precioVenta: dto.precioVenta.toFixed(2),
        costoCompra: dto.costoCompra.toFixed(2),
        stockActual: dto.stockActual,
        stockMinimo: dto.stockMinimo ?? 2,
      })
      .returning();

    return nuevo;
  }

  async findAll(userRole?: string) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    const result = await db.query.productos.findMany({
      where: eq(productos.tenantId, tenantId),
      orderBy: [asc(productos.nombre)],
    });

    return result.map((p: any) => {
      const item: any = {
        ...p,
        precioVenta: Number(p.precioVenta),
        costoCompra: Number(p.costoCompra),
      };
      if (userRole !== 'admin') {
        delete item.costoCompra;
      }
      return item;
    });
  }

  async findOne(id: string, userRole?: string) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    const p = await db.query.productos.findFirst({
      where: and(eq(productos.tenantId, tenantId), eq(productos.id, id)),
    });

    if (!p) {
      throw new NotFoundException('Producto no encontrado');
    }

    const item: any = {
      ...p,
      precioVenta: Number(p.precioVenta),
      costoCompra: Number(p.costoCompra),
    };

    if (userRole !== 'admin') {
      delete item.costoCompra;
    }

    return item;
  }

  async update(id: string, dto: UpdateProductoDto) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    await this.findOne(id, 'admin');

    const updateData: any = {};
    if (dto.nombre !== undefined) updateData.nombre = dto.nombre;
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion;
    if (dto.precioVenta !== undefined) updateData.precioVenta = dto.precioVenta.toFixed(2);
    if (dto.costoCompra !== undefined) updateData.costoCompra = dto.costoCompra.toFixed(2);
    if (dto.stockActual !== undefined) updateData.stockActual = dto.stockActual;
    if (dto.stockMinimo !== undefined) updateData.stockMinimo = dto.stockMinimo;
    if (dto.activo !== undefined) updateData.activo = dto.activo;

    const [actualizado] = await db
      .update(productos)
      .set(updateData)
      .where(and(eq(productos.tenantId, tenantId), eq(productos.id, id)))
      .returning();

    return actualizado;
  }

  async descontarStockAtomico(productoId: string, cantidad: number, txClient?: any) {
    const db = txClient || TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    const res = await db.execute(sql`
      UPDATE productos
      SET stock_actual = stock_actual - ${cantidad}
      WHERE id = ${productoId}
        AND tenant_id = ${tenantId}
        AND stock_actual >= ${cantidad}
      RETURNING id, nombre, precio_venta, stock_actual;
    `);

    const updatedRows = res.rows || res;
    if (!updatedRows || updatedRows.length === 0) {
      throw new BadRequestException(`Stock insuficiente o producto inactivo/inexistente (ID: ${productoId}).`);
    }

    return updatedRows[0];
  }
}
