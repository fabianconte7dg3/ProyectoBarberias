import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateServicioDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  duracionMinutos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioBase?: number;
}
