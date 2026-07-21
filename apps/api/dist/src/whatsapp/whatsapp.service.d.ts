import { ConfigService } from '@nestjs/config';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
export declare class WhatsappService {
    private readonly db;
    private readonly configService;
    private readonly logger;
    constructor(db: NodePgDatabase<typeof schema>, configService: ConfigService);
    enviarMensajeTexto(tenantId: string, telefono: string, mensaje: string): Promise<boolean>;
}
