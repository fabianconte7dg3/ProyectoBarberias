import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { sql } from 'drizzle-orm';

@Processor('CANARY_QUEUE')
@Injectable()
export class CanaryProcessor extends WorkerHost {
  private readonly logger = new Logger(CanaryProcessor.name);

  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Ejecutando Canario de RLS (Job: ${job.id || job.name})...`);

    try {
      // 1. Ejecutar consulta sobre citas sin SET LOCAL app.current_tenant_id
      const resCitas = await this.db.execute(
        sql`SELECT COUNT(*)::INT as count FROM citas`
      );
      const citasCount = Number(resCitas.rows[0]?.count || 0);

      // 2. Ejecutar consulta sobre clientes sin SET LOCAL app.current_tenant_id
      const resClientes = await this.db.execute(
        sql`SELECT COUNT(*)::INT as count FROM clientes`
      );
      const clientesCount = Number(resClientes.rows[0]?.count || 0);

      if (citasCount > 0 || clientesCount > 0) {
        const breachMsg = `¡ALERTA CRÍTICA! Se detectó fuga de aislamiento RLS. Filas expuestas sin tenant scope: ${citasCount} citas, ${clientesCount} clientes.`;
        this.logger.error(`CRITICAL: ${breachMsg}`);

        // Insertar alerta crítica en la base de datos
        await this.db.insert(schema.alertasSeguridad).values({
          tipo: 'canario_rls',
          nivel: 'critical',
          mensaje: breachMsg,
          metadatos: { citasCount, clientesCount, timestamp: new Date().toISOString() },
        });

        return { status: 'RLS_BREACH_DETECTED', citasCount, clientesCount };
      }

      this.logger.log('✅ Canario RLS: Aislamiento íntegro. 0 filas retornadas sin tenant scope.');
      return { status: 'RLS_OK', citasCount: 0, clientesCount: 0 };
    } catch (error: any) {
      this.logger.error('Error al ejecutar verificación del Canario RLS', error);
      throw error;
    }
  }
}
