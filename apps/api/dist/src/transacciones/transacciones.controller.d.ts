import { TransaccionesService } from './transacciones.service';
import { CobrarCitaDto } from './dto/cobrar-cita.dto';
export declare class TransaccionesController {
    private readonly transaccionesService;
    constructor(transaccionesService: TransaccionesService);
    cobrarCita(id: string, cobrarCitaDto: CobrarCitaDto): Promise<any>;
    findAll(page?: string, limit?: string): Promise<{
        data: any;
        page: number;
        limit: number;
    }>;
}
