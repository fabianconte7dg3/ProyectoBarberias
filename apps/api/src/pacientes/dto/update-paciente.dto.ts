import { IsString, IsOptional, IsObject, IsBoolean, MaxLength } from 'class-validator';

export class UpdatePacienteDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre?: string;

  @IsOptional()
  @IsObject()
  camposPersonalizados?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
