import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { TenantContext } from '../database/tenant/tenant-context';
import { eq, and, gte, lte } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ParserService } from './parser.service';
import { sanitizarCeldaExport } from './sanitizar-celda.util';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ImportacionesService {
  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
    @InjectQueue('importaciones') private readonly importacionesQueue: Queue,
    private readonly parserService: ParserService,
  ) {}

  async crearTrabajoImportacion(
    fileBuffer: Buffer,
    fileName: string,
    tipo: 'clientes' | 'productos' | 'servicios',
    usuarioId: string,
  ) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    // 1. Parsear archivo con ExcelJS (validación peso + filas max 5000 + strip tenantId)
    const filas = await this.parserService.parseFile(fileBuffer, fileName);

    // 2. Registrar fila de auditoría en trabajos_importacion
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

    // 3. Encolar Job en BullMQ
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

  async obtenerTrabajo(trabajoId: string) {
    const db = TenantContext.getDb();
    const [trabajo] = await db
      .select()
      .from(schema.trabajosImportacion)
      .where(eq(schema.trabajosImportacion.id, trabajoId));

    if (!trabajo) {
      throw new NotFoundException('Trabajo de importación no encontrado.');
    }

    return trabajo;
  }

  /**
   * EXPORTACIÓN FINANCIERA (.xlsx)
   */
  async exportarFinanciero(desdeStr?: string, hastaStr?: string): Promise<Buffer> {
    const db = TenantContext.getDb();
    const desde = desdeStr ? new Date(desdeStr + 'T00:00:00') : new Date(Date.now() - 30 * 86400000);
    const hasta = hastaStr ? new Date(hastaStr + 'T23:59:59') : new Date();

    // Límite máximo de 1 año
    if (hasta.getTime() - desde.getTime() > 366 * 86400000) {
      throw new BadRequestException('El rango de fechas no puede exceder 1 año.');
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
      .leftJoin(schema.citas, eq(schema.transacciones.citaId, schema.citas.id))
      .leftJoin(schema.usuarios, eq(schema.citas.barberoId, schema.usuarios.id))
      .leftJoin(schema.clientes, eq(schema.citas.clienteId, schema.clientes.id))
      .where(and(
        gte(schema.transacciones.createdAt, desde),
        lte(schema.transacciones.createdAt, hasta)
      ));

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
        cliente: sanitizarCeldaExport(t.clienteNombre || 'Cliente Mostrador'),
        barbero: sanitizarCeldaExport(t.barberoNombre || 'Sin asignar'),
        metodoPago: sanitizarCeldaExport(t.metodoPago),
        total: Number(t.totalFacturado || 0),
        comision: Number(t.comisionBarbero || 0),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * EXPORTACIÓN DE NÓMINA CON COMISIÓN CONGELADA (.xlsx)
   */
  async exportarNomina(desdeStr?: string, hastaStr?: string): Promise<Buffer> {
    const db = TenantContext.getDb();
    const desde = desdeStr ? new Date(desdeStr + 'T00:00:00') : new Date(Date.now() - 30 * 86400000);
    const hasta = hastaStr ? new Date(hastaStr + 'T23:59:59') : new Date();

    // Sumar detalles_transaccion.comisionAplicada (el valor congelado al momento del cobro)
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
      .innerJoin(schema.transacciones, eq(schema.detallesTransaccion.transaccionId, schema.transacciones.id))
      .leftJoin(schema.citas, eq(schema.transacciones.citaId, schema.citas.id))
      .leftJoin(schema.usuarios, eq(schema.citas.barberoId, schema.usuarios.id))
      .where(and(
        gte(schema.transacciones.createdAt, desde),
        lte(schema.transacciones.createdAt, hasta)
      ));

    // Agrupar por barbero
    const resumenNomina = new Map<string, { barberoNombre: string; totalComision: number; totalVentas: number }>();

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
        barbero: sanitizarCeldaExport(item.barberoNombre),
        ventas: Number(item.totalVentas.toFixed(2)),
        comision: Number(item.totalComision.toFixed(2)),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * EXPORTACIÓN CLIENTES MARKETING LEY 81 (.xlsx)
   */
  async exportarClientesMarketing(): Promise<Buffer> {
    const db = TenantContext.getDb();

    // Filtro Estricto Ley 81 de Panamá: aceptaMarketing = true
    const listaClientes = await db
      .select()
      .from(schema.clientes)
      .where(eq(schema.clientes.aceptaMarketing, true));

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
        nombre: sanitizarCeldaExport(c.nombreCompleto || 'Sin nombre'),
        telefono: sanitizarCeldaExport(c.telefonoWhatsapp),
        email: sanitizarCeldaExport(c.emailFacturacion || ''),
        notas: sanitizarCeldaExport(c.notasPreferencia || ''),
        consentimiento: 'SÍ (Opt-In Autorizado)',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
