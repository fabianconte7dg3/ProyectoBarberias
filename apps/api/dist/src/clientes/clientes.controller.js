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
exports.ClientesController = void 0;
const common_1 = require("@nestjs/common");
const clientes_service_1 = require("./clientes.service");
const create_cliente_dto_1 = require("./dto/create-cliente.dto");
const update_cliente_dto_1 = require("./dto/update-cliente.dto");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const drizzle_orm_1 = require("drizzle-orm");
const database_constants_1 = require("../database/tenant/database.constants");
const tenant_utils_1 = require("../database/tenant/tenant.utils");
let ClientesController = class ClientesController {
    clientesService;
    db;
    constructor(clientesService, db) {
        this.clientesService = clientesService;
        this.db = db;
    }
    async createPublico(dto, tenantSlug) {
        const slug = tenantSlug || 'barberia-demo';
        const tenantResult = await this.db.execute((0, drizzle_orm_1.sql) `SELECT id FROM auth_get_tenant_by_slug(${slug})`);
        const tenantId = tenantResult.rows[0]?.id;
        if (!tenantId)
            throw new common_1.NotFoundException('Barbería no encontrada');
        return (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async () => {
            try {
                return await this.clientesService.create(dto);
            }
            catch (err) {
                const clientes = await this.clientesService.findAll(dto.telefonoWhatsapp);
                if (clientes && clientes.length > 0) {
                    return clientes[0];
                }
                throw err;
            }
        });
    }
    create(dto) {
        return this.clientesService.create(dto);
    }
    findAll(q) {
        return this.clientesService.findAll(q);
    }
    findOne(id) {
        return this.clientesService.findOne(id);
    }
    update(id, dto) {
        return this.clientesService.update(id, dto);
    }
};
exports.ClientesController = ClientesController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('publico'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-tenant-slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cliente_dto_1.CreateClienteDto, String]),
    __metadata("design:returntype", Promise)
], ClientesController.prototype, "createPublico", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin', 'recepcion', 'barbero'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cliente_dto_1.CreateClienteDto]),
    __metadata("design:returntype", void 0)
], ClientesController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin', 'recepcion', 'barbero'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientesController.prototype, "findAll", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin', 'recepcion', 'barbero'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientesController.prototype, "findOne", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin', 'recepcion'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_cliente_dto_1.UpdateClienteDto]),
    __metadata("design:returntype", void 0)
], ClientesController.prototype, "update", null);
exports.ClientesController = ClientesController = __decorate([
    (0, common_1.Controller)('clientes'),
    __param(1, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [clientes_service_1.ClientesService, Function])
], ClientesController);
//# sourceMappingURL=clientes.controller.js.map