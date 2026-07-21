import type { Response, Request } from 'express';
import { CitasService } from './citas.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { BloquearTurnoDto } from './dto/bloquear-turno.dto';
import { UpdateEstadoCitaDto } from './dto/update-estado.dto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
export declare class CitasController {
    private readonly citasService;
    private readonly db;
    constructor(citasService: CitasService, db: NodePgDatabase<typeof schema>);
    crearCita(data: CreateCitaDto, idempotencyKey: string, res: Response): Promise<any>;
    getCitas(req: Request, fechaStr?: string, barberoId?: string): Promise<any>;
    bloquearTurno(data: BloquearTurnoDto): Promise<any>;
    cambiarEstado(req: Request, id: string, data: UpdateEstadoCitaDto): Promise<any>;
    cancelarPorCliente(id: string, token: string): Promise<any>;
}
