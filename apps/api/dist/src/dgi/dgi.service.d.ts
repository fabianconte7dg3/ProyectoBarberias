import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
export declare class DgiService {
    private readonly globalDb;
    private readonly logger;
    constructor(globalDb: NodePgDatabase<typeof schema>);
    emitirFacturaAsync(tenantId: string, transaccionId: string, monto: string, rucCliente?: string | null, nombreCliente?: string | null): Promise<void>;
}
