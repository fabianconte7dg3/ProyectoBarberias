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
var WhatsappService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const database_constants_1 = require("../database/tenant/database.constants");
const schema = __importStar(require("../database/schema"));
const drizzle_orm_1 = require("drizzle-orm");
let WhatsappService = WhatsappService_1 = class WhatsappService {
    db;
    configService;
    logger = new common_1.Logger(WhatsappService_1.name);
    constructor(db, configService) {
        this.db = db;
        this.configService = configService;
    }
    async enviarMensajeTexto(tenantId, telefono, mensaje) {
        try {
            const config = await this.db.query.whatsappConfig.findFirst({
                where: (0, drizzle_orm_1.eq)(schema.whatsappConfig.tenantId, tenantId),
            });
            if (!config) {
                this.logger.warn(`No hay configuración de WhatsApp para el tenant ${tenantId}`);
                return false;
            }
            if (config.estado === 'desconectado' || config.estado === 'suspendido') {
                this.logger.error(`Tenant ${tenantId} intentó enviar mensaje pero su estado WhatsApp es ${config.estado}. Alertando a administrador.`);
                return false;
            }
            const globalApiKey = this.configService.get('EVOLUTION_API_KEY');
            if (!globalApiKey) {
                this.logger.warn('EVOLUTION_API_KEY no está configurada en .env');
                return false;
            }
            const url = `${config.evolutionServerUrl.replace(/\/$/, '')}/message/sendText/${config.evolutionInstanceName}`;
            const cleanPhone = telefono.replace(/[^0-9]/g, '');
            this.logger.log(`Enviando mensaje a ${cleanPhone} vía Evolution API (${config.evolutionInstanceName})...`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': globalApiKey,
                },
                body: JSON.stringify({
                    number: cleanPhone,
                    text: mensaje,
                }),
            });
            if (!response.ok) {
                const errorData = await response.text();
                this.logger.error(`Error enviando mensaje: HTTP ${response.status} - ${errorData}`);
                return false;
            }
            return true;
        }
        catch (error) {
            this.logger.error('Excepción enviando mensaje de WhatsApp:', error);
            return false;
        }
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = WhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [Function, config_1.ConfigService])
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map