import { CitasService } from './citas.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { BloquearTurnoDto } from './dto/bloquear-turno.dto';
import { UpdateEstadoCitaDto } from './dto/update-estado.dto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
export declare class CitasController {
    private readonly citasService;
    private readonly globalDb;
    constructor(citasService: CitasService, globalDb: NodePgDatabase<typeof schema>);
    crearCita(data: CreateCitaDto, idempotencyKey: string): Promise<any>;
    bloquearTurno(data: BloquearTurnoDto): Promise<{
        id: string;
        tenantId: string;
        barberoId: string;
        origen: "admin" | "barbero" | "sistema";
        inicio: Date;
        fin: Date;
        tipo: "walk_in" | "almuerzo_dinamico" | "lock_reserva" | "emergencia" | "extension_turno";
        expiraEn: Date | null;
        notas: string | null;
    }>;
    cambiarEstado(id: string, data: UpdateEstadoCitaDto): Promise<any>;
    cancelarPorCliente(id: string, token: string): Promise<{
        id: string;
        tenantId: string;
        clienteId: string | null;
        barberoId: string;
        servicioId: string;
        inicioEstimado: Date;
        finEstimado: Date;
        inicioReal: Date | null;
        finReal: Date | null;
        origen: "bot_whatsapp" | "walk_in" | "manual_admin";
        estado: "programada" | "en_curso" | "completada" | "ausente_strike" | "cancelada" | "revision_manual";
        idempotencyKey: string;
        tokenCliente: string | null;
        tokenExpiraEn: Date | null;
        createdAt: Date;
    }>;
}
