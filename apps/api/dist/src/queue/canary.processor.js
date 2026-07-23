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
var CanaryProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanaryProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const database_constants_1 = require("../database/tenant/database.constants");
const schema = __importStar(require("../database/schema"));
const drizzle_orm_1 = require("drizzle-orm");
let CanaryProcessor = CanaryProcessor_1 = class CanaryProcessor extends bullmq_1.WorkerHost {
    db;
    logger = new common_1.Logger(CanaryProcessor_1.name);
    constructor(db) {
        super();
        this.db = db;
    }
    async process(job) {
        this.logger.log(`Ejecutando Canario de RLS (Job: ${job.id || job.name})...`);
        try {
            const resCitas = await this.db.execute((0, drizzle_orm_1.sql) `SELECT COUNT(*)::INT as count FROM citas`);
            const citasCount = Number(resCitas.rows[0]?.count || 0);
            const resClientes = await this.db.execute((0, drizzle_orm_1.sql) `SELECT COUNT(*)::INT as count FROM clientes`);
            const clientesCount = Number(resClientes.rows[0]?.count || 0);
            if (citasCount > 0 || clientesCount > 0) {
                const breachMsg = `¡ALERTA CRÍTICA! Se detectó fuga de aislamiento RLS. Filas expuestas sin tenant scope: ${citasCount} citas, ${clientesCount} clientes.`;
                this.logger.error(`CRITICAL: ${breachMsg}`);
                await this.db.insert(schema.alertasSeguridad).values({
                    tipo: 'canario_rls',
                    nivel: 'critical',
                    mensaje: breachMsg,
                    metadatos: { citasCount, clientesCount, timestamp: new Date().toISOString() },
                });
                return { status: 'RLS_BREACH_DETECTED', citasCount, clientesCount };
            }
            this.logger.log('✅ Canario RLS: Aislamiento íntegro. 0 filas retornadas sin tenant scope.');
            return { status: 'RLS_OK', citasCount: 0, clientesCount: 0 };
        }
        catch (error) {
            this.logger.error('Error al ejecutar verificación del Canario RLS', error);
            throw error;
        }
    }
};
exports.CanaryProcessor = CanaryProcessor;
exports.CanaryProcessor = CanaryProcessor = CanaryProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('CANARY_QUEUE'),
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [Function])
], CanaryProcessor);
//# sourceMappingURL=canary.processor.js.map