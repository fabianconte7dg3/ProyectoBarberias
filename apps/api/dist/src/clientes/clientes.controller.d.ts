import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
export declare class ClientesController {
    private readonly clientesService;
    private readonly db;
    constructor(clientesService: ClientesService, db: NodePgDatabase<typeof schema>);
    createPublico(dto: CreateClienteDto, tenantSlug: string): Promise<any>;
    create(dto: CreateClienteDto): Promise<any>;
    findAll(q?: string): Promise<any>;
    findOne(id: string): Promise<any>;
    update(id: string, dto: UpdateClienteDto): Promise<any>;
}
