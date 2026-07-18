import { IsString, IsNotEmpty, IsEmail, MinLength, Matches } from 'class-validator';

export class RegisterBarberiaDto {
  @IsString()
  @IsNotEmpty()
  nombreComercial: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'El slug solo puede contener letras minúsculas, números y guiones.' })
  slug: string;

  @IsString()
  @IsNotEmpty()
  adminNombreCompleto: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  adminPassword: string;
}
