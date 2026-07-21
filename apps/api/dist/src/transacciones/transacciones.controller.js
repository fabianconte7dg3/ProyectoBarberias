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
exports.TransaccionesController = void 0;
const common_1 = require("@nestjs/common");
const transacciones_service_1 = require("./transacciones.service");
const cobrar_cita_dto_1 = require("./dto/cobrar-cita.dto");
const tenant_interceptor_1 = require("../database/tenant/tenant.interceptor");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let TransaccionesController = class TransaccionesController {
    transaccionesService;
    constructor(transaccionesService) {
        this.transaccionesService = transaccionesService;
    }
    async cobrarCita(req, id, cobrarCitaDto) {
        return this.transaccionesService.cobrarCita(id, cobrarCitaDto, req.user);
    }
    async ventaMostrador(req, cobrarCitaDto) {
        return this.transaccionesService.cobrarCita(null, cobrarCitaDto, req.user);
    }
    async findAll() {
        return this.transaccionesService.getHistorialTransacciones(20);
    }
};
exports.TransaccionesController = TransaccionesController;
__decorate([
    (0, common_1.Post)('citas/:id/cobrar'),
    (0, roles_decorator_1.Roles)('admin', 'recepcion', 'barbero'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cobrar_cita_dto_1.CobrarCitaDto]),
    __metadata("design:returntype", Promise)
], TransaccionesController.prototype, "cobrarCita", null);
__decorate([
    (0, common_1.Post)('transacciones/mostrador'),
    (0, roles_decorator_1.Roles)('admin', 'recepcion', 'barbero'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cobrar_cita_dto_1.CobrarCitaDto]),
    __metadata("design:returntype", Promise)
], TransaccionesController.prototype, "ventaMostrador", null);
__decorate([
    (0, common_1.Get)('transacciones'),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TransaccionesController.prototype, "findAll", null);
exports.TransaccionesController = TransaccionesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.UseInterceptors)(tenant_interceptor_1.TenantInterceptor),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [transacciones_service_1.TransaccionesService])
], TransaccionesController);
//# sourceMappingURL=transacciones.controller.js.map