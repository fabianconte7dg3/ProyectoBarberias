import { TransaccionesService } from './transacciones.service';
import { CobrarCitaDto } from './dto/cobrar-cita.dto';
import type { Response } from 'express';
export declare class TransaccionesController {
    private readonly transaccionesService;
    constructor(transaccionesService: TransaccionesService);
    cobrarCita(req: any, id: string, cobrarCitaDto: CobrarCitaDto, res: Response): Promise<any>;
    ventaMostrador(req: any, cobrarCitaDto: CobrarCitaDto, res: Response): Promise<any>;
    findAll(): Promise<any>;
}
