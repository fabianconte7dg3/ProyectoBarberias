import { IsString, IsOptional, Matches, MaxLength, IsNumber, Min, IsInt, IsBoolean } from 'class-validator';
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

  @IsOptional()
  @IsBoolean()
  aceptaMarketing?: boolean;
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
