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
exports.HorariosController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../common/decorators/public.decorator");
const horarios_service_1 = require("./horarios.service");
const upsert_horario_semanal_dto_1 = require("./dto/upsert-horario-semanal.dto");
const create_bloqueo_dto_1 = require("./dto/create-bloqueo.dto");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let HorariosController = class HorariosController {
    horariosService;
    constructor(horariosService) {
        this.horariosService = horariosService;
    }
    setHorarioSemanal(barberoId, dto) {
        return this.horariosService.setHorarioSemanal(barberoId, dto);
    }
    getHorarioSemanal(barberoId) {
        return this.horariosService.getHorarioSemanal(barberoId);
    }
    createBloqueo(dto) {
        return this.horariosService.createBloqueo(dto);
    }
    getBloqueos(barberoId) {
        return this.horariosService.getBloqueosVigentes(barberoId);
    }
    getDisponibilidad(barberoId, fecha) {
        return this.horariosService.getDisponibilidad(barberoId, fecha);
    }
};
exports.HorariosController = HorariosController;
__decorate([
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('barbero/:barberoId'),
    __param(0, (0, common_1.Param)('barberoId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, upsert_horario_semanal_dto_1.UpsertHorarioSemanalDto]),
    __metadata("design:returntype", void 0)
], HorariosController.prototype, "setHorarioSemanal", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin', 'barbero', 'recepcion'),
    (0, common_1.Get)('barbero/:barberoId'),
    __param(0, (0, common_1.Param)('barberoId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HorariosController.prototype, "getHorarioSemanal", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('bloqueos'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_bloqueo_dto_1.CreateBloqueoDto]),
    __metadata("design:returntype", void 0)
], HorariosController.prototype, "createBloqueo", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin', 'barbero', 'recepcion'),
    (0, common_1.Get)('bloqueos/:barberoId'),
    __param(0, (0, common_1.Param)('barberoId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HorariosController.prototype, "getBloqueos", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('disponibilidad'),
    __param(0, (0, common_1.Query)('barberoId')),
    __param(1, (0, common_1.Query)('fecha')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HorariosController.prototype, "getDisponibilidad", null);
exports.HorariosController = HorariosController = __decorate([
    (0, common_1.Controller)('horarios'),
    __metadata("design:paramtypes", [horarios_service_1.HorariosService])
], HorariosController);
//# sourceMappingURL=horarios.controller.js.map