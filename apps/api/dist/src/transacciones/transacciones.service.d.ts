import { CobrarCitaDto } from './dto/cobrar-cita.dto';
export declare class TransaccionesService {
    cobrarCita(citaId: string, dto: CobrarCitaDto): Promise<any>;
    findAll(page?: number, limit?: number): Promise<{
        data: any;
        page: number;
        limit: number;
    }>;
}
