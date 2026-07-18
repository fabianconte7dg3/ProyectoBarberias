import { IsString, IsNotEmpty, IsEnum, IsOptional, ValidateNested, IsArray, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class DiaHorarioDto {
  @IsEnum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'])
  diaSemana: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato de horaInicio inválido. Use HH:mm' })
  horaInicio: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato de horaFin inválido. Use HH:mm' })
  horaFin: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato inválido. Use HH:mm' })
  horaAlmuerzoInicio?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato inválido. Use HH:mm' })
  horaAlmuerzoFin?: string;
}

export class UpsertHorarioSemanalDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiaHorarioDto)
  dias: DiaHorarioDto[];
}
