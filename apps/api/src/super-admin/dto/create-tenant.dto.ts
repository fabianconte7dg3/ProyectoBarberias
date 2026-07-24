import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  nombreComercial!: string;

  @IsString()
  slug!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  adminNombre!: string;

  @IsOptional()
  @IsEnum(['independiente', 'basico', 'premium'])
  planId?: 'independiente' | 'basico' | 'premium';

  @IsOptional()
  @IsEnum(['barberia', 'salon_belleza', 'spa_masajes', 'veterinaria', 'clinica_medica', 'taller_mecanico', 'espacio_alquiler', 'otro'])
  industria?: 'barberia' | 'salon_belleza' | 'spa_masajes' | 'veterinaria' | 'clinica_medica' | 'taller_mecanico' | 'espacio_alquiler' | 'otro';

  @IsOptional()
  @IsString()
  terminologiaEmpleado?: string;

  @IsOptional()
  @IsString()
  terminologiaServicio?: string;

  @IsOptional()
  @IsString()
  terminologiaCliente?: string;
}
