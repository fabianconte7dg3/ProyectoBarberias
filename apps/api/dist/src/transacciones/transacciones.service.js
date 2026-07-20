"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransaccionesService = void 0;
const common_1 = require("@nestjs/common");
const tenant_context_1 = require("../database/tenant/tenant-context");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
let TransaccionesService = class TransaccionesService {
    async cobrarCita(citaId, dto) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const cita = await db.query.citas.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.citas.id, citaId),
            with: {
                barbero: true,
                servicio: true,
            },
        });
        if (!cita) {
            throw new common_1.NotFoundException('Cita no encontrada');
        }
        if (cita.estado !== 'programada' && cita.estado !== 'en_curso') {
            throw new common_1.ConflictException(`No se puede cobrar una cita en estado: ${cita.estado}`);
        }
        const totalFacturado = Number(cita.servicio.precioBase);
        const porcentajeComision = Number(cita.barbero.porcentajeComision || 0);
        const comisionBarbero = (totalFacturado * porcentajeComision) / 100;
        const [nuevaTransaccion] = await db.insert(schema_1.transacciones).values({
            tenantId,
            citaId: cita.id,
            metodoPago: dto.metodoPago,
            totalFacturado: totalFacturado.toString(),
            montoEfectivoIngresado: dto.montoEfectivoIngresado ? dto.montoEfectivoIngresado.toString() : null,
            comisionBarbero: comisionBarbero.toString(),
            propinaBarbero: dto.propinaBarbero ? dto.propinaBarbero.toString() : '0',
            rucCliente: dto.rucCliente,
            nombreFiscalCliente: dto.nombreFiscalCliente,
        }).returning();
        await db.update(schema_1.citas)
            .set({ estado: 'completada' })
            .where((0, drizzle_orm_1.eq)(schema_1.citas.id, cita.id));
        return nuevaTransaccion;
    }
    async findAll(page = 1, limit = 20) {
        const db = tenant_context_1.TenantContext.getDb();
        const offset = (page - 1) * limit;
        const data = await db.query.transacciones.findMany({
            limit,
            offset,
            orderBy: (transacciones, { desc }) => [desc(transacciones.createdAt)],
            with: {
                cita: {
                    with: {
                        cliente: true,
                        barbero: true,
                        servicio: true,
                    }
                }
            }
        });
        return { data, page, limit };
    }
};
exports.TransaccionesService = TransaccionesService;
exports.TransaccionesService = TransaccionesService = __decorate([
    (0, common_1.Injectable)()
], TransaccionesService);
//# sourceMappingURL=transacciones.service.js.map