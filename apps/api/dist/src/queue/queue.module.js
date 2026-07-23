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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const citas_processor_1 = require("./citas.processor");
const canary_processor_1 = require("./canary.processor");
const whatsapp_module_1 = require("../whatsapp/whatsapp.module");
const database_module_1 = require("../database/database.module");
let QueueModule = class QueueModule {
    canaryQueue;
    constructor(canaryQueue) {
        this.canaryQueue = canaryQueue;
    }
    async onModuleInit() {
        try {
            await this.canaryQueue.add('VERIFY_RLS', {}, {
                repeat: { pattern: '0 * * * *' },
                jobId: 'canary-rls-hourly-job',
            });
        }
        catch (err) {
            console.error('Error al inicializar Canary Queue:', err);
        }
    }
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            whatsapp_module_1.WhatsappModule,
            bullmq_1.BullModule.registerQueue({
                name: 'CITAS_QUEUE',
                defaultJobOptions: {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                    removeOnComplete: true,
                    removeOnFail: false,
                },
            }, {
                name: 'CANARY_QUEUE',
                defaultJobOptions: {
                    attempts: 1,
                    removeOnComplete: true,
                    removeOnFail: false,
                },
            }),
        ],
        providers: [citas_processor_1.CitasProcessor, canary_processor_1.CanaryProcessor],
        exports: [bullmq_1.BullModule],
    }),
    __param(0, (0, bullmq_1.InjectQueue)('CANARY_QUEUE')),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], QueueModule);
//# sourceMappingURL=queue.module.js.map