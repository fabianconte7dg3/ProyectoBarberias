import { IsUUID, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateNotaClinicaDto {
  @IsUUID()
  citaId: string;

  @IsUUID()
  pacienteId: string;

  @IsOptional()
  @IsString()
  diagnostico?: string;

  @IsOptional()
  @IsString()
  tratamiento?: string;

  @IsOptional()
  @IsDateString()
  proximaRevisionEn?: string;
}
