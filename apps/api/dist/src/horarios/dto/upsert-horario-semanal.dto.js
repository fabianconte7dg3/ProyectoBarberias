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
exports.UpsertHorarioSemanalDto = exports.DiaHorarioDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class DiaHorarioDto {
    diaSemana;
    horaInicio;
    horaFin;
    horaAlmuerzoInicio;
    horaAlmuerzoFin;
}
exports.DiaHorarioDto = DiaHorarioDto;
__decorate([
    (0, class_validator_1.IsEnum)(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']),
    __metadata("design:type", String)
], DiaHorarioDto.prototype, "diaSemana", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato de horaInicio inválido. Use HH:mm' }),
    __metadata("design:type", String)
], DiaHorarioDto.prototype, "horaInicio", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato de horaFin inválido. Use HH:mm' }),
    __metadata("design:type", String)
], DiaHorarioDto.prototype, "horaFin", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato inválido. Use HH:mm' }),
    __metadata("design:type", String)
], DiaHorarioDto.prototype, "horaAlmuerzoInicio", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato inválido. Use HH:mm' }),
    __metadata("design:type", String)
], DiaHorarioDto.prototype, "horaAlmuerzoFin", void 0);
class UpsertHorarioSemanalDto {
    dias;
}
exports.UpsertHorarioSemanalDto = UpsertHorarioSemanalDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => DiaHorarioDto),
    __metadata("design:type", Array)
], UpsertHorarioSemanalDto.prototype, "dias", void 0);
//# sourceMappingURL=upsert-horario-semanal.dto.js.map