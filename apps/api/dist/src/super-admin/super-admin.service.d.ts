import { JwtService } from '@nestjs/jwt';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
export declare class SuperAdminService {
    private readonly db;
    private readonly jwtService;
    constructor(db: NodePgDatabase<typeof schema>, jwtService: JwtService);
    iniciarLogin(email: string, password: string): Promise<{
        message: string;
        mfaRequired: boolean;
        tempToken: string;
    }>;
    verificarTotp(tempToken: string, codigoTotp: string): Promise<{
        message: string;
        accessToken: string;
        usuario: {
            id: any;
            email: any;
            rol: string;
        };
    }>;
    obtenerEstadisticas(): Promise<{
        totalBarberias: number;
        barberiasActivas: number;
        barberiasSuspendidas: number;
        mrrEstimado: number;
        mrrEtiqueta: string;
        totalCitasMes: number;
        totalFacturadoMes: number;
    }>;
    listarTenants(): Promise<{
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
    cambiarEstadoTenant(tenantId: string, estado: 'activo' | 'suspendido_pago' | 'cancelado'): Promise<{
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
    cambiarPlanTenant(tenantId: string, plan: 'basico' | 'premium'): Promise<{
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
    toggleKillSwitchPlatform(tenantId: string, bloqueado: boolean): Promise<{
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
