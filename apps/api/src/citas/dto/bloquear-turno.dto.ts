import { IsUUID, IsDateString, IsString, IsOptional } from 'class-validator';

export class BloquearTurnoDto {
  @IsUUID()
  empleadoId: string;

  @IsDateString()
  inicio: string;

  @IsDateString()
  fin: string;

  @IsString()
  @IsOptional()
  notas?: string;
}
