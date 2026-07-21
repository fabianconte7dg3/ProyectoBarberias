import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
export declare class CitasProcessor extends WorkerHost {
    private readonly db;
    private readonly whatsappService;
    private readonly logger;
    constructor(db: NodePgDatabase<typeof schema>, whatsappService: WhatsappService);
    process(job: Job<any, any, string>): Promise<any>;
    private handleRecordatorio24h;
    private handleCancelacionRetraso;
    private handleRecordatorioDeuda;
    private handleCierreEmergencia;
}
