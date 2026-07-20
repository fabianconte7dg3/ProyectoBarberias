"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YappyModule = void 0;
const common_1 = require("@nestjs/common");
const yappy_service_1 = require("./yappy.service");
const yappy_controller_1 = require("./yappy.controller");
const dgi_module_1 = require("../dgi/dgi.module");
let YappyModule = class YappyModule {
};
exports.YappyModule = YappyModule;
exports.YappyModule = YappyModule = __decorate([
    (0, common_1.Module)({
        imports: [dgi_module_1.DgiModule],
        controllers: [yappy_controller_1.YappyController],
        providers: [yappy_service_1.YappyService],
        exports: [yappy_service_1.YappyService],
    })
], YappyModule);
//# sourceMappingURL=yappy.module.js.map