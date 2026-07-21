import { IsEnum, IsNumber, IsOptional, IsString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductoAdicionalDto {
  @IsString()
  productoId: string;

  @IsNumber()
  @Min(1)
  cantidad: number;
}

export class CobrarCitaDto {
  @IsEnum(['efectivo', 'yappy', 'mixto', 'deuda'])
  metodoPago: 'efectivo' | 'yappy' | 'mixto' | 'deuda';

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsNumber()
  montoEfectivoIngresado?: number;

  @IsOptional()
  @IsNumber()
  propinaBarbero?: number;

  @IsOptional()
  @IsString()
  rucCliente?: string;

  @IsOptional()
  @IsString()
  nombreFiscalCliente?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoAdicionalDto)
  productosAdicionales?: ProductoAdicionalDto[];

  @IsOptional()
  @IsString()
  barberoId?: string;
}
