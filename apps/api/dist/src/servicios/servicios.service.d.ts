import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
export declare class ServiciosService {
    private readonly db;
    constructor(db: NodePgDatabase<typeof schema>);
    create(dto: CreateServicioDto): Promise<any>;
    findAll(): Promise<any>;
    findPublicBySlug(slug: string): Promise<any>;
    findOne(id: string): Promise<any>;
    update(id: string, dto: UpdateServicioDto): Promise<any>;
    softDelete(id: string): Promise<{
        message: string;
    }>;
}
