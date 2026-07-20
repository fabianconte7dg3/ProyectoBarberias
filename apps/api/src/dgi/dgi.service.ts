import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DgiService {
  private readonly logger = new Logger(DgiService.name);

  /**
   * Simula la emisión de una factura electrónica ante la DGI.
   * Al ser asíncrono, no bloquea el flujo de cobro principal.
   */
  async emitirFacturaAsync(
    tenantId: string,
    transaccionId: string,
    monto: string,
    rucCliente?: string | null,
    nombreCliente?: string | null
  ): Promise<void> {
    // Aquí iría la integración real con el PAC (Proveedor Autorizado Calificado) de la DGI
    this.logger.log(`[DGI] Emitiendo factura para tenant ${tenantId}, Tx: ${transaccionId}, Monto: ${monto}`);
    if (rucCliente) {
      this.logger.log(`[DGI] RUC Cliente: ${rucCliente} - ${nombreCliente}`);
    }

    // Simulamos retardo de red
    setTimeout(() => {
      this.logger.log(`[DGI] Factura emitida exitosamente para Tx: ${transaccionId}`);
    }, 2000);
  }
}

