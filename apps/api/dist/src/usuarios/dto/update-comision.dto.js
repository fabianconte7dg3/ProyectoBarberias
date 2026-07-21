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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateComisionDto = void 0;
const class_validator_1 = require("class-validator");
class UpdateComisionDto {
    porcentajeComision;
}
exports.UpdateComisionDto = UpdateComisionDto;
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'El porcentaje de comisión debe ser un número válido.' }),
    (0, class_validator_1.Min)(0, { message: 'El porcentaje de comisión no puede ser menor a 0%.' }),
    (0, class_validator_1.Max)(100, { message: 'El porcentaje de comisión no puede ser mayor a 100%.' }),
    __metadata("design:type", Number)
], UpdateComisionDto.prototype, "porcentajeComision", void 0);
//# sourceMappingURL=update-comision.dto.js.map