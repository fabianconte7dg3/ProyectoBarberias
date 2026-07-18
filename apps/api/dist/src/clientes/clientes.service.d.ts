import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
export declare class ClientesService {
    create(dto: CreateClienteDto): Promise<any>;
    findAll(q?: string): Promise<any>;
    findOne(id: string): Promise<any>;
    update(id: string, dto: UpdateClienteDto): Promise<any>;
}
