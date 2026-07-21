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
        tendenciaDiaria: {
            fecha: string;
            label: string;
            servicios: number;
            productos: number;
            total: number;
        }[];
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
        comparativaProductosStock: any;
        productosStockBajoCount: any;
        productosStockBajoList: any;
        rendimientoBarberos: {
            barberoId: string;
            nombreCompleto: string;
            porcentajeComision: number;
            porcentajeComisionProducto: number;
            totalCitas: number;
            facturadoServicios: number;
            facturadoProductos: number;
            totalFacturado: number;
            comisionTotal: number;
            propinaTotal: number;
        }[];
        clientesStrikes: any;
    }>;
    getMiDesempeno(barberoId: string, desdeStr?: string, hastaStr?: string): Promise<{
        barberoId: any;
        nombreCompleto: any;
        porcentajeComision: number;
        porcentajeComisionProducto: number;
        rangoFechas: {
            desde: Date;
            hasta: Date;
        };
        totalCitas: number;
        totalFacturado: number;
        comisionServicios: number;
        comisionProductos: number;
        comisionTotal: number;
        propinaTotal: number;
        resumenDiario: {
            fecha: string;
            label: string;
            citas: number;
            facturado: number;
            comision: number;
            propina: number;
        }[];
    }>;
}
