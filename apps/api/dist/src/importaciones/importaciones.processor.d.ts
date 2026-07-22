import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
interface JobPayload {
    trabajoId: string;
    tenantId: string;
    tipo: 'clientes' | 'productos' | 'servicios';
    filas: Array<{
        rowNumber: number;
        data: Record<string, any>;
    }>;
}
export declare class ImportacionesProcessor extends WorkerHost {
    private readonly db;
    constructor(db: NodePgDatabase<typeof schema>);
    process(job: Job<JobPayload>): Promise<any>;
}
export {};
