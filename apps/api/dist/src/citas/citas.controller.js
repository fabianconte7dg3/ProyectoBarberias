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
exports.CitasController = void 0;
const common_1 = require("@nestjs/common");
const citas_service_1 = require("./citas.service");
const create_cita_dto_1 = require("./dto/create-cita.dto");
const bloquear_turno_dto_1 = require("./dto/bloquear-turno.dto");
const update_estado_dto_1 = require("./dto/update-estado.dto");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../database/schema");
const database_constants_1 = require("../database/tenant/database.constants");
let CitasController = class CitasController {
    citasService;
    db;
    constructor(citasService, db) {
        this.citasService = citasService;
        this.db = db;
    }
    async crearCita(data, idempotencyKey, res) {
        if (!idempotencyKey) {
            idempotencyKey = crypto.randomUUID();
        }
        const result = await this.citasService.crearCita(data, idempotencyKey);
        if (result.isExisting) {
            res.status(common_1.HttpStatus.OK);
        }
        return result.cita;
    }
    async bloquearTurno(data) {
        return this.citasService.bloquearTurno(data);
    }
    async cambiarEstado(id, data) {
        return this.citasService.cambiarEstado(id, data.estado);
    }
    async cancelarPorCliente(id, token) {
        if (!token)
            throw new common_1.UnauthorizedException('Token de cancelación requerido');
        const [cita] = await this.db
            .select()
            .from(schema_1.citas)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.citas.id, id), (0, drizzle_orm_1.eq)(schema_1.citas.tokenCliente, token), (0, drizzle_orm_1.gt)(schema_1.citas.tokenExpiraEn, new Date())));
        if (!cita) {
            throw new common_1.UnauthorizedException('Token inválido o expirado');
        }
        return this.citasService.cancelarPorCliente(id);
    }
};
exports.CitasController = CitasController;
__decorate([
    (0, roles_decorator_1.Roles)('admin', 'recepcion', 'barbero'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('idempotency-key')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cita_dto_1.CreateCitaDto, String, Object]),
    __metadata("design:returntype", Promise)
], CitasController.prototype, "crearCita", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('bloquear'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bloquear_turno_dto_1.BloquearTurnoDto]),
    __metadata("design:returntype", Promise)
], CitasController.prototype, "bloquearTurno", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin', 'recepcion', 'barbero'),
    (0, common_1.Patch)(':id/estado'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_estado_dto_1.UpdateEstadoCitaDto]),
    __metadata("design:returntype", Promise)
], CitasController.prototype, "cambiarEstado", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)(':id/cancelar'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CitasController.prototype, "cancelarPorCliente", null);
exports.CitasController = CitasController = __decorate([
    (0, common_1.Controller)('citas'),
    __param(1, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [citas_service_1.CitasService, Function])
], CitasController);
//# sourceMappingURL=citas.controller.js.map