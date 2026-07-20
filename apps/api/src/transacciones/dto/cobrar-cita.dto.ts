import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CobrarCitaDto {
  @IsEnum(['efectivo', 'yappy', 'mixto', 'deuda'])
  metodoPago: 'efectivo' | 'yappy' | 'mixto' | 'deuda';

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
}
