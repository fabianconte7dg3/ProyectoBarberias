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
}
