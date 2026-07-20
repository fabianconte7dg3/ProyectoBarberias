import { Injectable, Logger, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import { runInTenantScope } from '../database/tenant/tenant.utils';
import { transacciones } from '../database/schema';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class DgiService {
  private readonly logger = new Logger(DgiService.name);

  constructor(@Inject(DRIZZLE_POOL_DB) private readonly globalDb: NodePgDatabase<typeof schema>) {}

  /**
   * Simula la emisión de una factura electrónica ante la DGI.
   * Al ser asíncrono, no bloquea el flujo de cobro principal.
   */
  async emitirFacturaAsync(
    tenantId: string,
    transaccionId: string,
    monto: string,
    rucCliente?: string | null,
    nombreCliente?: string | null
  ): Promise<void> {
    this.logger.log(`[DGI] Emitiendo factura para tenant ${tenantId}, Tx: ${transaccionId}, Monto: ${monto}`);

    // Simulamos retardo de red
    setTimeout(async () => {
      try {
        await runInTenantScope(this.globalDb, tenantId, async (tx) => {
          const numeroFacturaDgi = `DGI-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
          
          await tx.update(transacciones)
            .set({ 
              estadoDgi: 'emitida',
              numeroFacturaDgi
            })
            .where(eq(transacciones.id, transaccionId));
            
          this.logger.log(`[DGI] Factura emitida exitosamente para Tx: ${transaccionId}. Factura: ${numeroFacturaDgi}`);
        });
      } catch (error) {
        this.logger.error(`[DGI] Error emitiendo factura para Tx: ${transaccionId}`, error);
      }
    }, 2000);
  }
}
