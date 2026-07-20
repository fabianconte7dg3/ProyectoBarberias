import { CerrarCajaDto } from './dto/cerrar-caja.dto';
export declare class CajaService {
    getBalanceDelDia(): Promise<{
        fecha: any;
        efectivoEsperado: number;
        cantidadTransaccionesEfectivo: any;
    }>;
    cerrarCaja(usuarioId: string, dto: CerrarCajaDto): Promise<any>;
}
