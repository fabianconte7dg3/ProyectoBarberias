import { DatosService } from './datos.service';
import type { Response } from 'express';
export declare class DatosController {
    private readonly datosService;
    constructor(datosService: DatosService);
    importarClientes(file: any, rawCsv?: string): Promise<import("./datos.service").ReporteImportacion>;
    importarProductos(file: any, rawCsv?: string): Promise<import("./datos.service").ReporteImportacion>;
    exportarTransacciones(desde: string, hasta: string, res: Response): Promise<void>;
    exportarClientesMarketing(res: Response): Promise<void>;
    exportarNomina(desde: string, hasta: string, res: Response): Promise<void>;
    descargarPlantilla(tipo: 'clientes' | 'productos', res: Response): Promise<void>;
}
