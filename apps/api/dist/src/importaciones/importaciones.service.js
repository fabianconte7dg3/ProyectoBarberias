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
exports.ImportacionesService = void 0;
const common_1 = require("@nestjs/common");
const database_constants_1 = require("../database/tenant/database.constants");
const schema = __importStar(require("../database/schema"));
const tenant_context_1 = require("../database/tenant/tenant-context");
const drizzle_orm_1 = require("drizzle-orm");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const parser_service_1 = require("./parser.service");
const sanitizar_celda_util_1 = require("./sanitizar-celda.util");
const ExcelJS = __importStar(require("exceljs"));
let ImportacionesService = class ImportacionesService {
    db;
    importacionesQueue;
    parserService;
    constructor(db, importacionesQueue, parserService) {
        this.db = db;
        this.importacionesQueue = importacionesQueue;
        this.parserService = parserService;
    }
    async crearTrabajoImportacion(fileBuffer, fileName, tipo, usuarioId) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const filas = await this.parserService.parseFile(fileBuffer, fileName);
        const [trabajo] = await db
            .insert(schema.trabajosImportacion)
            .values({
            tenantId,
            iniciadoPorId: usuarioId,
            tipo,
            nombreArchivo: fileName,
            estado: 'procesando',
            totalFilas: filas.length,
        })
            .returning();
        await this.importacionesQueue.add('procesar-importacion', {
            trabajoId: trabajo.id,
            tenantId,
            tipo,
            filas,
        });
        return {
            trabajoId: trabajo.id,
            totalFilas: filas.length,
            estado: trabajo.estado,
            message: 'Procesamiento de importación encolado correctamente.',
        };
    }
    async obtenerTrabajo(trabajoId) {
        const db = tenant_context_1.TenantContext.getDb();
        const [trabajo] = await db
            .select()
            .from(schema.trabajosImportacion)
            .where((0, drizzle_orm_1.eq)(schema.trabajosImportacion.id, trabajoId));
        if (!trabajo) {
            throw new common_1.NotFoundException('Trabajo de importación no encontrado.');
        }
        return trabajo;
    }
    async exportarFinanciero(desdeStr, hastaStr) {
        const db = tenant_context_1.TenantContext.getDb();
        const desde = desdeStr ? new Date(desdeStr + 'T00:00:00') : new Date(Date.now() - 30 * 86400000);
        const hasta = hastaStr ? new Date(hastaStr + 'T23:59:59') : new Date();
        if (hasta.getTime() - desde.getTime() > 366 * 86400000) {
            throw new common_1.BadRequestException('El rango de fechas no puede exceder 1 año.');
        }
        const txs = await db
            .select({
            id: schema.transacciones.id,
            createdAt: schema.transacciones.createdAt,
            metodoPago: schema.transacciones.metodoPago,
            totalFacturado: schema.transacciones.totalFacturado,
            comisionBarbero: schema.transacciones.comisionBarbero,
            barberoNombre: schema.usuarios.nombreCompleto,
            clienteNombre: schema.clientes.nombreCompleto,
        })
            .from(schema.transacciones)
            .leftJoin(schema.citas, (0, drizzle_orm_1.eq)(schema.transacciones.citaId, schema.citas.id))
            .leftJoin(schema.usuarios, (0, drizzle_orm_1.eq)(schema.citas.barberoId, schema.usuarios.id))
            .leftJoin(schema.clientes, (0, drizzle_orm_1.eq)(schema.citas.clienteId, schema.clientes.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema.transacciones.createdAt, desde), (0, drizzle_orm_1.lte)(schema.transacciones.createdAt, hasta)));
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Reporte Financiero');
        sheet.columns = [
            { header: 'Fecha', key: 'fecha', width: 20 },
            { header: 'Cliente', key: 'cliente', width: 25 },
            { header: 'Barbero', key: 'barbero', width: 25 },
            { header: 'Método de Pago', key: 'metodoPago', width: 18 },
            { header: 'Total Facturado ($)', key: 'total', width: 20 },
            { header: 'Comisión ($)', key: 'comision', width: 18 },
        ];
        for (const t of txs) {
            sheet.addRow({
                fecha: t.createdAt.toISOString().substring(0, 19).replace('T', ' '),
                cliente: (0, sanitizar_celda_util_1.sanitizarCeldaExport)(t.clienteNombre || 'Cliente Mostrador'),
                barbero: (0, sanitizar_celda_util_1.sanitizarCeldaExport)(t.barberoNombre || 'Sin asignar'),
                metodoPago: (0, sanitizar_celda_util_1.sanitizarCeldaExport)(t.metodoPago),
                total: Number(t.totalFacturado || 0),
                comision: Number(t.comisionBarbero || 0),
            });
        }
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async exportarNomina(desdeStr, hastaStr) {
        const db = tenant_context_1.TenantContext.getDb();
        const desde = desdeStr ? new Date(desdeStr + 'T00:00:00') : new Date(Date.now() - 30 * 86400000);
        const hasta = hastaStr ? new Date(hastaStr + 'T23:59:59') : new Date();
        const detalles = await db
            .select({
            barberoId: schema.citas.barberoId,
            barberoNombre: schema.usuarios.nombreCompleto,
            comisionAplicada: schema.detallesTransaccion.comisionAplicada,
            subtotal: schema.detallesTransaccion.subtotal,
            propina: schema.transacciones.propinaBarbero,
            fecha: schema.transacciones.createdAt,
        })
            .from(schema.detallesTransaccion)
            .innerJoin(schema.transacciones, (0, drizzle_orm_1.eq)(schema.detallesTransaccion.transaccionId, schema.transacciones.id))
            .leftJoin(schema.citas, (0, drizzle_orm_1.eq)(schema.transacciones.citaId, schema.citas.id))
            .leftJoin(schema.usuarios, (0, drizzle_orm_1.eq)(schema.citas.barberoId, schema.usuarios.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema.transacciones.createdAt, desde), (0, drizzle_orm_1.lte)(schema.transacciones.createdAt, hasta)));
        const resumenNomina = new Map();
        for (const d of detalles) {
            const nombre = d.barberoNombre || 'Sin Asignar';
            const prev = resumenNomina.get(nombre) || { barberoNombre: nombre, totalComision: 0, totalVentas: 0 };
            prev.totalComision += Number(d.comisionAplicada || 0);
            prev.totalVentas += Number(d.subtotal || 0);
            resumenNomina.set(nombre, prev);
        }
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Reporte de Nómina');
        sheet.columns = [
            { header: 'Barbero / Staff', key: 'barbero', width: 30 },
            { header: 'Total Ventas Generadas ($)', key: 'ventas', width: 25 },
            { header: 'Comisión Congelada a Pagar ($)', key: 'comision', width: 30 },
        ];
        for (const [, item] of resumenNomina) {
            sheet.addRow({
                barbero: (0, sanitizar_celda_util_1.sanitizarCeldaExport)(item.barberoNombre),
                ventas: Number(item.totalVentas.toFixed(2)),
                comision: Number(item.totalComision.toFixed(2)),
            });
        }
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async exportarClientesMarketing() {
        const db = tenant_context_1.TenantContext.getDb();
        const listaClientes = await db
            .select()
            .from(schema.clientes)
            .where((0, drizzle_orm_1.eq)(schema.clientes.aceptaMarketing, true));
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Clientes Opt-In Marketing');
        sheet.columns = [
            { header: 'Nombre Completo', key: 'nombre', width: 30 },
            { header: 'Teléfono WhatsApp', key: 'telefono', width: 20 },
            { header: 'Email Facturación', key: 'email', width: 30 },
            { header: 'Notas de Preferencia', key: 'notas', width: 40 },
            { header: 'Consentimiento Ley 81', key: 'consentimiento', width: 22 },
        ];
        for (const c of listaClientes) {
            sheet.addRow({
                nombre: (0, sanitizar_celda_util_1.sanitizarCeldaExport)(c.nombreCompleto || 'Sin nombre'),
                telefono: (0, sanitizar_celda_util_1.sanitizarCeldaExport)(c.telefonoWhatsapp),
                email: (0, sanitizar_celda_util_1.sanitizarCeldaExport)(c.emailFacturacion || ''),
                notas: (0, sanitizar_celda_util_1.sanitizarCeldaExport)(c.notasPreferencia || ''),
                consentimiento: 'SÍ (Opt-In Autorizado)',
            });
        }
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
};
exports.ImportacionesService = ImportacionesService;
exports.ImportacionesService = ImportacionesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __param(1, (0, bullmq_1.InjectQueue)('importaciones')),
    __metadata("design:paramtypes", [Function, bullmq_2.Queue,
        parser_service_1.ParserService])
], ImportacionesService);
//# sourceMappingURL=importaciones.service.js.map