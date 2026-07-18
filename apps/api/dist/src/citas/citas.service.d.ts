import { citas } from '../database/schema';
export declare class CitasService {
    listarCitasDeHoy(): Promise<any>;
    crearCita(data: typeof citas.$inferInsert): Promise<any>;
    cancelarCita(citaId: string): Promise<any>;
}
