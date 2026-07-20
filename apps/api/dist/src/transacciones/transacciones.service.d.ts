import { CobrarCitaDto } from './dto/cobrar-cita.dto';
import { YappyService } from '../yappy/yappy.service';
import { DgiService } from '../dgi/dgi.service';
export declare class TransaccionesService {
    private readonly yappyService;
    private readonly dgiService;
    constructor(yappyService: YappyService, dgiService: DgiService);
    cobrarCita(citaId: string, dto: CobrarCitaDto): Promise<{
        transaccion: any;
        yappyData: import("../yappy/adapters/yappy.port").IYappyInitResponse | null;
    }>;
    findAll(page?: number, limit?: number): Promise<{
        data: any;
        page: number;
        limit: number;
    }>;
}
