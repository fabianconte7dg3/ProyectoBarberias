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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const database_constants_1 = require("../database/tenant/database.constants");
const schema = __importStar(require("../database/schema"));
const crypto = __importStar(require("crypto"));
const tenant_utils_1 = require("../database/tenant/tenant.utils");
let AuditService = AuditService_1 = class AuditService {
    db;
    logger = new common_1.Logger(AuditService_1.name);
    constructor(db) {
        this.db = db;
    }
    async logAction(params) {
        try {
            const registro = {
                tenantId: params.tenantId || null,
                usuarioId: params.usuarioId || null,
                tablaAfectada: params.tablaAfectada,
                registroId: params.registroId || crypto.randomUUID(),
                accion: params.accion,
                payloadAntes: params.payloadAntes || null,
                payloadDespues: params.payloadDespues || null,
                ipOrigen: params.ipOrigen || '127.0.0.1',
                userAgent: params.userAgent || 'unknown',
            };
            if (params.tenantId) {
                await (0, tenant_utils_1.runInTenantScope)(this.db, params.tenantId, async (tx) => {
                    await tx.insert(schema.auditLogs).values(registro);
                });
            }
            else {
                await this.db.insert(schema.auditLogs).values(registro);
            }
            this.logger.log(`Audit log: [${params.accion}] en ${params.tablaAfectada} (User: ${params.usuarioId || 'system'})`);
        }
        catch (error) {
            this.logger.error('CRITICAL: Error al escribir log de auditoría', error);
        }
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [Function])
], AuditService);
//# sourceMappingURL=audit.service.js.map