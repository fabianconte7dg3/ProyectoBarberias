export interface IYappyInitResponse {
  transactionId?: string; // Solo en comercial
  token?: string;         // Solo en comercial
  documentName?: string;  // Solo en comercial
  numeroPersonal?: string; // Para modo manual
  modo: 'manual' | 'comercial';
  orderId: string;
}

export interface IYappyPort {
  initiatePayment(orderId: string, monto: number): Promise<IYappyInitResponse>;
}
