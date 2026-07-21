import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import * as crypto from 'crypto';
import { runInTenantScope } from '../database/tenant/tenant.utils';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>) {}

  /**
   * Registra un log de auditoría inmutable.
   */
  async logAction(params: {
    tenantId?: string;
    usuarioId?: string;
    tablaAfectada: string;
    registroId?: string;
    accion: typeof schema.auditLogs.$inferInsert.accion;
    payloadAntes?: any;
    payloadDespues?: any;
    ipOrigen?: string;
    userAgent?: string;
  }) {
    try {
      const registro = {
        tenantId: params.tenantId || null,
        usuarioId: params.usuarioId || null,
        tablaAfectada: params.tablaAfectada,
        registroId: params.registroId || crypto.randomUUID(), // Fallback si la acción es global
        accion: params.accion,
        payloadAntes: params.payloadAntes || null,
        payloadDespues: params.payloadDespues || null,
        ipOrigen: params.ipOrigen || '127.0.0.1',
        userAgent: params.userAgent || 'unknown',
      };

      if (params.tenantId) {
        // Ejecutar bajo el tenant scope si hay tenant (aunque auditLogs no tiene RLS que lo impida si somos DB admin, pero mantiene consistencia)
        await runInTenantScope(this.db, params.tenantId, async (tx) => {
          await tx.insert(schema.auditLogs).values(registro);
        });
      } else {
        // Global action
        await this.db.insert(schema.auditLogs).values(registro);
      }
      
      this.logger.log(`Audit log: [${params.accion}] en ${params.tablaAfectada} (User: ${params.usuarioId || 'system'})`);
    } catch (error) {
      // Nunca detener el flujo principal por un error de log, pero alertar severamente
      this.logger.error('CRITICAL: Error al escribir log de auditoría', error);
    }
  }
}
