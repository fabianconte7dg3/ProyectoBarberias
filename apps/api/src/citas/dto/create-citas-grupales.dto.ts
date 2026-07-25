import { IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCitaDto } from './create-cita.dto';

export class CreateCitasGrupalesDto {
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateCitaDto)
  citas: CreateCitaDto[];
}
