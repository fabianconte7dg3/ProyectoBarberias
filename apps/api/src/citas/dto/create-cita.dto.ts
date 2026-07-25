import { IsUUID, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { origenCitaEnum } from '../../database/schema';

export class CreateCitaDto {
  @IsUUID()
  @IsOptional()
  clienteId?: string; // Nullable for walk-ins where we don't have their details yet

  @IsUUID()
  @IsOptional()
  empleadoId?: string;

  // Exactamente uno de servicioId/comboId debe venir — validado en CitasService.crearCita,
  // no aquí (regla de aplicación, no de DTO, para mensajes de error más claros).
  @IsUUID()
  @IsOptional()
  servicioId?: string;

  @IsUUID()
  @IsOptional()
  comboId?: string;

  @IsUUID()
  @IsOptional()
  pacienteId?: string; // Multi-industria: mascota/paciente atendido (veterinaria/clínica)

  @IsDateString()
  inicioEstimado: string;

  @IsEnum(origenCitaEnum.enumValues)
  origen: typeof origenCitaEnum.enumValues[number];
}
