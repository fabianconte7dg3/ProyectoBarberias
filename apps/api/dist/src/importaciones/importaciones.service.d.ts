import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { Queue } from 'bullmq';
import { ParserService } from './parser.service';
export declare class ImportacionesService {
    private readonly db;
    private readonly importacionesQueue;
    private readonly parserService;
    constructor(db: NodePgDatabase<typeof schema>, importacionesQueue: Queue, parserService: ParserService);
    crearTrabajoImportacion(fileBuffer: Buffer, fileName: string, tipo: 'clientes' | 'productos' | 'servicios', usuarioId: string): Promise<{
        trabajoId: any;
        totalFilas: number;
        estado: any;
        message: string;
    }>;
    obtenerTrabajo(trabajoId: string): Promise<any>;
    exportarFinanciero(desdeStr?: string, hastaStr?: string): Promise<Buffer>;
    exportarNomina(desdeStr?: string, hastaStr?: string): Promise<Buffer>;
    exportarClientesMarketing(): Promise<Buffer>;
}
