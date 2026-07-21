import { citas } from '../database/schema';
import { CreateCitaDto } from './dto/create-cita.dto';
import { BloquearTurnoDto } from './dto/bloquear-turno.dto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { Queue } from 'bullmq';
export declare class CitasService {
    private readonly db;
    private readonly citasQueue;
    constructor(db: NodePgDatabase<typeof schema>, citasQueue: Queue);
    crearCita(data: CreateCitaDto, idempotencyKey: string): Promise<{
        cita: any;
        isExisting: boolean;
    }>;
    bloquearTurno(data: BloquearTurnoDto): Promise<any>;
    cambiarEstado(citaId: string, nuevoEstado: typeof citas.$inferInsert.estado): Promise<any>;
    cancelarPorCliente(citaId: string): Promise<any>;
}
