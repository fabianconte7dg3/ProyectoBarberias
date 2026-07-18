export declare class CreateBloqueoDto {
    barberoId: string;
    inicio: string;
    fin: string;
    tipo: 'almuerzo_dinamico' | 'walk_in' | 'lock_reserva' | 'emergencia' | 'extension_turno';
    motivo?: string;
}
