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
  @IsEnum(['basico', 'premium'])
  planId?: 'basico' | 'premium';
}
