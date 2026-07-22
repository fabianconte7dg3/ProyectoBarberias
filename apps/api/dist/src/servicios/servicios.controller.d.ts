import { ServiciosService } from './servicios.service';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
export declare class ServiciosController {
    private readonly serviciosService;
    constructor(serviciosService: ServiciosService);
    findPublicBySlug(slug: string): Promise<any>;
    create(dto: CreateServicioDto): Promise<any>;
    findAll(): Promise<any>;
    findOne(id: string): Promise<any>;
    update(id: string, dto: UpdateServicioDto): Promise<any>;
    softDelete(id: string): Promise<{
        message: string;
    }>;
}
