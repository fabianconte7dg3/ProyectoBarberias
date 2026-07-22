import { SuperAdminService } from './super-admin.service';
import type { Response } from 'express';
export declare class SuperAdminController {
    private readonly superAdminService;
    constructor(superAdminService: SuperAdminService);
    loginPaso1(body: {
        email: string;
        password: string;
    }): Promise<{
        message: string;
        mfaRequired: boolean;
        tempToken: string;
    }>;
    loginPaso2(body: {
        tempToken: string;
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
    cambiarEstado(id: string, estado: 'activo' | 'suspendido_pago' | 'cancelado'): Promise<{
        id: string;
        nombreComercial: string;
        ruc: string | null;
        telefonoNegocio: string | null;
        planSuscripcion: "basico" | "premium";
        estado: "activo" | "suspendido_pago" | "cancelado";
        slug: string;
        killSwitchActivo: boolean;
        bloqueadoPorPlataforma: boolean;
        colorPrimario: string | null;
        logoUrl: string | null;
        createdAt: Date;
    }>;
    cambiarPlan(id: string, plan: 'basico' | 'premium'): Promise<{
        id: string;
        nombreComercial: string;
        ruc: string | null;
        telefonoNegocio: string | null;
        planSuscripcion: "basico" | "premium";
        estado: "activo" | "suspendido_pago" | "cancelado";
        slug: string;
        killSwitchActivo: boolean;
        bloqueadoPorPlataforma: boolean;
        colorPrimario: string | null;
        logoUrl: string | null;
        createdAt: Date;
    }>;
    toggleKillSwitch(id: string, bloqueado: boolean): Promise<{
        id: string;
        nombreComercial: string;
        ruc: string | null;
        telefonoNegocio: string | null;
        planSuscripcion: "basico" | "premium";
        estado: "activo" | "suspendido_pago" | "cancelado";
        slug: string;
        killSwitchActivo: boolean;
        bloqueadoPorPlataforma: boolean;
        colorPrimario: string | null;
        logoUrl: string | null;
        createdAt: Date;
    }>;
}
