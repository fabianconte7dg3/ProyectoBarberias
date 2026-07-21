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
var CitasProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitasProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const database_constants_1 = require("../database/tenant/database.constants");
const schema = __importStar(require("../database/schema"));
const drizzle_orm_1 = require("drizzle-orm");
const tenant_utils_1 = require("../database/tenant/tenant.utils");
let CitasProcessor = CitasProcessor_1 = class CitasProcessor extends bullmq_1.WorkerHost {
    db;
    whatsappService;
    logger = new common_1.Logger(CitasProcessor_1.name);
    constructor(db, whatsappService) {
        super();
        this.db = db;
        this.whatsappService = whatsappService;
    }
    async process(job) {
        this.logger.log(`Procesando job ${job.name} (ID: ${job.id})`);
        switch (job.name) {
            case 'recordatorio_24h':
                return this.handleRecordatorio24h(job.data.citaId, job.data.tenantId);
            case 'cancelacion_retraso':
                return this.handleCancelacionRetraso(job.data.citaId, job.data.tenantId);
            case 'recordatorio_deuda':
                return this.handleRecordatorioDeuda(job.data.transaccionId, job.data.tenantId);
            case 'cierre_emergencia_masivo':
                return this.handleCierreEmergencia(job.data.clienteId, job.data.tenantId);
            default:
                this.logger.warn(`Job desconocido: ${job.name}`);
        }
    }
    async handleRecordatorio24h(citaId, tenantId) {
        const result = await (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async (tx) => {
            return await tx.query.citas.findFirst({
                where: (0, drizzle_orm_1.eq)(schema.citas.id, citaId),
                with: {
                    cliente: true,
                    barbero: true,
                    servicio: true,
                },
            });
        });
        if (!result || result.estado !== 'programada') {
            this.logger.log(`Recordatorio omitido para cita ${citaId}: no encontrada o no está programada.`);
            return;
        }
        const fecha = new Date(result.inicioEstimado);
        const strHora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const mensaje = `Hola ${result.cliente?.nombreCompleto || ''}, te recordamos tu cita para *${result.servicio.nombre}* con ${result.barbero.nombreCompleto} mañana a las ${strHora}. \n\nResponde:\n1️⃣ para Confirmar\n2️⃣ para Cancelar`;
        if (result.cliente?.telefonoWhatsapp) {
            let interactedRecently = false;
            if (result.cliente.ultimoMensajeRecibidoAt) {
                const lastMsgDate = new Date(result.cliente.ultimoMensajeRecibidoAt);
                const diffHrs = (Date.now() - lastMsgDate.getTime()) / (1000 * 60 * 60);
                if (diffHrs <= 24) {
                    interactedRecently = true;
                }
            }
            if (interactedRecently) {
                await this.whatsappService.enviarMensajeTexto(tenantId, result.cliente.telefonoWhatsapp, mensaje);
            }
            else {
                this.logger.log(`Recordatorio 24h omitido por falta de interacción reciente (Anti-Spam) para cita ${citaId}`);
            }
        }
    }
    async handleCancelacionRetraso(citaId, tenantId) {
        await (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async (tx) => {
            const cita = await tx.query.citas.findFirst({
                where: (0, drizzle_orm_1.eq)(schema.citas.id, citaId),
                with: { cliente: true },
            });
            if (!cita || cita.estado !== 'programada') {
                this.logger.log(`Cancelación automática omitida para cita ${citaId}: ya cambió de estado.`);
                return;
            }
            await tx.update(schema.citas).set({ estado: 'ausente_strike' }).where((0, drizzle_orm_1.eq)(schema.citas.id, citaId));
            if (cita.clienteId) {
                const clienteData = await tx.query.clientes.findFirst({
                    where: (0, drizzle_orm_1.eq)(schema.clientes.id, cita.clienteId)
                });
                if (clienteData) {
                    await tx.update(schema.clientes)
                        .set({ ausenciasStrikes: clienteData.ausenciasStrikes + 1 })
                        .where((0, drizzle_orm_1.eq)(schema.clientes.id, cita.clienteId));
                    if (clienteData.telefonoWhatsapp) {
                        await this.whatsappService.enviarMensajeTexto(tenantId, clienteData.telefonoWhatsapp, `Hola ${clienteData.nombreCompleto || ''}, tu cita ha sido cancelada por inasistencia (15 min de retraso).`);
                    }
                }
            }
        });
    }
    async handleRecordatorioDeuda(transaccionId, tenantId) {
        this.logger.log(`Recordatorio de deuda enviado (simulado) para tx ${transaccionId}`);
    }
    async handleCierreEmergencia(clienteId, tenantId) {
        this.logger.log(`Mensaje de cierre de emergencia (simulado) para cliente ${clienteId}`);
    }
};
exports.CitasProcessor = CitasProcessor;
exports.CitasProcessor = CitasProcessor = CitasProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('CITAS_QUEUE', {
        concurrency: 5,
        limiter: {
            max: 1,
            duration: 5000,
        }
    }),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [Function, whatsapp_service_1.WhatsappService])
], CitasProcessor);
//# sourceMappingURL=citas.processor.js.map