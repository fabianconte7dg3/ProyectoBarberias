import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class InviteStaffDto {
  @IsString()
  @IsNotEmpty()
  nombreCompleto: string;

  @IsEnum(['empleado', 'recepcion'])
  rol: 'empleado' | 'recepcion';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  porcentajeComision?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  porcentajeComisionProducto?: number;
}
