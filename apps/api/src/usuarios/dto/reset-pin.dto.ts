import { IsString, Length } from 'class-validator';

export class ResetPinDto {
  @IsString()
  @Length(4, 4, { message: 'El PIN debe ser exactamente de 4 dígitos' })
  nuevoPin: string;
}
