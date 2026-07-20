import * as schema from '../database/schema';
import { UpsertHorarioSemanalDto } from './dto/upsert-horario-semanal.dto';
import { CreateBloqueoDto } from './dto/create-bloqueo.dto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
export declare class HorariosService {
    private readonly globalDb;
    constructor(globalDb: NodePgDatabase<typeof schema>);
    private parseTime;
    private validateDia;
    setHorarioSemanal(barberoId: string, dto: UpsertHorarioSemanalDto): Promise<any>;
    getHorarioSemanal(barberoId: string): Promise<any>;
    createBloqueo(dto: CreateBloqueoDto): Promise<any>;
    getBloqueosVigentes(barberoId: string): Promise<any>;
    getDisponibilidad(barberoId: string, fechaYYYYMMDD: string): Promise<{
        disponible: boolean;
        jornada: null;
        ocupados: never[];
        almuerzo: null;
        retrasoActualMinutos?: undefined;
    } | {
        disponible: boolean;
        jornada: {
            inicio: string;
            fin: string;
        };
        retrasoActualMinutos: number;
        almuerzo: {
            inicioMinutos: number;
            finMinutos: number;
            strInicio: string;
            strFin: string;
        } | null;
        ocupados: {
            tipo: string;
            id: any;
            inicio: any;
            fin: any;
        }[];
    }>;
}
