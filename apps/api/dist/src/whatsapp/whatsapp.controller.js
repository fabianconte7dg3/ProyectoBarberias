"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WhatsappController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappController = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_service_1 = require("./whatsapp.service");
const public_decorator_1 = require("../common/decorators/public.decorator");
let WhatsappController = WhatsappController_1 = class WhatsappController {
    whatsappService;
    logger = new common_1.Logger(WhatsappController_1.name);
    constructor(whatsappService) {
        this.whatsappService = whatsappService;
    }
    async handleEvolutionWebhook(tenantId, payload) {
        this.logger.log(`Recibido webhook de Evolution API para tenant ${tenantId}`);
        if (payload?.event === 'messages.upsert' && payload?.data?.message) {
            const msg = payload.data;
            const remoteJid = msg.key.remoteJid;
            const fromMe = msg.key.fromMe;
            if (!fromMe && remoteJid && !remoteJid.includes('@g.us')) {
                const messageContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                const incomingText = messageContent.trim().toLowerCase();
                const telefono = remoteJid.split('@')[0];
                this.logger.log(`Mensaje entrante de ${telefono}: "${incomingText}"`);
                if (incomingText === '1') {
                    await this.whatsappService.enviarMensajeTexto(tenantId, telefono, `¡Perfecto! Para agendar tu cita y ver nuestra disponibilidad en tiempo real, ingresa a nuestro portal web:\n\n🌐 https://reserva.tuberberia.com/${tenantId}`);
                }
                else if (incomingText === '2') {
                    await this.whatsappService.enviarMensajeTexto(tenantId, telefono, `Entendido. Para cancelar tu cita de forma segura, por favor ingresa al link que te llegó en el correo de confirmación, o escribe '3' para hablar con un humano.`);
                }
                else if (incomingText === '3') {
                    await this.whatsappService.enviarMensajeTexto(tenantId, telefono, `Hemos notificado a nuestro equipo. Un humano se pondrá en contacto contigo a la brevedad posible. 🕒`);
                }
                else {
                    const menu = `¡Hola! Soy el asistente virtual de la barbería. 🤖\n\nPor favor, responde con el número de la opción que deseas:\n\n1️⃣ Agendar una nueva cita\n2️⃣ Cancelar una cita existente\n3️⃣ Hablar con un humano\n\n*Nota:* Para garantizar la mejor atención, mi comprensión de texto es limitada, ¡solo escribe el número!`;
                    await this.whatsappService.enviarMensajeTexto(tenantId, telefono, menu);
                }
            }
        }
        return { status: 'ok' };
    }
};
exports.WhatsappController = WhatsappController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook/:tenantId'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "handleEvolutionWebhook", null);
exports.WhatsappController = WhatsappController = WhatsappController_1 = __decorate([
    (0, common_1.Controller)('whatsapp'),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsappService])
], WhatsappController);
//# sourceMappingURL=whatsapp.controller.js.map