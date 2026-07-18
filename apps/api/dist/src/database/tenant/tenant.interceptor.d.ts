import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
export declare class TenantInterceptor implements NestInterceptor {
    private readonly db;
    constructor(db: NodePgDatabase<typeof schema>);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
