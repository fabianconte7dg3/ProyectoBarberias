export interface IYappyInitResponse {
    transactionId?: string;
    token?: string;
    documentName?: string;
    numeroPersonal?: string;
    modo: 'manual' | 'comercial';
    orderId: string;
}
export interface IYappyPort {
    initiatePayment(orderId: string, monto: number): Promise<IYappyInitResponse>;
}
