import { IsEnum } from 'class-validator';
import { estadoCitaEnum } from '../../database/schema';

export class UpdateEstadoCitaDto {
  @IsEnum(estadoCitaEnum.enumValues)
  estado: typeof estadoCitaEnum.enumValues[number];
}
