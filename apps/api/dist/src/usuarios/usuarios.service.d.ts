import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { ActivateStaffDto } from './dto/activate-staff.dto';
export declare class UsuariosService {
    private readonly db;
    constructor(db: NodePgDatabase<typeof schema>);
    inviteStaff(dto: InviteStaffDto, tenantId: string): Promise<{
        message: string;
        activationToken: string | null;
    }>;
    activateStaff(dto: ActivateStaffDto): Promise<{
        message: string;
    }>;
    findAll(): Promise<any>;
    findOne(id: string): Promise<any>;
}
