import * as schema from '../database/schema';
import { UpsertHorarioSemanalDto } from './dto/upsert-horario-semanal.dto';
import { CreateBloqueoDto } from './dto/create-bloqueo.dto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
export declare class HorariosService {
    private readonly db;
    constructor(db: NodePgDatabase<typeof schema>);
    private parseTime;
    private validateDia;
    setHorarioSemanal(empleadoId: string, dto: UpsertHorarioSemanalDto): Promise<any>;
    getHorarioSemanal(empleadoId: string): Promise<any>;
    createBloqueo(dto: CreateBloqueoDto): Promise<any>;
    getBloqueosVigentes(empleadoId: string): Promise<any>;
    getHistorialBloqueosStaff(): Promise<any>;
    getDisponibilidad(empleadoId: string, fechaYYYYMMDD: string): Promise<{
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
