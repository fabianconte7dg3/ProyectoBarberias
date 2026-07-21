export declare class ProductoAdicionalDto {
    productoId: string;
    cantidad: number;
}
export declare class CobrarCitaDto {
    metodoPago: 'efectivo' | 'yappy' | 'mixto' | 'deuda';
    idempotencyKey?: string;
    montoEfectivoIngresado?: number;
    propinaBarbero?: number;
    rucCliente?: string;
    nombreFiscalCliente?: string;
    productosAdicionales?: ProductoAdicionalDto[];
    barberoId?: string;
}
