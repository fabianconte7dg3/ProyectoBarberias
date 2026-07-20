export declare class DgiService {
    private readonly logger;
    emitirFacturaAsync(tenantId: string, transaccionId: string, monto: string, rucCliente?: string | null, nombreCliente?: string | null): Promise<void>;
}
