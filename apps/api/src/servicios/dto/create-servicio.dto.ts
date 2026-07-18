import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateServicioDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  @Min(5)
  duracionMinutos: number;

  @IsNumber()
  @Min(0)
  precioBase: number;
}
