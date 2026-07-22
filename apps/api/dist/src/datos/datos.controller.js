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
exports.DatosController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const datos_service_1 = require("./datos.service");
let DatosController = class DatosController {
    datosService;
    constructor(datosService) {
        this.datosService = datosService;
    }
    async importarClientes(file, rawCsv) {
        let content = rawCsv;
        if (file && file.buffer) {
            content = file.buffer.toString('utf-8');
        }
        if (!content) {
            throw new common_1.BadRequestException('Por favor adjunta un archivo CSV o proporciona el contenido en texto.');
        }
        return this.datosService.importarClientes(content);
    }
    async importarProductos(file, rawCsv) {
        let content = rawCsv;
        if (file && file.buffer) {
            content = file.buffer.toString('utf-8');
        }
        if (!content) {
            throw new common_1.BadRequestException('Por favor adjunta un archivo CSV o proporciona el contenido en texto.');
        }
        return this.datosService.importarProductos(content);
    }
    async exportarTransacciones(desde, hasta, res) {
        const csvContent = await this.datosService.exportarTransaccionesCsv(desde, hasta);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="transacciones_${Date.now()}.csv"`);
        res.status(200).send(csvContent);
    }
    async exportarClientesMarketing(res) {
        const csvContent = await this.datosService.exportarClientesMarketingCsv();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="clientes_marketing_ley81_${Date.now()}.csv"`);
        res.status(200).send(csvContent);
    }
    async exportarNomina(desde, hasta, res) {
        const csvContent = await this.datosService.exportarNominaCsv(desde, hasta);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="reporte_nomina_${Date.now()}.csv"`);
        res.status(200).send(csvContent);
    }
    async descargarPlantilla(tipo, res) {
        if (tipo !== 'clientes' && tipo !== 'productos') {
            throw new common_1.BadRequestException('Tipo de plantilla no válido. Usa "clientes" o "productos".');
        }
        const csvContent = this.datosService.obtenerPlantillaCsv(tipo);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="plantilla_${tipo}.csv"`);
        res.status(200).send(csvContent);
    }
};
exports.DatosController = DatosController;
__decorate([
    (0, common_1.Post)('importar/clientes'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('rawCsv')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DatosController.prototype, "importarClientes", null);
__decorate([
    (0, common_1.Post)('importar/productos'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('rawCsv')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DatosController.prototype, "importarProductos", null);
__decorate([
    (0, common_1.Get)('exportar/transacciones'),
    __param(0, (0, common_1.Query)('desde')),
    __param(1, (0, common_1.Query)('hasta')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], DatosController.prototype, "exportarTransacciones", null);
__decorate([
    (0, common_1.Get)('exportar/clientes-marketing'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DatosController.prototype, "exportarClientesMarketing", null);
__decorate([
    (0, common_1.Get)('exportar/nomina'),
    __param(0, (0, common_1.Query)('desde')),
    __param(1, (0, common_1.Query)('hasta')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], DatosController.prototype, "exportarNomina", null);
__decorate([
    (0, common_1.Get)('plantilla'),
    __param(0, (0, common_1.Query)('tipo')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DatosController.prototype, "descargarPlantilla", null);
exports.DatosController = DatosController = __decorate([
    (0, common_1.Controller)('datos'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:paramtypes", [datos_service_1.DatosService])
], DatosController);
//# sourceMappingURL=datos.controller.js.map