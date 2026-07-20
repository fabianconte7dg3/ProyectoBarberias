import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import * as crypto from 'crypto';
import { yappyConfig, citas, transacciones } from '../database/schema';
import { TenantContext } from '../database/tenant/tenant-context';
import { runInTenantScope } from '../database/tenant/tenant.utils';
import { IYappyPort, IYappyInitResponse } from './adapters/yappy.port';
import { YappyManualAdapter } from './adapters/yappy-manual.adapter';
import { YappyComercialAdapter } from './adapters/yappy-comercial.adapter';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { DgiService } from '../dgi/dgi.service';

const ENCRYPTION_KEY = process.env.APP_SECRET || '12345678901234567890123456789012'; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

@Injectable()
export class YappyService {
  constructor(private readonly dgiService: DgiService) {}

  /**
   * Resuelve qué adaptador de Yappy usar basado en la configuración del tenant
   */
  async getAdapter(tenantId: string, db?: NodePgDatabase<typeof schema>): Promise<IYappyPort> {
    const currentDb = db || TenantContext.getDb();
    const config = await currentDb.query.yappyConfig.findFirst({
      where: eq(yappyConfig.tenantId, tenantId),
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
      
      let secretKey: string;
      try {
        secretKey = decrypt(config.secretKeyCifrada);
      } catch (e) {
        throw new InternalServerErrorException('Error descifrando la llave secreta de Yappy');
      }
      
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
  async processIpn(orderId: string, status: string, hash: string, domain: string, db: NodePgDatabase<typeof schema>) {
    // Buscamos el tenant por SECURITY DEFINER
    const result = await db.execute(sql`SELECT get_tenant_for_yappy_order(${orderId}) as tenant_id`);
    const tenantId = result.rows[0]?.tenant_id as string | undefined;

    if (!tenantId) {
      throw new UnauthorizedException('Orden no encontrada');
    }

    // Todo se ejecuta dentro del scope del tenant para que RLS permita leer config y transacciones
    await runInTenantScope(db, tenantId, async (tenantDb) => {
      // Buscamos la config del tenant
      const config = await tenantDb.query.yappyConfig.findFirst({
        where: eq(yappyConfig.tenantId, tenantId),
      });

      if (!config || config.modo !== 'comercial' || !config.secretKeyCifrada) {
        throw new UnauthorizedException('Configuración Yappy inválida para este tenant');
      }

      // Descifrar la llave para verificar el hash
      let secretKey: string;
      try {
        secretKey = decrypt(config.secretKeyCifrada);
      } catch (e) {
        throw new InternalServerErrorException('Error descifrando la llave secreta');
      }

      // Generar hash HMAC-SHA256 esperado
      const dataToHash = `${orderId}${status}${domain}`; 
      const expectedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataToHash)
        .digest('hex');

      if (hash !== expectedHash) {
        throw new UnauthorizedException('Hash inválido');
      }

      // Necesitamos la info de la tx real
      const txInfo = await tenantDb.query.transacciones.findFirst({
        where: eq(schema.transacciones.yappyOrderId, orderId),
      });
      if (!txInfo) return;

      if (status === 'E') {
        console.log(`Pago Yappy ${orderId} exitoso`);
        
        // Marcar cita como completada
        await tenantDb.update(citas)
          .set({ estado: 'completada' })
          .where(eq(citas.id, txInfo.citaId));

        // Actualizar transacción con payload de Yappy
        await tenantDb.update(schema.transacciones)
          .set({
            yappyWebhookReceivedAt: new Date(),
            yappyWebhookPayload: { orderId, status, hash, domain },
          })
          .where(eq(schema.transacciones.id, txInfo.id));

        // Emitir factura DGI
        this.dgiService.emitirFacturaAsync(
          txInfo.tenantId,
          txInfo.id,
          txInfo.totalFacturado,
          txInfo.rucCliente,
          txInfo.nombreFiscalCliente
        ).catch(err => console.error('Error al emitir factura a DGI desde Yappy IPN:', err));
        
      } else if (status === 'R' || status === 'C' || status === 'X') {
        console.log(`Pago Yappy ${orderId} falló con estado: ${status}`);
        
        // Marcar cita como pendiente otra vez o dejarla en estado previo si Yappy falló.
        // Asumiendo que la cita no se completó, la devolvemos a "programada" si estaba en algún estado intermedio,
        // o la cancelamos si expiró (X). Por simplicidad, si fue cancelada por usuario (C) o expiró (X)
        // se puede liberar el turno:
        if (status === 'C' || status === 'X') {
          await tenantDb.update(citas)
            .set({ estado: 'cancelada' })
            .where(eq(citas.id, txInfo.citaId));
        }

        // Podríamos también tener un campo estado en transacciones, pero como no lo tenemos en el schema actual,
        // al menos revertimos la cita.
      } else {
        console.warn(`Estado Yappy desconocido: ${status}`);
      }
    });

    return { success: true };
  }
}

