import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { ActivateStaffDto } from './dto/activate-staff.dto';
import { AuditService } from '../audit/audit.service';
export declare class UsuariosService {
    private readonly db;
    private readonly auditService;
    constructor(db: NodePgDatabase<typeof schema>, auditService: AuditService);
    inviteStaff(dto: InviteStaffDto, tenantId: string): Promise<{
        message: string;
        activationToken: any;
    }>;
    toggleKillSwitch(tenantId: string, adminId: string, activo: boolean, ipOrigen?: string, userAgent?: string): Promise<{
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
