import { IYappyInitResponse, IYappyPort } from './yappy.port';
export declare class YappyComercialAdapter implements IYappyPort {
    private readonly merchantId;
    private readonly secretKey;
    private readonly domain;
    private readonly baseUrl;
    constructor(merchantId: string, secretKey: string, domain: string);
    initiatePayment(orderId: string, monto: number): Promise<IYappyInitResponse>;
}
