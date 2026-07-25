import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, IsArray, ValidateNested, ArrayMinSize, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ComboServicioDto {
  @IsUUID()
  servicioId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  orden?: number;

  @IsNumber()
  @Min(0)
  precioAsignado: number;
}

export class CreateComboDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  @Min(0)
  precioTotal: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duracionAjustadaMinutos?: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ComboServicioDto)
  servicios: ComboServicioDto[];
}
