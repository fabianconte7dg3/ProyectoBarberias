import { ReportesService } from './reportes.service';
export declare class ReportesController {
    private readonly reportesService;
    constructor(reportesService: ReportesService);
    getDashboardMetrics(desde?: string, hasta?: string): Promise<{
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
