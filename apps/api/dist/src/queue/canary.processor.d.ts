import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
export declare class CanaryProcessor extends WorkerHost {
    private readonly db;
    private readonly logger;
    constructor(db: NodePgDatabase<typeof schema>);
    process(job: Job<any, any, string>): Promise<any>;
}
