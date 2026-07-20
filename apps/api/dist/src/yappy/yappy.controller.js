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
exports.YappyController = void 0;
const common_1 = require("@nestjs/common");
const yappy_service_1 = require("./yappy.service");
const public_decorator_1 = require("../common/decorators/public.decorator");
const database_constants_1 = require("../database/tenant/database.constants");
const node_postgres_1 = require("drizzle-orm/node-postgres");
let YappyController = class YappyController {
    yappyService;
    globalDb;
    constructor(yappyService, globalDb) {
        this.yappyService = yappyService;
        this.globalDb = globalDb;
    }
    async handleIpn(orderId, status, hash, domain, res) {
        if (!orderId || !status || !hash || !domain) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'Missing parameters' });
        }
        try {
            await this.yappyService.processIpn(orderId, status, hash, domain, this.globalDb);
            return res.status(common_1.HttpStatus.OK).json({ success: true });
        }
        catch (error) {
            console.error('IPN Error:', error);
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: error.message });
        }
    }
};
exports.YappyController = YappyController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('ipn'),
    __param(0, (0, common_1.Query)('orderId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('hash')),
    __param(3, (0, common_1.Query)('domain')),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], YappyController.prototype, "handleIpn", null);
exports.YappyController = YappyController = __decorate([
    (0, common_1.Controller)('yappy'),
    __param(1, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [yappy_service_1.YappyService,
        node_postgres_1.NodePgDatabase])
], YappyController);
//# sourceMappingURL=yappy.controller.js.map