export declare class FilaImportClienteDto {
    nombreCompleto: string;
    telefonoWhatsapp: string;
    email?: string;
    notasPreferencia?: string;
    aceptaMarketing?: boolean;
}
export declare class FilaImportProductoDto {
    nombre: string;
    precioVenta: number;
    costoCompra: number;
    stockActual: number;
    stockMinimo?: number;
}
export declare class FilaImportServicioDto {
    nombre: string;
    precioBase: number;
    duracionMinutos: number;
}
