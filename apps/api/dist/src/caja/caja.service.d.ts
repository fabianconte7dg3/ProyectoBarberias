import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { AuditService } from '../audit/audit.service';
export declare class CajaService {
    private readonly auditService;
    constructor(auditService: AuditService);
    getBalanceDelDia(): Promise<{
        fecha: Date;
        efectivoEsperado: number;
        cantidadTransaccionesEfectivo: any;
    }>;
    cerrarCaja(usuarioId: string, dto: CerrarCajaDto, ipOrigen?: string, userAgent?: string): Promise<any>;
}
