import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import { Reflector } from '@nestjs/core';
export declare class TenantInterceptor implements NestInterceptor {
    private readonly db;
    private readonly reflector;
    constructor(db: NodePgDatabase<typeof schema>, reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
