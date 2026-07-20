"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HorariosService = void 0;
const common_1 = require("@nestjs/common");
const tenant_context_1 = require("../database/tenant/tenant-context");
const schema = __importStar(require("../database/schema"));
const drizzle_orm_1 = require("drizzle-orm");
const database_constants_1 = require("../database/tenant/database.constants");
let HorariosService = class HorariosService {
    globalDb;
    constructor(globalDb) {
        this.globalDb = globalDb;
    }
    parseTime(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }
    validateDia(dia) {
        const inicio = this.parseTime(dia.horaInicio);
        const fin = this.parseTime(dia.horaFin);
        if (inicio >= fin) {
            throw new common_1.BadRequestException(`Para el día ${dia.diaSemana}, la hora de inicio (${dia.horaInicio}) debe ser anterior a la hora de fin (${dia.horaFin}).`);
        }
        if (dia.horaAlmuerzoInicio && dia.horaAlmuerzoFin) {
            const almInicio = this.parseTime(dia.horaAlmuerzoInicio);
            const almFin = this.parseTime(dia.horaAlmuerzoFin);
            if (almInicio >= almFin) {
                throw new common_1.BadRequestException(`Para el día ${dia.diaSemana}, el inicio del almuerzo debe ser anterior a su fin.`);
            }
            if (almInicio < inicio || almFin > fin) {
                throw new common_1.BadRequestException(`Para el día ${dia.diaSemana}, el horario de almuerzo debe estar contenido dentro de la jornada laboral.`);
            }
        }
        else if (dia.horaAlmuerzoInicio || dia.horaAlmuerzoFin) {
            throw new common_1.BadRequestException(`Para el día ${dia.diaSemana}, debe especificar inicio y fin de almuerzo, o ninguno de los dos.`);
        }
    }
    async setHorarioSemanal(barberoId, dto) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        dto.dias.forEach(dia => this.validateDia(dia));
        return await db.transaction(async (tx) => {
            await tx.delete(schema.horarios).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.horarios.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema.horarios.barberoId, barberoId)));
            if (dto.dias.length > 0) {
                const valores = dto.dias.map(d => ({
                    tenantId,
                    barberoId,
                    diaSemana: d.diaSemana,
                    horaInicio: d.horaInicio,
                    horaFin: d.horaFin,
                    horaAlmuerzoInicio: d.horaAlmuerzoInicio || null,
                    horaAlmuerzoFin: d.horaAlmuerzoFin || null,
                    activo: true,
                }));
                await tx.insert(schema.horarios).values(valores);
            }
            return { message: 'Horario semanal actualizado correctamente.' };
        });
    }
    async getHorarioSemanal(barberoId) {
        const db = tenant_context_1.TenantContext.getDb();
        return db.query.horarios.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.horarios.barberoId, barberoId), (0, drizzle_orm_1.eq)(schema.horarios.activo, true)),
        });
    }
    async createBloqueo(dto) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const inicio = new Date(dto.inicio);
        const fin = new Date(dto.fin);
        if (inicio >= fin) {
            throw new common_1.BadRequestException('La fecha/hora de inicio del bloqueo debe ser anterior a la de fin.');
        }
        const [bloqueo] = await db.insert(schema.bloqueosTemporales).values({
            tenantId,
            barberoId: dto.barberoId,
            inicio,
            fin,
            tipo: dto.tipo,
            origen: 'admin',
            notas: dto.motivo,
            expiraEn: fin,
        }).returning();
        return bloqueo;
    }
    async getBloqueosVigentes(barberoId) {
        const db = tenant_context_1.TenantContext.getDb();
        const ahora = new Date();
        return db.query.bloqueosTemporales.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.bloqueosTemporales.barberoId, barberoId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.gt)(schema.bloqueosTemporales.expiraEn, ahora), (0, drizzle_orm_1.isNull)(schema.bloqueosTemporales.expiraEn))),
            orderBy: [(0, drizzle_orm_1.asc)(schema.bloqueosTemporales.inicio)],
        });
    }
    async getDisponibilidad(barberoId, fechaYYYYMMDD) {
        const db = this.globalDb;
        const fechaDate = new Date(`${fechaYYYYMMDD}T00:00:00Z`);
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaString = diasSemana[fechaDate.getUTCDay()];
        const [horario] = await db.query.horarios.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.horarios.barberoId, barberoId), (0, drizzle_orm_1.eq)(schema.horarios.diaSemana, diaString), (0, drizzle_orm_1.eq)(schema.horarios.activo, true)),
        });
        if (!horario) {
            return { disponible: false, jornada: null, ocupados: [], almuerzo: null };
        }
        const inicioDia = new Date(fechaDate);
        const finDia = new Date(fechaDate);
        finDia.setUTCDate(finDia.getUTCDate() + 1);
        const citasHoy = await db.query.citas.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.citas.barberoId, barberoId), (0, drizzle_orm_1.gt)(schema.citas.finEstimado, inicioDia), (0, drizzle_orm_1.lte)(schema.citas.inicioEstimado, finDia), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema.citas.estado, 'programada'), (0, drizzle_orm_1.eq)(schema.citas.estado, 'en_curso'), (0, drizzle_orm_1.eq)(schema.citas.estado, 'completada'), (0, drizzle_orm_1.eq)(schema.citas.estado, 'revision_manual'))),
        });
        const bloqueosHoy = await db.query.bloqueosTemporales.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.bloqueosTemporales.barberoId, barberoId), (0, drizzle_orm_1.gt)(schema.bloqueosTemporales.fin, inicioDia), (0, drizzle_orm_1.lte)(schema.bloqueosTemporales.inicio, finDia), (0, drizzle_orm_1.or)((0, drizzle_orm_1.gt)(schema.bloqueosTemporales.expiraEn, new Date()), (0, drizzle_orm_1.isNull)(schema.bloqueosTemporales.expiraEn))),
        });
        let maxRetrasoMinutos = 0;
        for (const c of citasHoy) {
            if (c.inicioReal && c.inicioEstimado) {
                const diffMs = c.inicioReal.getTime() - c.inicioEstimado.getTime();
                if (diffMs > 0) {
                    const diffMins = Math.floor(diffMs / 60000);
                    if (diffMins > maxRetrasoMinutos) {
                        maxRetrasoMinutos = diffMins;
                    }
                }
            }
        }
        let almuerzoCalculado = null;
        if (horario.horaAlmuerzoInicio && horario.horaAlmuerzoFin) {
            const almInicioMins = this.parseTime(horario.horaAlmuerzoInicio) + maxRetrasoMinutos;
            const jornadaFinMins = this.parseTime(horario.horaFin);
            const duracionOriginalMins = this.parseTime(horario.horaAlmuerzoFin) - this.parseTime(horario.horaAlmuerzoInicio);
            let almFinMins = almInicioMins + duracionOriginalMins;
            if (almFinMins > jornadaFinMins) {
                almFinMins = jornadaFinMins;
            }
            if (almInicioMins < jornadaFinMins && almFinMins > almInicioMins) {
                almuerzoCalculado = {
                    inicioMinutos: almInicioMins,
                    finMinutos: almFinMins,
                    strInicio: `${Math.floor(almInicioMins / 60).toString().padStart(2, '0')}:${(almInicioMins % 60).toString().padStart(2, '0')}`,
                    strFin: `${Math.floor(almFinMins / 60).toString().padStart(2, '0')}:${(almFinMins % 60).toString().padStart(2, '0')}`,
                };
            }
        }
        const ocupados = [
            ...citasHoy.map((c) => ({ tipo: 'cita', id: c.id, inicio: c.inicioEstimado, fin: c.finEstimado })),
            ...bloqueosHoy.map((b) => ({ tipo: 'bloqueo', id: b.id, inicio: b.inicio, fin: b.fin }))
        ];
        return {
            disponible: true,
            jornada: { inicio: horario.horaInicio, fin: horario.horaFin },
            retrasoActualMinutos: maxRetrasoMinutos,
            almuerzo: almuerzoCalculado,
            ocupados,
        };
    }
};
exports.HorariosService = HorariosService;
exports.HorariosService = HorariosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [Function])
], HorariosService);
//# sourceMappingURL=horarios.service.js.map