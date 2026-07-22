import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import { clientes, productos, transacciones, detallesTransaccion, usuarios } from '../database/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { parseCsvContent, sanitizeCsvCell } from './datos.utils';
import { subDays, endOfDay, format } from 'date-fns';

export interface ReporteImportacion {
  totalFilas: number;
  creados: number;
  actualizados: number;
  rechazados: number;
  errores: Array<{ fila: number; identificador: string; motivo: string }>;
}

@Injectable()
export class DatosService {

  /**
   * Importación Segura de Clientes (Regla de Merge, Tenant Context Forzado)
   */
  async importarClientes(csvString: string): Promise<ReporteImportacion> {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    const filas = parseCsvContent(csvString);

    if (filas.length > 5000) {
      throw new BadRequestException('El archivo excede el límite máximo permitido de 5,000 filas.');
    }

    const reporte: ReporteImportacion = {
      totalFilas: filas.length,
      creados: 0,
      actualizados: 0,
      rechazados: 0,
      errores: [],
    };

    for (let i = 0; i < filas.length; i++) {
      const numFila = i + 2; // offset por cabecera y 1-based
      const fila = filas[i];

      const telefonoRaw = fila['telefono'] || fila['telefonowhatsapp'] || fila['whatsapp'] || fila['phone'];
      const nombreRaw = fila['nombre'] || fila['nombrecompleto'] || fila['name'];
      const emailRaw = fila['email'] || fila['emailfacturacion'] || fila['correo'];
      const notasRaw = fila['notas'] || fila['notaspreferencia'] || fila['preferencias'];
      const aceptaMktRaw = fila['aceptamarketing'] || fila['marketing'] || fila['optin'];

      if (!telefonoRaw) {
        reporte.rechazados++;
        reporte.errores.push({
          fila: numFila,
          identificador: nombreRaw || 'Fila ' + numFila,
          motivo: 'El campo Teléfono/WhatsApp es obligatorio.'
        });
        continue;
      }

      // Normalizar Teléfono
      const telefonoWhatsapp = telefonoRaw.replace(/[^0-9+]/g, '');

      // Parsear Opt-In Marketing
      const aceptaMarketing = String(aceptaMktRaw).toLowerCase() === 'si' || 
                              String(aceptaMktRaw).toLowerCase() === 'true' || 
                              aceptaMktRaw === '1';

      try {
        // Buscar si ya existe por (tenantId, telefonoWhatsapp)
        const [clienteExistente] = await db.query.clientes.findMany({
          where: and(
            eq(clientes.tenantId, tenantId),
            eq(clientes.telefonoWhatsapp, telefonoWhatsapp)
          )
        });

        if (clienteExistente) {
          // MERGE SEGURO: Solo actualiza datos de contacto y preferencia.
          // NUNCA sobreescribe totalAsistencias, ausenciasStrikes o totalGastado
          await db.update(clientes)
            .set({
              nombreCompleto: nombreRaw || clienteExistente.nombreCompleto,
              emailFacturacion: emailRaw || clienteExistente.emailFacturacion,
              notasPreferencia: notasRaw || clienteExistente.notasPreferencia,
              aceptaMarketing: aceptaMarketing !== undefined ? aceptaMarketing : clienteExistente.aceptaMarketing,
            })
            .where(eq(clientes.id, clienteExistente.id));
          reporte.actualizados++;
        } else {
          // CREAR NUEVO CLIENTE
          await db.insert(clientes).values({
            tenantId,
            telefonoWhatsapp,
            nombreCompleto: nombreRaw || 'Cliente Registrado',
            emailFacturacion: emailRaw || null,
            notasPreferencia: notasRaw || null,
            aceptaMarketing,
          });
          reporte.creados++;
        }
      } catch (err: any) {
        reporte.rechazados++;
        reporte.errores.push({
          fila: numFila,
          identificador: telefonoWhatsapp,
          motivo: err.message || 'Error al procesar la fila en la base de datos.'
        });
      }
    }

    return reporte;
  }

  /**
   * Importación Masiva de Productos Retail
   */
  async importarProductos(csvString: string): Promise<ReporteImportacion> {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    const filas = parseCsvContent(csvString);

    if (filas.length > 5000) {
      throw new BadRequestException('El archivo excede el límite máximo permitido de 5,000 filas.');
    }

    const reporte: ReporteImportacion = {
      totalFilas: filas.length,
      creados: 0,
      actualizados: 0,
      rechazados: 0,
      errores: [],
    };

    for (let i = 0; i < filas.length; i++) {
      const numFila = i + 2;
      const fila = filas[i];

      const nombreRaw = fila['nombre'] || fila['nombreproducto'] || fila['product'];
      const precioVentaRaw = fila['precioventa'] || fila['precio'] || fila['price'];
      const costoCompraRaw = fila['costocompra'] || fila['costo'] || fila['cost'];
      const stockActualRaw = fila['stockactual'] || fila['stock'] || fila['cantidad'];
      const stockMinimoRaw = fila['stockminimo'] || fila['minimo'];

      if (!nombreRaw) {
        reporte.rechazados++;
        reporte.errores.push({ fila: numFila, identificador: 'Fila ' + numFila, motivo: 'El Nombre del Producto es obligatorio.' });
        continue;
      }

      const precioVenta = parseFloat(precioVentaRaw || '0');
      const costoCompra = parseFloat(costoCompraRaw || '0');
      const stockActual = parseInt(stockActualRaw || '0', 10);
      const stockMinimo = parseInt(stockMinimoRaw || '2', 10);

      if (isNaN(precioVenta) || precioVenta < 0 || isNaN(costoCompra) || costoCompra < 0) {
        reporte.rechazados++;
        reporte.errores.push({
          fila: numFila,
          identificador: nombreRaw,
          motivo: 'Los precios y costos deben ser números mayor o igual a cero.'
        });
        continue;
      }

      try {
        const [prodExistente] = await db.query.productos.findMany({
          where: and(
            eq(productos.tenantId, tenantId),
            eq(productos.nombre, nombreRaw)
          )
        });

        if (prodExistente) {
          await db.update(productos)
            .set({
              precioVenta: precioVenta.toFixed(2),
              costoCompra: costoCompra.toFixed(2),
              stockActual,
              stockMinimo,
            })
            .where(eq(productos.id, prodExistente.id));
          reporte.actualizados++;
        } else {
          await db.insert(productos).values({
            tenantId,
            nombre: nombreRaw,
            precioVenta: precioVenta.toFixed(2),
            costoCompra: costoCompra.toFixed(2),
            stockActual,
            stockMinimo,
          });
          reporte.creados++;
        }
      } catch (err: any) {
        reporte.rechazados++;
        reporte.errores.push({
          fila: numFila,
          identificador: nombreRaw,
          motivo: err.message || 'Error guardando producto.'
        });
      }
    }

    return reporte;
  }

  /**
   * EXPORTACIÓN 1: Transacciones Financieras Sanitizadas
   */
  async exportarTransaccionesCsv(desdeStr?: string, hastaStr?: string): Promise<string> {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    let desde = desdeStr ? new Date(`${desdeStr}T00:00:00`) : subDays(new Date(), 30);
    let hasta = hastaStr ? new Date(`${hastaStr}T23:59:59.999`) : endOfDay(new Date());

    const txs = await db.query.transacciones.findMany({
      where: and(
        eq(transacciones.tenantId, tenantId),
        gte(transacciones.createdAt, desde),
        lte(transacciones.createdAt, hasta)
      ),
      with: {
        cita: {
          with: {
            barbero: true,
            cliente: true,
            servicio: true,
          }
        }
      }
    });

    const headers = ['ID_Transaccion', 'Fecha', 'Metodo_Pago', 'Total_Facturado', 'Comision_Barbero', 'Propina_Barbero', 'Barbero', 'Cliente_Tel'];
    const rows = [headers.join(',')];

    for (const tx of txs) {
      const fila = [
        sanitizeCsvCell(tx.id),
        sanitizeCsvCell(format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm')),
        sanitizeCsvCell(tx.metodoPago),
        sanitizeCsvCell(tx.totalFacturado),
        sanitizeCsvCell(tx.comisionBarbero),
        sanitizeCsvCell(tx.propinaBarbero),
        sanitizeCsvCell(tx.cita?.barbero?.nombreCompleto || 'Staff'),
        sanitizeCsvCell(tx.cita?.cliente?.telefonoWhatsapp || 'Sin Teléfono'),
      ];
      rows.push(fila.join(','));
    }

    return rows.join('\n');
  }

  /**
   * EXPORTACIÓN 2: Base de Clientes Filtrada Ley 81 (aceptaMarketing === true)
   */
  async exportarClientesMarketingCsv(): Promise<string> {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    const clientesOptIn = await db.query.clientes.findMany({
      where: and(
        eq(clientes.tenantId, tenantId),
        eq(clientes.aceptaMarketing, true)
      )
    });

    const headers = ['Nombre_Completo', 'Telefono_WhatsApp', 'Email_Facturacion', 'Total_Asistencias', 'Total_Gastado_USD', 'OptIn_Marketing'];
    const rows = [headers.join(',')];

    for (const c of clientesOptIn) {
      const fila = [
        sanitizeCsvCell(c.nombreCompleto || 'Cliente'),
        sanitizeCsvCell(c.telefonoWhatsapp),
        sanitizeCsvCell(c.emailFacturacion || ''),
        sanitizeCsvCell(c.totalAsistencias),
        sanitizeCsvCell(c.totalGastado),
        sanitizeCsvCell('SI'),
      ];
      rows.push(fila.join(','));
    }

    return rows.join('\n');
  }

  /**
   * EXPORTACIÓN 3: Reporte de Nómina con Comisión Congelada Histórica
   */
  async exportarNominaCsv(desdeStr?: string, hastaStr?: string): Promise<string> {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    let desde = desdeStr ? new Date(`${desdeStr}T00:00:00`) : subDays(new Date(), 30);
    let hasta = hastaStr ? new Date(`${hastaStr}T23:59:59.999`) : endOfDay(new Date());

    const txs = await db.query.transacciones.findMany({
      where: and(
        eq(transacciones.tenantId, tenantId),
        gte(transacciones.createdAt, desde),
        lte(transacciones.createdAt, hasta)
      ),
      with: {
        cita: {
          with: {
            barbero: true,
          }
        },
        detalles: true
      }
    });

    // Agrupar por barbero usando la comisión congelada en detallesTransaccion
    const nominaMap = new Map<string, { nombre: string; totalServicios: number; totalProductos: number; comisionAcumulada: number; propinas: number }>();

    for (const tx of txs) {
      const bId = tx.cita?.barbero?.id;
      const bNombre = tx.cita?.barbero?.nombreCompleto || 'Staff General';
      if (!bId) continue;

      let entry = nominaMap.get(bId) || { nombre: bNombre, totalServicios: 0, totalProductos: 0, comisionAcumulada: 0, propinas: 0 };

      entry.propinas += Number(tx.propinaBarbero || 0);

      if (tx.detalles && tx.detalles.length > 0) {
        for (const det of tx.detalles) {
          const sub = Number(det.subtotal || 0);
          const comCongelada = Number(det.comisionAplicada || 0);
          if (det.tipoItem === 'servicio') entry.totalServicios += sub;
          else if (det.tipoItem === 'producto') entry.totalProductos += sub;
          entry.comisionAcumulada += comCongelada;
        }
      } else {
        entry.totalServicios += Number(tx.totalFacturado || 0);
        entry.comisionAcumulada += Number(tx.comisionBarbero || 0);
      }

      nominaMap.set(bId, entry);
    }

    const headers = ['Barbero', 'Facturado_Servicios', 'Facturado_Productos', 'Comision_Neto_Congelada', 'Propinas', 'Total_Pagar'];
    const rows = [headers.join(',')];

    for (const [_, data] of nominaMap.entries()) {
      const totalPagar = data.comisionAcumulada + data.propinas;
      const fila = [
        sanitizeCsvCell(data.nombre),
        sanitizeCsvCell(data.totalServicios.toFixed(2)),
        sanitizeCsvCell(data.totalProductos.toFixed(2)),
        sanitizeCsvCell(data.comisionAcumulada.toFixed(2)),
        sanitizeCsvCell(data.propinas.toFixed(2)),
        sanitizeCsvCell(totalPagar.toFixed(2)),
      ];
      rows.push(fila.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Generación de Plantillas CSV de Muestra
   */
  obtenerPlantillaCsv(tipo: 'clientes' | 'productos'): string {
    if (tipo === 'clientes') {
      const headers = ['NombreCompleto', 'TelefonoWhatsApp', 'EmailFacturacion', 'NotasPreferencia', 'AceptaMarketing'];
      const ejemplo1 = [sanitizeCsvCell('Juan Pérez'), sanitizeCsvCell('+50766001122'), sanitizeCsvCell('juan@email.com'), sanitizeCsvCell('Prefiere degradado bajo'), sanitizeCsvCell('SI')];
      const ejemplo2 = [sanitizeCsvCell('Carlos Gómez'), sanitizeCsvCell('+50766554433'), sanitizeCsvCell('carlos@email.com'), sanitizeCsvCell('Sin notas'), sanitizeCsvCell('NO')];
      return [headers.join(','), ejemplo1.join(','), ejemplo2.join(',')].join('\n');
    } else {
      const headers = ['NombreProducto', 'PrecioVenta', 'CostoCompra', 'StockActual', 'StockMinimo'];
      const ejemplo1 = [sanitizeCsvCell('Cera Mate Premium 100g'), sanitizeCsvCell('15.00'), sanitizeCsvCell('7.50'), sanitizeCsvCell('24'), sanitizeCsvCell('5')];
      const ejemplo2 = [sanitizeCsvCell('Aceite de Barba Orgánico'), sanitizeCsvCell('12.50'), sanitizeCsvCell('6.00'), sanitizeCsvCell('10'), sanitizeCsvCell('2')];
      return [headers.join(','), ejemplo1.join(','), ejemplo2.join(',')].join('\n');
    }
  }
}
