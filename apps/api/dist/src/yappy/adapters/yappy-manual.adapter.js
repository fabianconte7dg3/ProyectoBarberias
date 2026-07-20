"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YappyManualAdapter = void 0;
class YappyManualAdapter {
    numeroPersonal;
    constructor(numeroPersonal) {
        this.numeroPersonal = numeroPersonal;
    }
    async initiatePayment(orderId, monto) {
        return {
            modo: 'manual',
            orderId,
            numeroPersonal: this.numeroPersonal,
        };
    }
}
exports.YappyManualAdapter = YappyManualAdapter;
//# sourceMappingURL=yappy-manual.adapter.js.map