import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import { transacciones, cierresDeCaja } from '../database/schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { startOfDay } from 'date-fns';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CajaService {
  constructor(private readonly auditService: AuditService) {}
  
  /**
   * Obtiene el balance esperado en efectivo para el día actual.
   * Solo considera las transacciones pagadas en efectivo, o la parte en efectivo de los pagos mixtos.
   */
  async getBalanceDelDia() {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();
    const hoy = startOfDay(new Date());

    // Obtenemos las transacciones de hoy en efectivo o mixto
    const txsDelDia = await db.query.transacciones.findMany({
      where: and(
        eq(transacciones.tenantId, tenantId),
        gte(transacciones.createdAt, hoy),
        sql`${transacciones.metodoPago} IN ('efectivo', 'mixto')`
      )
    });

    let efectivoEsperado = 0;

    for (const tx of txsDelDia) {
      if (tx.metodoPago === 'efectivo') {
        efectivoEsperado += Number(tx.totalFacturado);
      } else if (tx.metodoPago === 'mixto') {
        efectivoEsperado += Number(tx.montoEfectivoIngresado || 0);
      }
    }

    return {
      fecha: hoy,
      efectivoEsperado,
      cantidadTransaccionesEfectivo: txsDelDia.length
    };
  }

  /**
   * Cierra la caja registrando el efectivo declarado y comparando con el esperado.
   */
  async cerrarCaja(usuarioId: string, dto: CerrarCajaDto, ipOrigen?: string, userAgent?: string) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();
    const hoy = new Date(); // Usamos la fecha/hora actual del cierre

    const balance = await this.getBalanceDelDia();

    // Determinar estado de la caja (esto normalmente es un trigger en postgres o lo podemos setear aquí si Postgres no lo hace)
    // Según schema dice "diferencia se genera en Postgres" pero necesitamos el estado
    // Determinar estado de la caja
    let estado: 'cuadrado' | 'sobrante' | 'faltante' = 'cuadrado';
    const diferencia = dto.efectivoDeclarado - balance.efectivoEsperado;
    
    if (diferencia > 0) estado = 'sobrante';
    if (diferencia < 0) estado = 'faltante';

    const [nuevoCierre] = await db.insert(cierresDeCaja).values({
      tenantId,
      declaradoPorId: usuarioId,
      fechaCierre: hoy.toISOString(), // date type en schema puede requerir 'YYYY-MM-DD'
      efectivoDeclarado: dto.efectivoDeclarado.toString(),
      efectivoEsperado: balance.efectivoEsperado.toString(),
      estado,
      notasAdmin: dto.notasAdmin
    }).returning();

    // Log de auditoría si hay descuadre
    if (estado !== 'cuadrado') {
      await this.auditService.logAction({
        tenantId,
        usuarioId,
        tablaAfectada: 'cierres_de_caja',
        registroId: nuevoCierre.id,
        accion: 'cierre_emergencia',
        payloadAntes: { esperado: balance.efectivoEsperado },
        payloadDespues: { declarado: dto.efectivoDeclarado, diferencia },
        ipOrigen,
        userAgent
      });
    }

    return nuevoCierre;
  }
}

