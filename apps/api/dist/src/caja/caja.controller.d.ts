import { CajaService } from './caja.service';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
export declare class CajaController {
    private readonly cajaService;
    constructor(cajaService: CajaService);
    getBalance(): Promise<{
        fecha: Date;
        efectivoEsperado: number;
        cantidadTransaccionesEfectivo: any;
    }>;
    cerrarCaja(req: any, dto: CerrarCajaDto): Promise<any>;
}
