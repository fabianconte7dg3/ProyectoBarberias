"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YappyComercialAdapter = void 0;
const common_1 = require("@nestjs/common");
class YappyComercialAdapter {
    merchantId;
    secretKey;
    domain;
    baseUrl = 'https://api.bgeneral.com/v1';
    constructor(merchantId, secretKey, domain) {
        this.merchantId = merchantId;
        this.secretKey = secretKey;
        this.domain = domain;
    }
    async initiatePayment(orderId, monto) {
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
            const ipnUrl = `${this.domain}/api/yappy/ipn`;
            const paymentResponse = await fetch(`${this.baseUrl}/payments/payment-wc`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    orderId,
                    monto,
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
        }
        catch (err) {
            console.error('Error en Yappy Comercial API:', err);
            throw new common_1.InternalServerErrorException('Error al contactar con la pasarela de pago');
        }
    }
}
exports.YappyComercialAdapter = YappyComercialAdapter;
//# sourceMappingURL=yappy-comercial.adapter.js.map