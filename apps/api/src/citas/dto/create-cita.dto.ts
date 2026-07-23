import { IsUUID, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { origenCitaEnum } from '../../database/schema';

export class CreateCitaDto {
  @IsUUID()
  @IsOptional()
  clienteId?: string; // Nullable for walk-ins where we don't have their details yet

  @IsUUID()
  @IsOptional()
  barberoId?: string;

  @IsUUID()
  servicioId: string;

  @IsDateString()
  inicioEstimado: string;

  @IsEnum(origenCitaEnum.enumValues)
  origen: typeof origenCitaEnum.enumValues[number];
}
