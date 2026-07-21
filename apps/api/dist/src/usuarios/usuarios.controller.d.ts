import { UsuariosService } from './usuarios.service';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { ActivateStaffDto } from './dto/activate-staff.dto';
export declare class UsuariosController {
    private readonly usuariosService;
    constructor(usuariosService: UsuariosService);
    inviteStaff(dto: InviteStaffDto, req: any): Promise<{
        message: string;
        activationToken: any;
    }>;
    toggleKillSwitch(req: any, activo: boolean, ip: string, userAgent: string): Promise<{
        message: string;
        killSwitchActivo?: undefined;
    } | {
        message: string;
        killSwitchActivo: boolean;
    }>;
    activateStaff(dto: ActivateStaffDto): Promise<{
        message: string;
    }>;
    findAll(): Promise<any>;
    findOne(id: string): Promise<any>;
}
