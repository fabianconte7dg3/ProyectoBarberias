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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DgiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DgiService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const database_constants_1 = require("../database/tenant/database.constants");
const tenant_utils_1 = require("../database/tenant/tenant.utils");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const crypto = __importStar(require("crypto"));
let DgiService = DgiService_1 = class DgiService {
    db;
    logger = new common_1.Logger(DgiService_1.name);
    constructor(db) {
        this.db = db;
    }
    async emitirFacturaAsync(tenantId, transaccionId, monto, rucCliente, nombreCliente) {
        this.logger.log(`[DGI] Emitiendo factura para tenant ${tenantId}, Tx: ${transaccionId}, Monto: ${monto}`);
        setTimeout(async () => {
            try {
                await (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async (tx) => {
                    const numeroFacturaDgi = `DGI-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
                    await tx.update(schema_1.transacciones)
                        .set({
                        estadoDgi: 'emitida',
                        numeroFacturaDgi
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.transacciones.id, transaccionId));
                    this.logger.log(`[DGI] Factura emitida exitosamente para Tx: ${transaccionId}. Factura: ${numeroFacturaDgi}`);
                });
            }
            catch (error) {
                this.logger.error(`[DGI] Error emitiendo factura para Tx: ${transaccionId}`, error);
            }
        }, 2000);
    }
};
exports.DgiService = DgiService;
exports.DgiService = DgiService = DgiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], DgiService);
//# sourceMappingURL=dgi.service.js.map