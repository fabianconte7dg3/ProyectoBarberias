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
exports.CajaController = void 0;
const common_1 = require("@nestjs/common");
const caja_service_1 = require("./caja.service");
const cerrar_caja_dto_1 = require("./dto/cerrar-caja.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const tenant_interceptor_1 = require("../database/tenant/tenant.interceptor");
let CajaController = class CajaController {
    cajaService;
    constructor(cajaService) {
        this.cajaService = cajaService;
    }
    async getBalance() {
        return this.cajaService.getBalanceDelDia();
    }
    async cerrarCaja(req, dto) {
        const usuarioId = req.user.userId;
        return this.cajaService.cerrarCaja(usuarioId, dto);
    }
};
exports.CajaController = CajaController;
__decorate([
    (0, common_1.Get)('balance'),
    (0, roles_decorator_1.Roles)('admin', 'recepcion'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CajaController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Post)('cerrar'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cerrar_caja_dto_1.CerrarCajaDto]),
    __metadata("design:returntype", Promise)
], CajaController.prototype, "cerrarCaja", null);
exports.CajaController = CajaController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.UseInterceptors)(tenant_interceptor_1.TenantInterceptor),
    (0, common_1.Controller)('caja'),
    __metadata("design:paramtypes", [caja_service_1.CajaService])
], CajaController);
//# sourceMappingURL=caja.controller.js.map