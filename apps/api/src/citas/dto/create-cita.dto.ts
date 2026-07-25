import { IsUUID, IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
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

  // Motivo de la visita — requerido a nivel de aplicación (no aquí, el DTO no
  // conoce la industria del tenant) solo para veterinaria/clínica. Ver
  // CitasService.crearCita y Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §6.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;
}
