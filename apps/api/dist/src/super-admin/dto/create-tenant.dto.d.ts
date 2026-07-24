export declare class CreateTenantDto {
    nombreComercial: string;
    slug: string;
    adminEmail: string;
    adminNombre: string;
    planId?: 'independiente' | 'basico' | 'premium';
    industria?: 'barberia' | 'salon_belleza' | 'spa_masajes' | 'veterinaria' | 'clinica_medica' | 'taller_mecanico' | 'espacio_alquiler' | 'otro';
    terminologiaEmpleado?: string;
    terminologiaServicio?: string;
    terminologiaCliente?: string;
}
