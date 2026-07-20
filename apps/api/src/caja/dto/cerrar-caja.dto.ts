import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CerrarCajaDto {
  @IsNumber()
  efectivoDeclarado: number;

  @IsOptional()
  @IsString()
  notasAdmin?: string;
}
