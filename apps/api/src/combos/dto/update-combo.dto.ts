import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, ArrayMinSize, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ComboServicioDto } from './create-combo.dto';

export class UpdateComboDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioTotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duracionAjustadaMinutos?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ComboServicioDto)
  servicios?: ComboServicioDto[];
}
