import { IYappyInitResponse, IYappyPort } from './yappy.port';

export class YappyManualAdapter implements IYappyPort {
  constructor(private readonly numeroPersonal: string) {}

  async initiatePayment(orderId: string, monto: number): Promise<IYappyInitResponse> {
    // En modo manual, no hay llamadas al API real. 
    // Solo devolvemos la info necesaria para que el cajero le pida al cliente que transfiera al número.
    return {
      modo: 'manual',
      orderId,
      numeroPersonal: this.numeroPersonal,
    };
  }
}
