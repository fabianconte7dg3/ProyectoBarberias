import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
export declare class TenantsService {
    private readonly db;
    constructor(db: NodePgDatabase<typeof schema>);
    findPublicBySlug(slug: string): Promise<any>;
}
