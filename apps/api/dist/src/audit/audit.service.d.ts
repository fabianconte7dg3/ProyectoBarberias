import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
export declare class AuditService {
    private readonly db;
    private readonly logger;
    constructor(db: NodePgDatabase<typeof schema>);
    logAction(params: {
        tenantId?: string;
        usuarioId?: string;
        tablaAfectada: string;
        registroId?: string;
        accion: typeof schema.auditLogs.$inferInsert.accion;
        payloadAntes?: any;
        payloadDespues?: any;
        ipOrigen?: string;
        userAgent?: string;
    }): Promise<void>;
    getAuditLogs(limit?: number): Promise<any>;
}
