export declare class ReportesService {
    getDashboardMetrics(desdeStr?: string, hastaStr?: string): Promise<{
        rangoFechas: {
            desde: Date;
            hasta: Date;
        };
        ingresosTotales: number;
        ingresosServicios: number;
        ingresosProductos: number;
        totalTransacciones: any;
        desgloseMetodosPago: {
            efectivo: number;
            yappy: number;
            mixto: number;
        };
        topServicios: {
            servicioId: string;
            nombre: string;
            totalCitas: number;
            totalRecaudado: number;
        }[];
        topProductos: {
            productoId: string;
            nombre: string;
            totalVendidos: number;
            totalRecaudado: number;
        }[];
        productosStockBajoCount: any;
        productosStockBajoList: any;
        rendimientoBarberos: {
            barberoId: string;
            nombreCompleto: string;
            porcentajeComision: number;
            porcentajeComisionProducto: number;
            totalCitas: number;
            totalFacturado: number;
            comisionTotal: number;
            propinaTotal: number;
        }[];
        clientesStrikes: any;
    }>;
}
