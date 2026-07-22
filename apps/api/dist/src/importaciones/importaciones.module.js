"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportacionesModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const importaciones_controller_1 = require("./importaciones.controller");
const importaciones_service_1 = require("./importaciones.service");
const importaciones_processor_1 = require("./importaciones.processor");
const parser_service_1 = require("./parser.service");
let ImportacionesModule = class ImportacionesModule {
};
exports.ImportacionesModule = ImportacionesModule;
exports.ImportacionesModule = ImportacionesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'importaciones',
            }),
        ],
        controllers: [importaciones_controller_1.ImportacionesController],
        providers: [
            importaciones_service_1.ImportacionesService,
            importaciones_processor_1.ImportacionesProcessor,
            parser_service_1.ParserService,
        ],
        exports: [importaciones_service_1.ImportacionesService],
    })
], ImportacionesModule);
//# sourceMappingURL=importaciones.module.js.map