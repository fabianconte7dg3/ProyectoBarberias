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
exports.CitasService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../database/schema");
const tenant_context_1 = require("../database/tenant/tenant-context");
const tenant_utils_1 = require("../database/tenant/tenant.utils");
const database_constants_1 = require("../database/tenant/database.constants");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let CitasService = class CitasService {
    db;
    citasQueue;
    constructor(db, citasQueue) {
        this.db = db;
        this.citasQueue = citasQueue;
    }
    async crearCita(data, idempotencyKey) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const [servicio] = await db
            .select()
            .from(schema_1.servicios)
            .where((0, drizzle_orm_1.eq)(schema_1.servicios.id, data.servicioId));
        if (!servicio)
            throw new common_1.NotFoundException('Servicio no encontrado');
        const inicio = new Date(data.inicioEstimado);
        const fin = new Date(inicio.getTime() + servicio.duracionMinutos * 60000);
        db.delete(schema_1.bloqueosTemporales)
            .where((0, drizzle_orm_1.lte)(schema_1.bloqueosTemporales.expiraEn, new Date()))
            .execute()
            .catch((err) => console.error('Error en cleanup de bloqueos:', err));
        try {
            let [nuevaCita] = await db
                .insert(schema_1.citas)
                .values({
                tenantId,
                clienteId: data.clienteId,
                barberoId: data.barberoId,
                servicioId: data.servicioId,
                inicioEstimado: inicio,
                finEstimado: fin,
                origen: data.origen,
                idempotencyKey,
            })
                .onConflictDoNothing({ target: schema_1.citas.idempotencyKey })
                .returning();
            if (!nuevaCita) {
                const [citaExistente] = await db
                    .select()
                    .from(schema_1.citas)
                    .where((0, drizzle_orm_1.eq)(schema_1.citas.idempotencyKey, idempotencyKey));
                return { cita: citaExistente, isExisting: true };
            }
            const inicioTime = inicio.getTime();
            const now = Date.now();
            const delay24h = inicioTime - now - (24 * 60 * 60 * 1000);
            if (delay24h > 0) {
                await this.citasQueue.add('recordatorio_24h', { citaId: nuevaCita.id, tenantId }, { delay: delay24h, jobId: `recordatorio_${nuevaCita.id}` });
            }
            const delayRetraso = inicioTime - now + (15 * 60 * 1000);
            if (delayRetraso > 0) {
                await this.citasQueue.add('cancelacion_retraso', { citaId: nuevaCita.id, tenantId }, { delay: delayRetraso, jobId: `retraso_${nuevaCita.id}` });
            }
            return { cita: nuevaCita, isExisting: false };
        }
        catch (error) {
            const code = error.code || error.cause?.code;
            if (code === '23P01') {
                throw new common_1.ConflictException('Ese horario ya no está disponible.');
            }
            throw error;
        }
    }
    async bloquearTurno(data) {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT get_tenant_for_usuario(${data.barberoId}) as tenant_id`);
        const tenantId = result.rows[0]?.tenant_id;
        if (!tenantId)
            throw new common_1.NotFoundException('Barbero no encontrado o inactivo');
        const expiraEn = new Date(Date.now() + 3 * 60000);
        return await (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async (tx) => {
            tx.delete(schema_1.bloqueosTemporales)
                .where((0, drizzle_orm_1.lte)(schema_1.bloqueosTemporales.expiraEn, new Date()))
                .execute()
                .catch((err) => console.error('Error en cleanup de bloqueos:', err));
            try {
                const [bloqueo] = await tx
                    .insert(schema_1.bloqueosTemporales)
                    .values({
                    tenantId: tenantId,
                    barberoId: data.barberoId,
                    inicio: new Date(data.inicio),
                    fin: new Date(data.fin),
                    tipo: 'lock_reserva',
                    origen: 'sistema',
                    notas: data.notas,
                    expiraEn,
                })
                    .returning();
                return bloqueo;
            }
            catch (error) {
                const code = error.code || error.cause?.code;
                if (code === '23P01') {
                    throw new common_1.ConflictException('Ese horario ya no está disponible para bloqueo.');
                }
                throw error;
            }
        });
    }
    async cambiarEstado(citaId, nuevoEstado) {
        const db = tenant_context_1.TenantContext.getDb();
        return await db.transaction(async (tx) => {
            const [cita] = await tx
                .update(schema_1.citas)
                .set({ estado: nuevoEstado })
                .where((0, drizzle_orm_1.eq)(schema_1.citas.id, citaId))
                .returning();
            if (!cita)
                throw new common_1.NotFoundException('Cita no encontrada');
            if (nuevoEstado === 'ausente_strike' && cita.clienteId) {
                const [cliente] = await tx.select().from(schema_1.clientes).where((0, drizzle_orm_1.eq)(schema_1.clientes.id, cita.clienteId));
                if (cliente) {
                    await tx
                        .update(schema_1.clientes)
                        .set({ ausenciasStrikes: cliente.ausenciasStrikes + 1 })
                        .where((0, drizzle_orm_1.eq)(schema_1.clientes.id, cita.clienteId));
                }
            }
            if (nuevoEstado !== 'programada') {
                await this.citasQueue.remove(`recordatorio_${citaId}`).catch(() => { });
                await this.citasQueue.remove(`retraso_${citaId}`).catch(() => { });
            }
            return cita;
        });
    }
    async cancelarPorCliente(citaId) {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT get_tenant_for_cita(${citaId}) as tenant_id`);
        const tenantId = result.rows[0]?.tenant_id;
        if (!tenantId)
            throw new common_1.NotFoundException('Cita no encontrada');
        return await (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async (tx) => {
            const [citaCancelada] = await tx
                .update(schema_1.citas)
                .set({ estado: 'cancelada' })
                .where((0, drizzle_orm_1.eq)(schema_1.citas.id, citaId))
                .returning();
            if (citaCancelada) {
                await this.citasQueue.remove(`recordatorio_${citaId}`).catch(() => { });
                await this.citasQueue.remove(`retraso_${citaId}`).catch(() => { });
            }
            return citaCancelada;
        });
    }
};
exports.CitasService = CitasService;
exports.CitasService = CitasService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __param(1, (0, bullmq_1.InjectQueue)('CITAS_QUEUE')),
    __metadata("design:paramtypes", [Function, bullmq_2.Queue])
], CitasService);
//# sourceMappingURL=citas.service.js.map