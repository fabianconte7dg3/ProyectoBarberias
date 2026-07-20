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
const tenant_utils_1 = require("../database/tenant/tenant.utils");
const yappy_manual_adapter_1 = require("./adapters/yappy-manual.adapter");
const yappy_comercial_adapter_1 = require("./adapters/yappy-comercial.adapter");
const schema = __importStar(require("../database/schema"));
const dgi_service_1 = require("../dgi/dgi.service");
const ENCRYPTION_KEY = process.env.APP_SECRET || '12345678901234567890123456789012';
const IV_LENGTH = 16;
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}
function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
let YappyService = class YappyService {
    dgiService;
    constructor(dgiService) {
        this.dgiService = dgiService;
    }
    async getAdapter(tenantId, db) {
        const currentDb = db || tenant_context_1.TenantContext.getDb();
        const config = await currentDb.query.yappyConfig.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.yappyConfig.tenantId, tenantId),
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
            let secretKey;
            try {
                secretKey = decrypt(config.secretKeyCifrada);
            }
            catch (e) {
                throw new common_1.InternalServerErrorException('Error descifrando la llave secreta de Yappy');
            }
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
        const config = await globalDb.query.yappyConfig.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.yappyConfig.tenantId, txInfo.tenantId),
        });
        if (!config || config.modo !== 'comercial' || !config.secretKeyCifrada) {
            throw new common_1.UnauthorizedException('Configuración Yappy inválida para este tenant');
        }
        let secretKey;
        try {
            secretKey = decrypt(config.secretKeyCifrada);
        }
        catch (e) {
            throw new common_1.InternalServerErrorException('Error descifrando la llave secreta');
        }
        const dataToHash = `${orderId}${status}${domain}`;
        const expectedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataToHash)
            .digest('hex');
        if (hash !== expectedHash) {
            throw new common_1.UnauthorizedException('Hash inválido');
        }
        await (0, tenant_utils_1.runInTenantScope)(globalDb, txInfo.tenantId, async (tenantDb) => {
            if (status === 'E') {
                console.log(`Pago Yappy ${orderId} exitoso`);
                await tenantDb.update(schema_1.citas)
                    .set({ estado: 'completada' })
                    .where((0, drizzle_orm_1.eq)(schema_1.citas.id, txInfo.citaId));
                this.dgiService.emitirFacturaAsync(txInfo.tenantId, txInfo.id, txInfo.totalFacturado, txInfo.rucCliente, txInfo.nombreFiscalCliente).catch(err => console.error('Error al emitir factura a DGI desde Yappy IPN:', err));
            }
            else if (status === 'R' || status === 'C' || status === 'X') {
                console.log(`Pago Yappy ${orderId} falló con estado: ${status}`);
                if (status === 'C' || status === 'X') {
                    await tenantDb.update(schema_1.citas)
                        .set({ estado: 'cancelada' })
                        .where((0, drizzle_orm_1.eq)(schema_1.citas.id, txInfo.citaId));
                }
            }
            else {
                console.warn(`Estado Yappy desconocido: ${status}`);
            }
        });
        return { success: true };
    }
};
exports.YappyService = YappyService;
exports.YappyService = YappyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [dgi_service_1.DgiService])
], YappyService);
//# sourceMappingURL=yappy.service.js.map