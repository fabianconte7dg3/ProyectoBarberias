import { IsString, IsNotEmpty, IsUUID, IsOptional, IsObject, MaxLength } from 'class-validator';

export class CreatePacienteDto {
  @IsUUID()
  clienteId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre: string;

  @IsOptional()
  @IsObject()
  camposPersonalizados?: Record<string, unknown>;
}
