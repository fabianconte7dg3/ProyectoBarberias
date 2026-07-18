export declare class DiaHorarioDto {
    diaSemana: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
    horaInicio: string;
    horaFin: string;
    horaAlmuerzoInicio?: string;
    horaAlmuerzoFin?: string;
}
export declare class UpsertHorarioSemanalDto {
    dias: DiaHorarioDto[];
}
