import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID, IsDateString } from 'class-validator';

export class CreateBloqueoDto {
  @IsUUID()
  @IsNotEmpty()
  empleadoId: string;

  @IsDateString()
  @IsNotEmpty()
  inicio: string;

  @IsDateString()
  @IsNotEmpty()
  fin: string;

  @IsEnum(['almuerzo_dinamico', 'walk_in', 'lock_reserva', 'emergencia', 'extension_turno'])
  tipo: 'almuerzo_dinamico' | 'walk_in' | 'lock_reserva' | 'emergencia' | 'extension_turno';

  @IsOptional()
  @IsString()
  motivo?: string;
}
