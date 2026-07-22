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
const database_constants_1 = require("../database/tenant/database.constants");
const tenant_utils_1 = require("../database/tenant/tenant.utils");
let CitasController = class CitasController {
    citasService;
    db;
    constructor(citasService, db) {
        this.citasService = citasService;
        this.db = db;
    }
    async crearCitaPublica(data, idempotencyKey, tenantSlug, res) {
        if (!idempotencyKey) {
            idempotencyKey = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        }
        const tenantResult = await this.db.execute((0, drizzle_orm_1.sql) `SELECT id FROM auth_get_tenant_by_slug(${tenantSlug || 'barberia-carlos'})`);
        const tenantId = tenantResult.rows[0]?.id;
        if (!tenantId)
            throw new common_1.NotFoundException('Barbería no encontrada');
        return (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async () => {
            const result = await this.citasService.crearCita(data, idempotencyKey);
            if (result.isExisting) {
                res.status(common_1.HttpStatus.OK);
            }
            return result.cita;
        });
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
    async getCitas(req, fechaStr, barberoId) {
        const user = req.user;
        return this.citasService.obtenerCitasAgenda({
            user,
            fechaStr,
            barberoId,
        });
    }
    async bloquearTurno(data) {
        return this.citasService.bloquearTurno(data);
    }
    async cambiarEstado(id, dto, req) {
        return this.citasService.cambiarEstado(id, dto.estado, req.user);
    }
    async cancelarCita(id) {
        return this.citasService.cancelarPorCliente(id);
    }
};
exports.CitasController = CitasController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('publica'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('idempotency-key')),
    __param(2, (0, common_1.Headers)('x-tenant-slug')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cita_dto_1.CreateCitaDto, String, String, Object]),
    __metadata("design:returntype", Promise)
], CitasController.prototype, "crearCitaPublica", null);
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
    (0, roles_decorator_1.Roles)('admin', 'recepcion', 'barbero'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('fecha')),
    __param(2, (0, common_1.Query)('barberoId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CitasController.prototype, "getCitas", null);
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
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_estado_dto_1.UpdateEstadoCitaDto, Object]),
    __metadata("design:returntype", Promise)
], CitasController.prototype, "cambiarEstado", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin', 'recepcion', 'barbero'),
    (0, common_1.Post)(':id/cancelar'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CitasController.prototype, "cancelarCita", null);
exports.CitasController = CitasController = __decorate([
    (0, common_1.Controller)('citas'),
    __param(1, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [citas_service_1.CitasService, Function])
], CitasController);
//# sourceMappingURL=citas.controller.js.map