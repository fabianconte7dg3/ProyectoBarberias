import { HorariosService } from './horarios.service';
import { UpsertHorarioSemanalDto } from './dto/upsert-horario-semanal.dto';
import { CreateBloqueoDto } from './dto/create-bloqueo.dto';
export declare class HorariosController {
    private readonly horariosService;
    constructor(horariosService: HorariosService);
    setHorarioSemanal(empleadoId: string, dto: UpsertHorarioSemanalDto): Promise<any>;
    getHorarioSemanal(empleadoId: string): Promise<any>;
    createBloqueo(dto: CreateBloqueoDto): Promise<any>;
    getBloqueos(empleadoId: string): Promise<any>;
    getHistorialBloqueos(): Promise<any>;
    getDisponibilidad(empleadoId: string, fecha: string): Promise<{
        disponible: boolean;
        jornada: {
            inicio: any;
            fin: any;
        };
        retrasoActualMinutos: number;
        almuerzo: {
            inicioMinutos: number;
            finMinutos: number;
            strInicio: string;
            strFin: string;
        } | null;
        ocupados: any[];
    } | {
        disponible: boolean;
        jornada: null;
        ocupados: never[];
        almuerzo: null;
    }>;
}
