import { JwtService } from '@nestjs/jwt';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { RegisterBarberiaDto } from './dto/register-barberia.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { LoginStaffDto } from './dto/login-staff.dto';
export declare class AuthService {
    private readonly db;
    private readonly jwtService;
    private failedAttempts;
    constructor(db: NodePgDatabase<typeof schema>, jwtService: JwtService);
    registerBarberia(dto: RegisterBarberiaDto): Promise<{
        message: string;
        tenantId: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    loginAdmin(dto: LoginAdminDto): Promise<{
        accessToken: string;
        usuario: {
            id: any;
            nombreCompleto: any;
            rol: any;
        };
    }>;
    getStaffForLogin(slug: string): Promise<any>;
    loginStaff(dto: LoginStaffDto): Promise<{
        accessToken: string;
        usuario: {
            id: any;
            nombreCompleto: any;
            rol: any;
        };
    }>;
}
