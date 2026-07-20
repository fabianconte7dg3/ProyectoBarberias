import { IYappyInitResponse, IYappyPort } from './yappy.port';
export declare class YappyManualAdapter implements IYappyPort {
    private readonly numeroPersonal;
    constructor(numeroPersonal: string);
    initiatePayment(orderId: string, monto: number): Promise<IYappyInitResponse>;
}
