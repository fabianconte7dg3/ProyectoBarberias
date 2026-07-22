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
exports.SuperAdminController = void 0;
const common_1 = require("@nestjs/common");
const super_admin_service_1 = require("./super-admin.service");
const public_decorator_1 = require("../common/decorators/public.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let SuperAdminController = class SuperAdminController {
    superAdminService;
    constructor(superAdminService) {
        this.superAdminService = superAdminService;
    }
    async loginPaso1(body) {
        return this.superAdminService.iniciarLogin(body.email, body.password);
    }
    async loginPaso2(body, res) {
        const result = await this.superAdminService.verificarTotp(body.tempToken, body.codigoTotp);
        res.cookie('jwt', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 1000,
        });
        return {
            message: result.message,
            usuario: result.usuario,
            accessToken: result.accessToken,
        };
    }
    async getStats() {
        return this.superAdminService.obtenerEstadisticas();
    }
    async getTenants() {
        return this.superAdminService.listarTenants();
    }
    async cambiarEstado(id, estado) {
        return this.superAdminService.cambiarEstadoTenant(id, estado);
    }
    async cambiarPlan(id, plan) {
        return this.superAdminService.cambiarPlanTenant(id, plan);
    }
    async toggleKillSwitch(id, bloqueado) {
        return this.superAdminService.toggleKillSwitchPlatform(id, bloqueado);
    }
};
exports.SuperAdminController = SuperAdminController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "loginPaso1", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('login/verificar-totp'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "loginPaso2", null);
__decorate([
    (0, roles_decorator_1.Roles)('superadmin'),
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getStats", null);
__decorate([
    (0, roles_decorator_1.Roles)('superadmin'),
    (0, common_1.Get)('tenants'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getTenants", null);
__decorate([
    (0, roles_decorator_1.Roles)('superadmin'),
    (0, common_1.Patch)('tenants/:id/estado'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('estado')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "cambiarEstado", null);
__decorate([
    (0, roles_decorator_1.Roles)('superadmin'),
    (0, common_1.Patch)('tenants/:id/plan'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('plan')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "cambiarPlan", null);
__decorate([
    (0, roles_decorator_1.Roles)('superadmin'),
    (0, common_1.Post)('tenants/:id/kill-switch'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('bloqueado')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "toggleKillSwitch", null);
exports.SuperAdminController = SuperAdminController = __decorate([
    (0, common_1.Controller)('super-admin'),
    __metadata("design:paramtypes", [super_admin_service_1.SuperAdminService])
], SuperAdminController);
//# sourceMappingURL=super-admin.controller.js.map