export declare class CreateProductoDto {
    nombre: string;
    descripcion?: string;
    precioVenta: number;
    costoCompra: number;
    stockActual: number;
    stockMinimo?: number;
}
export declare class UpdateProductoDto {
    nombre?: string;
    descripcion?: string;
    precioVenta?: number;
    costoCompra?: number;
    stockActual?: number;
    stockMinimo?: number;
    activo?: boolean;
}
