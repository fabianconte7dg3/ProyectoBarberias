import { estadoCitaEnum } from '../../database/schema';
export declare class UpdateEstadoCitaDto {
    estado: typeof estadoCitaEnum.enumValues[number];
}
