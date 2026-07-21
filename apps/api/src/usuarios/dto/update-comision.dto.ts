import { IsNumber, Min, Max } from 'class-validator';

export class UpdateComisionDto {
  @IsNumber({}, { message: 'El porcentaje de comisión debe ser un número válido.' })
  @Min(0, { message: 'El porcentaje de comisión no puede ser menor a 0%.' })
  @Max(100, { message: 'El porcentaje de comisión no puede ser mayor a 100%.' })
  porcentajeComision: number;
}
