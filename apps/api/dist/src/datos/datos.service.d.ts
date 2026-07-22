export interface ReporteImportacion {
    totalFilas: number;
    creados: number;
    actualizados: number;
    rechazados: number;
    errores: Array<{
        fila: number;
        identificador: string;
        motivo: string;
    }>;
}
export declare class DatosService {
    importarClientes(csvString: string): Promise<ReporteImportacion>;
    importarProductos(csvString: string): Promise<ReporteImportacion>;
    exportarTransaccionesCsv(desdeStr?: string, hastaStr?: string): Promise<string>;
    exportarClientesMarketingCsv(): Promise<string>;
    exportarNominaCsv(desdeStr?: string, hastaStr?: string): Promise<string>;
    obtenerPlantillaCsv(tipo: 'clientes' | 'productos'): string;
}
