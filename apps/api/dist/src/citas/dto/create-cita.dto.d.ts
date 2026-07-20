import { origenCitaEnum } from '../../database/schema';
export declare class CreateCitaDto {
    clienteId?: string;
    barberoId: string;
    servicioId: string;
    inicioEstimado: string;
    origen: typeof origenCitaEnum.enumValues[number];
}
