import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateClienteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  telefonoWhatsapp: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombreCompleto?: string;

  @IsOptional()
  @IsString()
  notasPreferencia?: string;
}
