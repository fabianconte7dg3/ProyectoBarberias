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
exports.ImportacionesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const importaciones_service_1 = require("./importaciones.service");
let ImportacionesController = class ImportacionesController {
    importacionesService;
    constructor(importacionesService) {
        this.importacionesService = importacionesService;
    }
    async importar(tipo, file, req) {
        if (!file) {
            throw new common_1.BadRequestException('Debes subir un archivo CSV o Excel (.xlsx).');
        }
        if (!['clientes', 'productos', 'servicios'].includes(tipo)) {
            throw new common_1.BadRequestException('Tipo de importación inválido. Opciones: clientes, productos, servicios');
        }
        const usuarioId = req.user.userId;
        return this.importacionesService.crearTrabajoImportacion(file.buffer, file.originalname, tipo, usuarioId);
    }
    async obtenerTrabajo(trabajoId) {
        return this.importacionesService.obtenerTrabajo(trabajoId);
    }
    async exportarFinanciero(desde, hasta, res) {
        const fileBuffer = await this.importacionesService.exportarFinanciero(desde, hasta);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=reporte_financiero_${Date.now()}.xlsx`);
        res.status(common_1.HttpStatus.OK).send(fileBuffer);
    }
    async exportarNomina(desde, hasta, res) {
        const fileBuffer = await this.importacionesService.exportarNomina(desde, hasta);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=reporte_nomina_${Date.now()}.xlsx`);
        res.status(common_1.HttpStatus.OK).send(fileBuffer);
    }
    async exportarClientesMarketing(res) {
        const fileBuffer = await this.importacionesService.exportarClientesMarketing();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=clientes_marketing_ley81_${Date.now()}.xlsx`);
        res.status(common_1.HttpStatus.OK).send(fileBuffer);
    }
};
exports.ImportacionesController = ImportacionesController;
__decorate([
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('importaciones/:tipo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Param)('tipo')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ImportacionesController.prototype, "importar", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('importaciones/:trabajoId'),
    __param(0, (0, common_1.Param)('trabajoId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ImportacionesController.prototype, "obtenerTrabajo", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('exportaciones/financiero'),
    __param(0, (0, common_1.Query)('desde')),
    __param(1, (0, common_1.Query)('hasta')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ImportacionesController.prototype, "exportarFinanciero", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('exportaciones/nomina'),
    __param(0, (0, common_1.Query)('desde')),
    __param(1, (0, common_1.Query)('hasta')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ImportacionesController.prototype, "exportarNomina", null);
__decorate([
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('exportaciones/clientes-marketing'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImportacionesController.prototype, "exportarClientesMarketing", null);
exports.ImportacionesController = ImportacionesController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [importaciones_service_1.ImportacionesService])
], ImportacionesController);
//# sourceMappingURL=importaciones.controller.js.map