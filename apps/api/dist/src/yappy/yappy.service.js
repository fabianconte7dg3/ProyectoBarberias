"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YappyService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const crypto = __importStar(require("crypto"));
const schema_1 = require("../database/schema");
const tenant_context_1 = require("../database/tenant/tenant-context");
const yappy_manual_adapter_1 = require("./adapters/yappy-manual.adapter");
const yappy_comercial_adapter_1 = require("./adapters/yappy-comercial.adapter");
const schema = __importStar(require("../database/schema"));
const dgi_service_1 = require("../dgi/dgi.service");
let YappyService = class YappyService {
    dgiService;
    constructor(dgiService) {
        this.dgiService = dgiService;
    }
    async getAdapter(tenantId, db) {
        const currentDb = db || tenant_context_1.TenantContext.getDb();
        const config = await currentDb.query.yappy_config.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.yappy_config.tenantId, tenantId),
        });
        if (!config) {
            return new yappy_manual_adapter_1.YappyManualAdapter('NO_CONFIG');
        }
        if (config.modo === 'manual') {
            return new yappy_manual_adapter_1.YappyManualAdapter(config.numeroPersonal || '');
        }
        else {
            if (!config.merchantId || !config.secretKeyCifrada) {
                throw new common_1.InternalServerErrorException('Configuración de Yappy Comercial incompleta');
            }
            const secretKey = config.secretKeyCifrada;
            const domain = process.env.APP_DOMAIN || 'https://midominio.com';
            return new yappy_comercial_adapter_1.YappyComercialAdapter(config.merchantId, secretKey, domain);
        }
    }
    async initiatePayment(tenantId, orderId, monto) {
        const adapter = await this.getAdapter(tenantId);
        return adapter.initiatePayment(orderId, monto);
    }
    async processIpn(orderId, status, hash, domain, globalDb) {
        const txInfo = await globalDb.query.transacciones.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.transacciones.yappyOrderId, orderId),
        });
        if (!txInfo) {
            throw new common_1.UnauthorizedException('Orden no encontrada');
        }
        const config = await globalDb.query.yappy_config.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.yappy_config.tenantId, txInfo.tenantId),
        });
        if (!config || config.modo !== 'comercial' || !config.secretKeyCifrada) {
            throw new common_1.UnauthorizedException('Configuración Yappy inválida para este tenant');
        }
        const dataToHash = `${orderId}${status}${domain}`;
        const expectedHash = crypto
            .createHmac('sha256', config.secretKeyCifrada)
            .update(dataToHash)
            .digest('hex');
        if (hash !== expectedHash) {
            throw new common_1.UnauthorizedException('Hash inválido');
        }
        if (status === 'E') {
            console.log(`Pago Yappy ${orderId} exitoso`);
            await globalDb.update(schema_1.citas)
                .set({ estado: 'completada' })
                .where((0, drizzle_orm_1.eq)(schema_1.citas.id, txInfo.citaId));
            this.dgiService.emitirFacturaAsync(txInfo.tenantId, txInfo.id, txInfo.totalFacturado, txInfo.rucCliente, txInfo.nombreFiscalCliente).catch(err => console.error('Error al emitir factura a DGI desde Yappy IPN:', err));
        }
        else {
            console.log(`Pago Yappy ${orderId} falló/cancelado con estado: ${status}`);
        }
        return { success: true };
    }
};
exports.YappyService = YappyService;
exports.YappyService = YappyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [dgi_service_1.DgiService])
], YappyService);
//# sourceMappingURL=yappy.service.js.map