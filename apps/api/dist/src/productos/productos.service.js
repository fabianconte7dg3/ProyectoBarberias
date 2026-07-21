"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductosService = void 0;
const common_1 = require("@nestjs/common");
const tenant_context_1 = require("../database/tenant/tenant-context");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
let ProductosService = class ProductosService {
    async create(dto) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const [nuevo] = await db
            .insert(schema_1.productos)
            .values({
            tenantId,
            nombre: dto.nombre,
            descripcion: dto.descripcion,
            precioVenta: dto.precioVenta.toFixed(2),
            costoCompra: dto.costoCompra.toFixed(2),
            stockActual: dto.stockActual,
            stockMinimo: dto.stockMinimo ?? 2,
        })
            .returning();
        return nuevo;
    }
    async findAll(userRole) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const result = await db.query.productos.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.productos.tenantId, tenantId),
            orderBy: [(0, drizzle_orm_1.asc)(schema_1.productos.nombre)],
        });
        return result.map((p) => {
            const item = {
                ...p,
                precioVenta: Number(p.precioVenta),
                costoCompra: Number(p.costoCompra),
            };
            if (userRole !== 'admin') {
                delete item.costoCompra;
            }
            return item;
        });
    }
    async findOne(id, userRole) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const p = await db.query.productos.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productos.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.productos.id, id)),
        });
        if (!p) {
            throw new common_1.NotFoundException('Producto no encontrado');
        }
        const item = {
            ...p,
            precioVenta: Number(p.precioVenta),
            costoCompra: Number(p.costoCompra),
        };
        if (userRole !== 'admin') {
            delete item.costoCompra;
        }
        return item;
    }
    async update(id, dto) {
        const db = tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        await this.findOne(id, 'admin');
        const updateData = {};
        if (dto.nombre !== undefined)
            updateData.nombre = dto.nombre;
        if (dto.descripcion !== undefined)
            updateData.descripcion = dto.descripcion;
        if (dto.precioVenta !== undefined)
            updateData.precioVenta = dto.precioVenta.toFixed(2);
        if (dto.costoCompra !== undefined)
            updateData.costoCompra = dto.costoCompra.toFixed(2);
        if (dto.stockActual !== undefined)
            updateData.stockActual = dto.stockActual;
        if (dto.stockMinimo !== undefined)
            updateData.stockMinimo = dto.stockMinimo;
        if (dto.activo !== undefined)
            updateData.activo = dto.activo;
        const [actualizado] = await db
            .update(schema_1.productos)
            .set(updateData)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productos.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.productos.id, id)))
            .returning();
        return actualizado;
    }
    async descontarStockAtomico(productoId, cantidad, txClient) {
        const db = txClient || tenant_context_1.TenantContext.getDb();
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const res = await db.execute((0, drizzle_orm_1.sql) `
      UPDATE productos
      SET stock_actual = stock_actual - ${cantidad}
      WHERE id = ${productoId}
        AND tenant_id = ${tenantId}
        AND stock_actual >= ${cantidad}
      RETURNING id, nombre, precio_venta, stock_actual;
    `);
        const updatedRows = res.rows || res;
        if (!updatedRows || updatedRows.length === 0) {
            throw new common_1.BadRequestException(`Stock insuficiente o producto inactivo/inexistente (ID: ${productoId}).`);
        }
        return updatedRows[0];
    }
};
exports.ProductosService = ProductosService;
exports.ProductosService = ProductosService = __decorate([
    (0, common_1.Injectable)()
], ProductosService);
//# sourceMappingURL=productos.service.js.map