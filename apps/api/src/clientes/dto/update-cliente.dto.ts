import { IsString, IsOptional, MaxLength, IsUUID, IsBoolean, IsEmail } from 'class-validator';

export class UpdateClienteDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombreCompleto?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  emailFacturacion?: string;

  @IsOptional()
  @IsString()
  notasPreferencia?: string;

  @IsOptional()
  @IsUUID()
  barberoFrecuenteId?: string;

  @IsOptional()
  @IsBoolean()
  bloqueado?: boolean;

  @IsOptional()
  @IsBoolean()
  aceptaMarketing?: boolean;
}
