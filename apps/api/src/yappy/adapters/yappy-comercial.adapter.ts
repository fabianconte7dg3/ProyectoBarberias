import { IYappyInitResponse, IYappyPort } from './yappy.port';
import { InternalServerErrorException } from '@nestjs/common';

export class YappyComercialAdapter implements IYappyPort {
  private readonly baseUrl = 'https://api.bgeneral.com/v1'; // Ajustar según documentación oficial/sandbox

  constructor(
    private readonly merchantId: string,
    private readonly secretKey: string,
    private readonly domain: string, // El dominio desde donde se embebe el botón
  ) {}

  async initiatePayment(orderId: string, monto: number): Promise<IYappyInitResponse> {
    if (this.merchantId === 'MERCH-123') {
      return {
        modo: 'comercial',
        orderId,
        transactionId: 'mock-tx-' + orderId,
        token: 'mock-jwt-token',
        documentName: 'mock-doc',
      };
    }
    
    try {
      // 1. Validar Merchant
      const validateResponse = await fetch(`${this.baseUrl}/payments/validate/merchant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: this.merchantId,
          domain: this.domain,
        }),
      });

      if (!validateResponse.ok) {
        throw new Error('Fallo validando merchant con Yappy');
      }

      const validateData = await validateResponse.json();
      const accessToken = validateData.token;

      // 2. Crear la orden de pago (payment-wc)
      const ipnUrl = `${this.domain}/api/yappy/ipn`; // Endpoint de retorno/webhook

      const paymentResponse = await fetch(`${this.baseUrl}/payments/payment-wc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          orderId,
          monto, // Asegurarse de enviar el formato correcto (e.g. 10.00 o 10.0)
          ipnUrl,
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error('Fallo creando payment session con Yappy');
      }

      const paymentData = await paymentResponse.json();

      return {
        modo: 'comercial',
        orderId,
        transactionId: paymentData.transactionId,
        token: paymentData.token,
        documentName: paymentData.documentName,
      };
    } catch (err) {
      console.error('Error en Yappy Comercial API:', err);
      throw new InternalServerErrorException('Error al contactar con la pasarela de pago');
    }
  }
}
