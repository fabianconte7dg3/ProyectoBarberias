import { IsString, IsOptional, Matches, MaxLength, IsNumber, Min, IsInt, IsBoolean, IsDateString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class FilaImportClienteDto {
  @IsString()
  @MaxLength(255)
  nombreCompleto!: string;

  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'El teléfono debe contener entre 7 y 15 dígitos con prefijo opcional (+)',
  })
  telefonoWhatsapp!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notasPreferencia?: string;
}

export class FilaImportProductoDto {
  @IsString()
  @MaxLength(255)
  nombre!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioVenta!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costoCompra!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockActual!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockMinimo?: number;
}

export class FilaImportServicioDto {
  @IsString()
  @MaxLength(255)
  nombre!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioBase!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  duracionMinutos!: number;
}

// Migración de historial de citas pasadas — ver
// Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §7. A diferencia de
// FilaImportClienteDto, aquí el cliente y el servicio deben existir YA
// (se matchean, no se crean) — una cita histórica no debería poder generar
// clientes/servicios fantasma con datos parciales.
export class FilaImportCitaHistoricaDto {
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'El teléfono debe contener entre 7 y 15 dígitos con prefijo opcional (+)',
  })
  telefonoWhatsapp!: string;

  @IsString()
  @MaxLength(255)
  servicioNombre!: string;

  @IsDateString()
  fecha!: string; // inicioEstimado de la visita pasada

  @IsOptional()
  @IsString()
  @MaxLength(255)
  empleadoNombre?: string;

  @IsOptional()
  @IsIn(['completada', 'ausente_strike', 'cancelada'])
  estado?: 'completada' | 'ausente_strike' | 'cancelada';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;

  // Si se provee, suma a clientes.totalGastado cuando estado=completada. No se
  // crea una transacción real (sería falsear el libro fiscal/DGI) — ver decisión
  // documentada en Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §7.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monto?: number;
}
