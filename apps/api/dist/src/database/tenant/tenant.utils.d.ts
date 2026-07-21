import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
export declare function runInTenantScope<T>(db: NodePgDatabase<typeof schema>, tenantId: string, callback: (tx: any) => Promise<T>): Promise<T>;
