import { HorariosService } from './horarios.service';
import { UpsertHorarioSemanalDto } from './dto/upsert-horario-semanal.dto';
import { CreateBloqueoDto } from './dto/create-bloqueo.dto';
export declare class HorariosController {
    private readonly horariosService;
    constructor(horariosService: HorariosService);
    setHorarioSemanal(barberoId: string, dto: UpsertHorarioSemanalDto): Promise<any>;
    getHorarioSemanal(barberoId: string): Promise<any>;
    createBloqueo(dto: CreateBloqueoDto): Promise<any>;
    getBloqueos(barberoId: string): Promise<any>;
}
