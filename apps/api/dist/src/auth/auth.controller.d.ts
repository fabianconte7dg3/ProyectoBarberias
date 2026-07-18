import { AuthService } from './auth.service';
import { RegisterBarberiaDto } from './dto/register-barberia.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { LoginStaffDto } from './dto/login-staff.dto';
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
    loginStaff(dto: LoginStaffDto): Promise<{
        accessToken: string;
    }>;
}
