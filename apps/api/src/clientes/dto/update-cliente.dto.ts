import { IsString, IsOptional, MaxLength, IsUUID, IsBoolean } from 'class-validator';

export class UpdateClienteDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombreCompleto?: string;

  @IsOptional()
  @IsString()
  notasPreferencia?: string;

  @IsOptional()
  @IsUUID()
  barberoFrecuenteId?: string;

  @IsOptional()
  @IsBoolean()
  bloqueado?: boolean;
}
