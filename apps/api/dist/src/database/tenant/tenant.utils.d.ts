import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
export declare function runInTenantScope<T>(globalDb: NodePgDatabase<typeof schema>, tenantId: string, callback: (tx: any) => Promise<T>): Promise<T>;
