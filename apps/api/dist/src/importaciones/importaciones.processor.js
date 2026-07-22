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
exports.ImportacionesProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const database_constants_1 = require("../database/tenant/database.constants");
const schema = __importStar(require("../database/schema"));
const tenant_utils_1 = require("../database/tenant/tenant.utils");
const drizzle_orm_1 = require("drizzle-orm");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const import_filas_dto_1 = require("./dto/import-filas.dto");
let ImportacionesProcessor = class ImportacionesProcessor extends bullmq_1.WorkerHost {
    db;
    constructor(db) {
        super();
        this.db = db;
    }
    async process(job) {
        const { trabajoId, tenantId, tipo, filas } = job.data;
        console.log(`[ImportacionesProcessor] Procesando trabajo ${trabajoId} para tenant ${tenantId} (${tipo})`);
        return await (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async (tx) => {
            let creados = 0;
            let actualizados = 0;
            let erroresCount = 0;
            const detalleErrores = [];
            for (const item of filas) {
                const { rowNumber, data } = item;
                try {
                    if (tipo === 'clientes') {
                        const dto = (0, class_transformer_1.plainToInstance)(import_filas_dto_1.FilaImportClienteDto, {
                            nombreCompleto: data.nombrecompleto || data.nombre,
                            telefonoWhatsapp: data.telefonowhatsapp || data.telefono || data.celular,
                            email: data.email || data.emailfacturacion,
                            notasPreferencia: data.notaspreferencia || data.notas,
                        });
                        const validationErrors = await (0, class_validator_1.validate)(dto);
                        if (validationErrors.length > 0) {
                            const msg = validationErrors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ');
                            erroresCount++;
                            detalleErrores.push({ fila: rowNumber, motivo: msg });
                            continue;
                        }
                        const [clienteExistente] = await tx
                            .select()
                            .from(schema.clientes)
                            .where((0, drizzle_orm_1.eq)(schema.clientes.telefonoWhatsapp, dto.telefonoWhatsapp));
                        if (clienteExistente) {
                            await tx
                                .update(schema.clientes)
                                .set({
                                ...(dto.nombreCompleto && { nombreCompleto: dto.nombreCompleto }),
                                ...(dto.email && { emailFacturacion: dto.email }),
                                ...(dto.notasPreferencia && { notasPreferencia: dto.notasPreferencia }),
                            })
                                .where((0, drizzle_orm_1.eq)(schema.clientes.id, clienteExistente.id));
                            actualizados++;
                        }
                        else {
                            await tx.insert(schema.clientes).values({
                                tenantId,
                                telefonoWhatsapp: dto.telefonoWhatsapp,
                                nombreCompleto: dto.nombreCompleto,
                                emailFacturacion: dto.email || null,
                                notasPreferencia: dto.notasPreferencia || null,
                                aceptaMarketing: false,
                            });
                            creados++;
                        }
                    }
                    else if (tipo === 'productos') {
                        const dto = (0, class_transformer_1.plainToInstance)(import_filas_dto_1.FilaImportProductoDto, {
                            nombre: data.nombre || data.producto,
                            precioVenta: data.precioventa || data.precio,
                            costoCompra: data.costocompra || data.costo,
                            stockActual: data.stockactual || data.stock || 0,
                            stockMinimo: data.stockminimo || data.minimo || 2,
                        });
                        const validationErrors = await (0, class_validator_1.validate)(dto);
                        if (validationErrors.length > 0) {
                            const msg = validationErrors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ');
                            erroresCount++;
                            detalleErrores.push({ fila: rowNumber, motivo: msg });
                            continue;
                        }
                        const [productoExistente] = await tx
                            .select()
                            .from(schema.productos)
                            .where((0, drizzle_orm_1.eq)(schema.productos.nombre, dto.nombre));
                        if (productoExistente) {
                            await tx
                                .update(schema.productos)
                                .set({
                                precioVenta: dto.precioVenta.toString(),
                                costoCompra: dto.costoCompra.toString(),
                                ...(dto.stockMinimo !== undefined && { stockMinimo: dto.stockMinimo }),
                            })
                                .where((0, drizzle_orm_1.eq)(schema.productos.id, productoExistente.id));
                            actualizados++;
                        }
                        else {
                            await tx.insert(schema.productos).values({
                                tenantId,
                                nombre: dto.nombre,
                                precioVenta: dto.precioVenta.toString(),
                                costoCompra: dto.costoCompra.toString(),
                                stockActual: dto.stockActual,
                                stockMinimo: dto.stockMinimo ?? 2,
                            });
                            creados++;
                        }
                    }
                    else if (tipo === 'servicios') {
                        const dto = (0, class_transformer_1.plainToInstance)(import_filas_dto_1.FilaImportServicioDto, {
                            nombre: data.nombre || data.servicio,
                            precioBase: data.preciobase || data.precio,
                            duracionMinutos: data.duracionminutos || data.duracion || 30,
                        });
                        const validationErrors = await (0, class_validator_1.validate)(dto);
                        if (validationErrors.length > 0) {
                            const msg = validationErrors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ');
                            erroresCount++;
                            detalleErrores.push({ fila: rowNumber, motivo: msg });
                            continue;
                        }
                        const [servicioExistente] = await tx
                            .select()
                            .from(schema.servicios)
                            .where((0, drizzle_orm_1.eq)(schema.servicios.nombre, dto.nombre));
                        if (servicioExistente) {
                            await tx
                                .update(schema.servicios)
                                .set({
                                precioBase: dto.precioBase.toString(),
                                duracionMinutos: dto.duracionMinutos,
                            })
                                .where((0, drizzle_orm_1.eq)(schema.servicios.id, servicioExistente.id));
                            actualizados++;
                        }
                        else {
                            await tx.insert(schema.servicios).values({
                                tenantId,
                                nombre: dto.nombre,
                                precioBase: dto.precioBase.toString(),
                                duracionMinutos: dto.duracionMinutos,
                            });
                            creados++;
                        }
                    }
                }
                catch (err) {
                    erroresCount++;
                    detalleErrores.push({ fila: rowNumber, motivo: err.message || 'Error desconocido al procesar fila' });
                }
            }
            let estadoFinal = 'completado';
            if (erroresCount > 0 && (creados > 0 || actualizados > 0)) {
                estadoFinal = 'completado_con_errores';
            }
            else if (erroresCount > 0 && creados === 0 && actualizados === 0) {
                estadoFinal = 'fallido';
            }
            await tx
                .update(schema.trabajosImportacion)
                .set({
                estado: estadoFinal,
                filasCreadas: creados,
                filasActualizadas: actualizados,
                filasConError: erroresCount,
                detalleErrores,
                completadoAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema.trabajosImportacion.id, trabajoId));
            return { estado: estadoFinal, creados, actualizados, erroresCount };
        });
    }
};
exports.ImportacionesProcessor = ImportacionesProcessor;
exports.ImportacionesProcessor = ImportacionesProcessor = __decorate([
    (0, bullmq_1.Processor)('importaciones'),
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [Function])
], ImportacionesProcessor);
//# sourceMappingURL=importaciones.processor.js.map