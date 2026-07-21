import { CanActivate, ExecutionContext } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
export declare class KillSwitchGuard implements CanActivate {
    private readonly db;
    constructor(db: NodePgDatabase<typeof schema>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
