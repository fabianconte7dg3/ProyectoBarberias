import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';
import { yappy_config, citas } from '../database/schema';
import { TenantContext } from '../database/tenant/tenant-context';
import { IYappyPort, IYappyInitResponse } from './adapters/yappy.port';
import { YappyManualAdapter } from './adapters/yappy-manual.adapter';
import { YappyComercialAdapter } from './adapters/yappy-comercial.adapter';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { DgiService } from '../dgi/dgi.service';

@Injectable()
export class YappyService {
  constructor(private readonly dgiService: DgiService) {}

  /**
   * Resuelve qué adaptador de Yappy usar basado en la configuración del tenant
   */
  async getAdapter(tenantId: string, db?: NodePgDatabase<typeof schema>): Promise<IYappyPort> {
    const currentDb = db || TenantContext.getDb();
    const config = await currentDb.query.yappy_config.findFirst({
      where: eq(yappy_config.tenantId, tenantId),
    });

    if (!config) {
      // Fallback a manual si no hay configuración
      return new YappyManualAdapter('NO_CONFIG');
    }

    if (config.modo === 'manual') {
      return new YappyManualAdapter(config.numeroPersonal || '');
    } else {
      // Comercial
      if (!config.merchantId || !config.secretKeyCifrada) {
        throw new InternalServerErrorException('Configuración de Yappy Comercial incompleta');
      }
      
      // En un entorno real, `secretKeyCifrada` se descifra aquí. 
      // Por simplicidad en este prototipo, asumimos que se puede usar o descifrar.
      const secretKey = config.secretKeyCifrada;
      const domain = process.env.APP_DOMAIN || 'https://midominio.com';

      return new YappyComercialAdapter(config.merchantId, secretKey, domain);
    }
  }

  /**
   * Inicia el pago obteniendo el adaptador correcto
   */
  async initiatePayment(tenantId: string, orderId: string, monto: number): Promise<IYappyInitResponse> {
    const adapter = await this.getAdapter(tenantId);
    return adapter.initiatePayment(orderId, monto);
  }

  /**
   * Valida el hash HMAC-SHA256 del IPN de Yappy
   * Status: E (Ejecutado), R (Rechazado), C (Cancelado)
   */
  async processIpn(orderId: string, status: string, hash: string, domain: string, globalDb: NodePgDatabase<typeof schema>) {
    // Para validar el IPN, necesitamos encontrar de qué tenant es esta orden
    // Buscamos la transacción por yappyOrderId (que equivale al orderId aquí)
    const txInfo = await globalDb.query.transacciones.findFirst({
      where: eq(schema.transacciones.yappyOrderId, orderId),
    });

    if (!txInfo) {
      throw new UnauthorizedException('Orden no encontrada');
    }

    // Buscamos la config del tenant
    const config = await globalDb.query.yappy_config.findFirst({
      where: eq(yappy_config.tenantId, txInfo.tenantId),
    });

    if (!config || config.modo !== 'comercial' || !config.secretKeyCifrada) {
      throw new UnauthorizedException('Configuración Yappy inválida para este tenant');
    }

    // Generar hash HMAC-SHA256 esperado
    // La documentación de Yappy suele requerir concatenar los parámetros (ej: orderId + status + domain) y firmarlos con el secretKey
    // Asumimos un payload de validación estándar:
    const dataToHash = `${orderId}${status}${domain}`; 
    const expectedHash = crypto
      .createHmac('sha256', config.secretKeyCifrada)
      .update(dataToHash)
      .digest('hex');

    if (hash !== expectedHash) {
      throw new UnauthorizedException('Hash inválido');
    }

    // Procesar estado
    if (status === 'E') {
      console.log(`Pago Yappy ${orderId} exitoso`);
      
      // Marcar cita como completada usando runInTenantScope o directamente
      await globalDb.update(citas)
        .set({ estado: 'completada' })
        .where(eq(citas.id, txInfo.citaId));

      // Emitir factura DGI
      this.dgiService.emitirFacturaAsync(
        txInfo.tenantId,
        txInfo.id,
        txInfo.totalFacturado,
        txInfo.rucCliente,
        txInfo.nombreFiscalCliente
      ).catch(err => console.error('Error al emitir factura a DGI desde Yappy IPN:', err));
      
    } else {
      console.log(`Pago Yappy ${orderId} falló/cancelado con estado: ${status}`);
    }

    return { success: true };
  }
}

