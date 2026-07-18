import { IsString, IsNotEmpty, Length } from 'class-validator';

export class ActivateStaffDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @Length(4, 4, { message: 'El PIN debe ser exactamente de 4 dígitos' })
  pin: string;
}
