import { IsString, IsNumber, IsOptional, IsBoolean, Min, IsNotEmpty } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @Min(0.01)
  precioVenta: number;

  @IsNumber()
  @Min(0)
  costoCompra: number;

  @IsNumber()
  @Min(0)
  stockActual: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockMinimo?: number;
}

export class UpdateProductoDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  precioVenta?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  costoCompra?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockActual?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockMinimo?: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
