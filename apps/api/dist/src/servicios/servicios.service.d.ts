import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
export declare class ServiciosService {
    create(dto: CreateServicioDto): Promise<any>;
    findAll(): Promise<any>;
    findOne(id: string): Promise<any>;
    update(id: string, dto: UpdateServicioDto): Promise<any>;
    softDelete(id: string): Promise<{
        message: string;
    }>;
}
