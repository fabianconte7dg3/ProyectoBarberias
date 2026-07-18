import { UpsertHorarioSemanalDto } from './dto/upsert-horario-semanal.dto';
import { CreateBloqueoDto } from './dto/create-bloqueo.dto';
export declare class HorariosService {
    private parseTime;
    private validateDia;
    setHorarioSemanal(barberoId: string, dto: UpsertHorarioSemanalDto): Promise<any>;
    getHorarioSemanal(barberoId: string): Promise<any>;
    createBloqueo(dto: CreateBloqueoDto): Promise<any>;
    getBloqueosVigentes(barberoId: string): Promise<any>;
}
