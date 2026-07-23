import { JwtService } from '@nestjs/jwt';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { AuditService } from '../audit/audit.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ActivateAdminDto } from './dto/activate-admin.dto';
export { CreateTenantDto, ActivateAdminDto };
export declare class SuperAdminService {
    private readonly db;
    private readonly jwtService;
    private readonly auditService;
    constructor(db: NodePgDatabase<typeof schema>, jwtService: JwtService, auditService: AuditService);
    checkSetupStatus(): Promise<{
        necesitaSetup: boolean;
    }>;
    iniciarSetup(): Promise<{
        totpSecret: string;
        otpauthUrl: string;
    }>;
    completarSetup(data: {
        email: string;
        password: string;
        totpSecret: string;
        codigoTotp: string;
    }): Promise<{
        message: string;
        usuario: {
            id: any;
            email: any;
            rol: string;
        };
        accessToken: string;
    }>;
    private registrarYNotificarAlertaCriticaSuperAdmin;
    iniciarLogin(email: string, password: string, reqInfo?: {
        ip?: string;
        userAgent?: string;
    }): Promise<{
        message: string;
        mfaRequired: boolean;
        tempToken: string;
    }>;
    verificarTotp(tempToken: string, codigoTotp: string, reqInfo?: {
        ip?: string;
        userAgent?: string;
    }): Promise<{
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
    crearTenantManual(dto: CreateTenantDto): Promise<{
        message: string;
        tenantId: `${string}-${string}-${string}-${string}-${string}`;
        slug: string;
        activationToken: string;
        activationUrl: string;
    }>;
    activarAdminManual(dto: ActivateAdminDto): Promise<{
        message: string;
    }>;
    obtenerDetalleTenant(tenantId: string): Promise<{
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
    cambiarEstadoTenant(tenantId: string, estado: 'activo' | 'suspendido_pago' | 'cancelado'): Promise<any>;
    cambiarPlanTenant(tenantId: string, plan: 'basico' | 'premium'): Promise<any>;
    toggleKillSwitchPlatform(tenantId: string, bloqueado: boolean): Promise<any>;
    obtenerMetricasNegocio(): Promise<{
        nuevasMes: number;
        nuevasSemana: number;
        canceladasMes: number;
        barberiasBasico: number;
        barberiasPremium: number;
        barberiasEnRiesgo: any;
    } | null>;
    obtenerAlertasSeguridad(atendida?: boolean): Promise<{
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
