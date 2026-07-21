import { IYappyPort, IYappyInitResponse } from './adapters/yappy.port';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { DgiService } from '../dgi/dgi.service';
export declare class YappyService {
    private readonly dgiService;
    constructor(dgiService: DgiService);
    getAdapter(tenantId: string, db?: NodePgDatabase<typeof schema>): Promise<IYappyPort>;
    initiatePayment(tenantId: string, orderId: string, monto: number): Promise<IYappyInitResponse>;
    processIpn(orderId: string, status: string, hash: string, domain: string, db: NodePgDatabase<typeof schema>): Promise<{
        success: boolean;
    }>;
}
