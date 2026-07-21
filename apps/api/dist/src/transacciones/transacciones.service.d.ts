import { CobrarCitaDto } from './dto/cobrar-cita.dto';
import { YappyService } from '../yappy/yappy.service';
import { DgiService } from '../dgi/dgi.service';
import { ProductosService } from '../productos/productos.service';
export declare class TransaccionesService {
    private readonly yappyService;
    private readonly dgiService;
    private readonly productosService;
    constructor(yappyService: YappyService, dgiService: DgiService, productosService: ProductosService);
    cobrarCita(citaId: string | null, dto: CobrarCitaDto, user?: any): Promise<any>;
    getHistorialTransacciones(limit?: number): Promise<any>;
}
