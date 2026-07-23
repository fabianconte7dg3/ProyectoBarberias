import { SuperAdminService, CreateTenantDto, ActivateAdminDto } from './super-admin.service';
import type { Response, Request } from 'express';
export declare class SuperAdminController {
    private readonly superAdminService;
    constructor(superAdminService: SuperAdminService);
    checkSetupStatus(): Promise<{
        necesitaSetup: boolean;
    }>;
    iniciarSetup(): Promise<{
        totpSecret: string;
        otpauthUrl: string;
    }>;
    completarSetup(body: {
        email: string;
        password: string;
        totpSecret: string;
        codigoTotp: string;
    }, res: Response): Promise<{
        message: string;
        usuario: {
            id: any;
            email: any;
            rol: string;
        };
        accessToken: string;
    }>;
    loginPaso1(body: {
        email: string;
        password: string;
    }, req: Request): Promise<{
        message: string;
        mfaRequired: boolean;
        tempToken: string;
    }>;
    loginPaso2(body: {
        tempToken: string;
        codigoTotp: string;
    }, req: Request, res: Response): Promise<{
        message: string;
        usuario: {
            id: any;
            email: any;
            rol: string;
        };
        accessToken: string;
    }>;
    getStats(): Promise<{
        totalBarberias: number;
        barberiasActivas: number;
        barberiasSuspendidas: number;
        mrrEstimado: number;
        mrrEtiqueta: string;
        totalCitasMes: number;
        totalFacturadoMes: number;
    }>;
    getTenants(): Promise<{
        id: any;
        nombreComercial: any;
        slug: any;
        planSuscripcion: any;
        estadoBarberia: any;
        bloqueadoPorPlataforma: any;
        adminEmail: any;
        adminNombre: any;
        createdAt: any;
        totalBarberos: number;
        totalCitasMes: number;
        totalFacturadoMes: number;
    }[]>;
    crearTenant(body: CreateTenantDto): Promise<{
        message: string;
        tenantId: `${string}-${string}-${string}-${string}-${string}`;
        slug: string;
        activationToken: string;
        activationUrl: string;
    }>;
    getTenantDetalle(id: string): Promise<{
        barberia: any;
        staff: any;
        whatsappConfig: any;
        metricas: {
            totalCitas: number;
            citasCompletadas: number;
            citasCanceladas: number;
            totalFacturado: number;
        };
        auditLogs: any;
    }>;
    activarAdmin(body: ActivateAdminDto): Promise<{
        message: string;
    }>;
    cambiarEstado(id: string, estado: 'activo' | 'suspendido_pago' | 'cancelado'): Promise<any>;
    cambiarPlan(id: string, plan: 'basico' | 'premium'): Promise<any>;
    toggleKillSwitch(id: string, bloqueado: boolean): Promise<any>;
    getBusinessMetrics(): Promise<{
        nuevasMes: number;
        nuevasSemana: number;
        canceladasMes: number;
        barberiasBasico: number;
        barberiasPremium: number;
        barberiasEnRiesgo: any;
    } | null>;
    getSecurityAlerts(atendidaStr?: string): Promise<{
        id: string;
        tenantId: string | null;
        tipo: string;
        nivel: string;
        mensaje: string;
        metadatos: unknown;
        atendida: boolean;
        createdAt: Date;
    }[]>;
    marcarAlertaAtendida(id: string): Promise<{
        id: string;
        tenantId: string | null;
        tipo: string;
        nivel: string;
        mensaje: string;
        metadatos: unknown;
        atendida: boolean;
        createdAt: Date;
    }>;
}
