import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { citas } from '../database/schema';
import { TenantContext } from '../database/tenant/tenant-context';

/**
 * Ejemplo de service usando el patrón correcto: NUNCA se inyecta el pool
 * global de Drizzle aquí. Cada método pide la transacción con RLS ya
 * aplicado a través de TenantContext, garantizada por el TenantInterceptor.
 */
@Injectable()
export class CitasService {
  async listarCitasDeHoy() {
    const db = TenantContext.getDb();
    // No hace falta (ni se debe) agregar `WHERE tenant_id = ...` a mano:
    // RLS lo aplica en el motor de Postgres automáticamente.
    return db.select().from(citas);
  }

  async crearCita(data: typeof citas.$inferInsert) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    // Se incluye tenant_id explícitamente al insertar: la política
    // WITH CHECK rechazaría el insert si no coincide con el de la sesión,
    // así que este valor DEBE venir del contexto, nunca del body del request.
    const [nuevaCita] = await db
      .insert(citas)
      .values({ ...data, tenantId })
      .returning();

    return nuevaCita;
  }

  async cancelarCita(citaId: string) {
    const db = TenantContext.getDb();
    // Aunque alguien manipule el citaId para apuntar a otro tenant, RLS
    // hace que este UPDATE simplemente afecte 0 filas — no hay fuga posible.
    return db
      .update(citas)
      .set({ estado: 'cancelada' })
      .where(eq(citas.id, citaId))
      .returning();
  }
}
