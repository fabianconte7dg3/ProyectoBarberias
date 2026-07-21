import { WhatsappService } from './whatsapp.service';
import * as schema from '../database/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
export declare class WhatsappController {
    private readonly whatsappService;
    private readonly db;
    private readonly logger;
    constructor(whatsappService: WhatsappService, db: NodePgDatabase<typeof schema>);
    handleEvolutionWebhook(tenantId: string, payload: any): Promise<{
        status: string;
    }>;
}
