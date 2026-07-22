import { ImportacionesService } from './importaciones.service';
import type { Response, Request } from 'express';
export declare class ImportacionesController {
    private readonly importacionesService;
    constructor(importacionesService: ImportacionesService);
    importar(tipo: 'clientes' | 'productos' | 'servicios', file: any, req: Request): Promise<{
        trabajoId: any;
        totalFilas: number;
        estado: any;
        message: string;
    }>;
    obtenerTrabajo(trabajoId: string): Promise<any>;
    exportarFinanciero(desde: string, hasta: string, res: Response): Promise<void>;
    exportarNomina(desde: string, hasta: string, res: Response): Promise<void>;
    exportarClientesMarketing(res: Response): Promise<void>;
}
