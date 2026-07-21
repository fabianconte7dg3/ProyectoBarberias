import { AuthService } from './auth.service';
import { RegisterBarberiaDto } from './dto/register-barberia.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { LoginStaffDto } from './dto/login-staff.dto';
import type { Response, Request } from 'express';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    registerBarberia(dto: RegisterBarberiaDto): Promise<{
        message: string;
        tenantId: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    loginAdmin(dto: LoginAdminDto): Promise<{
        accessToken: string;
    }>;
    getStaffForLogin(slug: string): Promise<any>;
    logout(res: Response): {
        message: string;
    };
    loginStaff(dto: LoginStaffDto, res: Response): Promise<{
        message: string;
        usuario: {
            id: any;
            nombreCompleto: any;
            rol: any;
        };
    }>;
    getMe(req: Request): Express.User | undefined;
}
