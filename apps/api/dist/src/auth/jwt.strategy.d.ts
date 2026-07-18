import { Strategy } from 'passport-jwt';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { ConfigService } from '@nestjs/config';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly db;
    private readonly configService;
    constructor(db: NodePgDatabase<typeof schema>, configService: ConfigService);
    validate(payload: any): Promise<{
        userId: any;
        tenantId: any;
        rol: any;
    }>;
}
export {};
