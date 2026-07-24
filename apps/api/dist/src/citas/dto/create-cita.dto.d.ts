import { origenCitaEnum } from '../../database/schema';
export declare class CreateCitaDto {
    clienteId?: string;
    empleadoId?: string;
    servicioId: string;
    inicioEstimado: string;
    origen: typeof origenCitaEnum.enumValues[number];
}
