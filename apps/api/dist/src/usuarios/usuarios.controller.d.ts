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
    activateStaff(dto: ActivateStaffDto): Promise<{
        message: string;
    }>;
    findAll(): Promise<any>;
    findOne(id: string): Promise<any>;
}
