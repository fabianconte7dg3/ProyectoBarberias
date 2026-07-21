import { YappyService } from './yappy.service';
import type { Response } from 'express';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
export declare class YappyController {
    private readonly yappyService;
    private readonly db;
    constructor(yappyService: YappyService, db: NodePgDatabase<typeof schema>);
    handleIpn(orderId: string, status: string, hash: string, domain: string, res: Response): Promise<Response<any, Record<string, any>>>;
}
