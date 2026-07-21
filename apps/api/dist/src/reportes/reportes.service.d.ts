export declare class ReportesService {
    getDashboardMetrics(desdeStr?: string, hastaStr?: string): Promise<{
        rangoFechas: {
            desde: Date;
            hasta: Date;
        };
        ingresosTotales: number;
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
        rendimientoBarberos: {
            barberoId: string;
            nombreCompleto: string;
            porcentajeComision: number;
            totalCitas: number;
            totalFacturado: number;
            comisionTotal: number;
            propinaTotal: number;
        }[];
        clientesStrikes: any;
    }>;
}
