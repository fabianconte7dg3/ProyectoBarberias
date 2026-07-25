import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import { runInTenantScope } from '../database/tenant/tenant.utils';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';

@Injectable()
export class CombosService {
  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>
  ) {}

  async create(dto: CreateComboDto) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    return db.transaction(async (tx: any) => {
      const [nuevoCombo] = await tx.insert(schema.combos).values({
        tenantId,
        nombre: dto.nombre,
        precioTotal: dto.precioTotal.toString(),
        duracionAjustadaMinutos: dto.duracionAjustadaMinutos,
      }).returning();

      await tx.insert(schema.comboServicios).values(
        dto.servicios.map((s, idx) => ({
          tenantId,
          comboId: nuevoCombo.id,
          servicioId: s.servicioId,
          orden: s.orden ?? idx,
          precioAsignado: s.precioAsignado.toString(),
        }))
      );

      return this.findOneInTx(tx, nuevoCombo.id);
    });
  }

  async findAll() {
    const db = TenantContext.getDb();
    const combos = await db.query.combos.findMany({
      where: eq(schema.combos.activo, true),
      orderBy: [asc(schema.combos.nombre)],
      with: { servicios: { with: { servicio: true }, orderBy: [asc(schema.comboServicios.orden)] } },
    });
    return combos;
  }

  async findPublicBySlug(slug: string) {
    const tenantResult = await this.db.execute(sql`SELECT id FROM auth_get_tenant_by_slug(${slug})`);
    const tenantId = tenantResult.rows[0]?.id as string;
    if (!tenantId) throw new NotFoundException('Negocio no encontrado');

    return runInTenantScope(this.db, tenantId, async (tx) => {
      return tx.query.combos.findMany({
        where: eq(schema.combos.activo, true),
        orderBy: [asc(schema.combos.nombre)],
        with: { servicios: { with: { servicio: true }, orderBy: [asc(schema.comboServicios.orden)] } },
      });
    });
  }

  async findOne(id: string) {
    const db = TenantContext.getDb();
    return this.findOneInTx(db, id);
  }

  private async findOneInTx(db: any, id: string) {
    const combo = await db.query.combos.findFirst({
      where: and(eq(schema.combos.id, id), eq(schema.combos.activo, true)),
      with: { servicios: { with: { servicio: true }, orderBy: [asc(schema.comboServicios.orden)] } },
    });

    if (!combo) {
      throw new NotFoundException(`Combo con ID ${id} no encontrado.`);
    }

    return combo;
  }

  async update(id: string, dto: UpdateComboDto) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    await this.findOne(id);

    return db.transaction(async (tx: any) => {
      await tx.update(schema.combos).set({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.precioTotal !== undefined && { precioTotal: dto.precioTotal.toString() }),
        ...(dto.duracionAjustadaMinutos !== undefined && { duracionAjustadaMinutos: dto.duracionAjustadaMinutos }),
      }).where(eq(schema.combos.id, id));

      if (dto.servicios) {
        // Reemplazo en bloque: se borran las líneas anteriores y se re-insertan las nuevas.
        await tx.delete(schema.comboServicios).where(eq(schema.comboServicios.comboId, id));
        await tx.insert(schema.comboServicios).values(
          dto.servicios.map((s, idx) => ({
            tenantId,
            comboId: id,
            servicioId: s.servicioId,
            orden: s.orden ?? idx,
            precioAsignado: s.precioAsignado.toString(),
          }))
        );
      }

      return this.findOneInTx(tx, id);
    });
  }

  async softDelete(id: string) {
    const db = TenantContext.getDb();

    await this.findOne(id);

    await db.update(schema.combos)
      .set({ activo: false })
      .where(eq(schema.combos.id, id));

    return { message: 'Combo eliminado correctamente.' };
  }
}
