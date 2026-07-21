import { TransaccionesService } from './transacciones.service';
import { CobrarCitaDto } from './dto/cobrar-cita.dto';
export declare class TransaccionesController {
    private readonly transaccionesService;
    constructor(transaccionesService: TransaccionesService);
    cobrarCita(req: any, id: string, cobrarCitaDto: CobrarCitaDto): Promise<any>;
    ventaMostrador(req: any, cobrarCitaDto: CobrarCitaDto): Promise<any>;
    findAll(): Promise<any>;
}
