import { IsOptional, IsString, Length, Matches, IsUrl } from 'class-validator';

export class UpdateIdentidadDto {
  @IsOptional()
  @IsString()
  @Length(1, 255, { message: 'El nombre comercial debe tener entre 1 y 255 caracteres.' })
  nombreComercial?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50, { message: 'El RUC no puede superar los 50 caracteres.' })
  ruc?: string;

  @IsOptional()
  @IsString()
  @Length(0, 30, { message: 'El teléfono del negocio no puede superar los 30 caracteres.' })
  telefonoNegocio?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color primario debe ser un hex válido, ej. #b0004a.' })
  colorPrimario?: string;

  @IsOptional()
  @IsUrl({}, { message: 'La URL del logo debe ser una URL válida.' })
  logoUrl?: string;
}
