import * as crypto from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { YappyService } from './yappy.service';
import { DgiService } from '../dgi/dgi.service';
import { TenantContext } from '../database/tenant/tenant-context';
import { citas, transacciones } from '../database/schema';

// Replica exacta de encrypt() en yappy.service.ts (no exportada) para poder generar
// ciphertext válido de prueba con la misma clave que usará el servicio bajo test.
const ENCRYPTION_KEY =
  process.env.APP_SECRET || '12345678901234567890123456789012';
function encryptForTest(text: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

describe('YappyService', () => {
  let service: YappyService;
  let dgiService: { emitirFacturaAsync: jest.Mock };

  const TENANT_ID = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    dgiService = { emitirFacturaAsync: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [YappyService, { provide: DgiService, useValue: dgiService }],
    }).compile();

    service = module.get<YappyService>(YappyService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAdapter / initiatePayment', () => {
    it('usa el adaptador manual con NO_CONFIG si el tenant no tiene configuración de Yappy', async () => {
      const db = {
        query: {
          yappyConfig: { findFirst: jest.fn().mockResolvedValue(undefined) },
        },
      };
      jest.spyOn(TenantContext, 'getDb').mockReturnValue(db as any);

      const result = await service.initiatePayment(TENANT_ID, 'order-1', 25);

      expect(result.modo).toBe('manual');
      expect(result.numeroPersonal).toBe('NO_CONFIG');
    });

    it('usa el adaptador manual con el número personal configurado', async () => {
      const db = {
        query: {
          yappyConfig: {
            findFirst: jest.fn().mockResolvedValue({
              modo: 'manual',
              numeroPersonal: '6000-1234',
            }),
          },
        },
      };
      jest.spyOn(TenantContext, 'getDb').mockReturnValue(db as any);

      const result = await service.initiatePayment(TENANT_ID, 'order-1', 25);

      expect(result.numeroPersonal).toBe('6000-1234');
    });

    it('lanza InternalServerErrorException si el modo comercial no tiene merchantId/secretKey', async () => {
      const db = {
        query: {
          yappyConfig: {
            findFirst: jest.fn().mockResolvedValue({ modo: 'comercial' }),
          },
        },
      };
      jest.spyOn(TenantContext, 'getDb').mockReturnValue(db as any);

      await expect(
        service.initiatePayment(TENANT_ID, 'order-1', 25),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('lanza InternalServerErrorException si la llave secreta no puede descifrarse', async () => {
      const db = {
        query: {
          yappyConfig: {
            findFirst: jest.fn().mockResolvedValue({
              modo: 'comercial',
              merchantId: 'm1',
              secretKeyCifrada: 'no-es-un-cifrado-valido',
            }),
          },
        },
      };
      jest.spyOn(TenantContext, 'getDb').mockReturnValue(db as any);

      await expect(
        service.initiatePayment(TENANT_ID, 'order-1', 25),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('modo comercial completo inicia el pago correctamente (branch de mock de sandbox)', async () => {
      const db = {
        query: {
          yappyConfig: {
            findFirst: jest.fn().mockResolvedValue({
              modo: 'comercial',
              merchantId: 'MERCH-123',
              secretKeyCifrada: encryptForTest('super-secreto'),
            }),
          },
        },
      };
      jest.spyOn(TenantContext, 'getDb').mockReturnValue(db as any);

      const result = await service.initiatePayment(TENANT_ID, 'order-1', 25);

      expect(result.modo).toBe('comercial');
      expect(result.orderId).toBe('order-1');
    });
  });

  describe('processIpn', () => {
    let db: { execute: jest.Mock; transaction: jest.Mock };
    let tx: {
      execute: jest.Mock;
      query: {
        yappyConfig: { findFirst: jest.Mock };
        transacciones: { findFirst: jest.Mock };
      };
      update: jest.Mock;
    };

    beforeEach(() => {
      tx = {
        execute: jest.fn().mockResolvedValue({ rows: [] }),
        query: {
          yappyConfig: { findFirst: jest.fn() },
          transacciones: { findFirst: jest.fn() },
        },
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      };
      db = {
        execute: jest.fn(),
        transaction: jest.fn().mockImplementation((cb) => cb(tx)),
      };
    });

    function mockOrderResolvesToTenant() {
      db.execute.mockResolvedValueOnce({ rows: [{ tenant_id: TENANT_ID }] });
    }

    it('lanza UnauthorizedException si la orden no existe', async () => {
      db.execute.mockResolvedValueOnce({ rows: [{ tenant_id: undefined }] });
      await expect(
        service.processIpn('order-x', 'E', 'hash', 'dominio.com', db as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el tenant no tiene Yappy Comercial configurado', async () => {
      mockOrderResolvesToTenant();
      tx.query.yappyConfig.findFirst.mockResolvedValue({ modo: 'manual' });

      await expect(
        service.processIpn('order-1', 'E', 'hash', 'dominio.com', db as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el hash HMAC no coincide', async () => {
      mockOrderResolvesToTenant();
      tx.query.yappyConfig.findFirst.mockResolvedValue({
        modo: 'comercial',
        secretKeyCifrada: encryptForTest('llave-correcta'),
      });

      await expect(
        service.processIpn(
          'order-1',
          'E',
          'hash-incorrecto',
          'dominio.com',
          db as any,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('marca la cita completada y emite factura DGI cuando el pago fue exitoso (status E) con hash válido', async () => {
      mockOrderResolvesToTenant();
      const secretKey = 'llave-correcta';
      tx.query.yappyConfig.findFirst.mockResolvedValue({
        modo: 'comercial',
        secretKeyCifrada: encryptForTest(secretKey),
      });
      tx.query.transacciones.findFirst.mockResolvedValue({
        id: 'tx-1',
        tenantId: TENANT_ID,
        citaId: 'cita-1',
        totalFacturado: '25.00',
        rucCliente: null,
        nombreFiscalCliente: null,
      });

      const validHash = crypto
        .createHmac('sha256', secretKey)
        .update('order-1EDominio.com')
        .digest('hex');

      const result = await service.processIpn(
        'order-1',
        'E',
        validHash,
        'Dominio.com',
        db as any,
      );

      expect(result).toEqual({ success: true });
      expect(tx.update).toHaveBeenCalledWith(citas);
      expect(tx.update).toHaveBeenCalledWith(transacciones);
      expect(dgiService.emitirFacturaAsync).toHaveBeenCalledWith(
        TENANT_ID,
        'tx-1',
        '25.00',
        null,
        null,
      );
    });

    it('cancela la cita cuando el pago fue cancelado (status C), sin emitir factura DGI', async () => {
      mockOrderResolvesToTenant();
      const secretKey = 'llave-correcta';
      tx.query.yappyConfig.findFirst.mockResolvedValue({
        modo: 'comercial',
        secretKeyCifrada: encryptForTest(secretKey),
      });
      tx.query.transacciones.findFirst.mockResolvedValue({
        id: 'tx-1',
        tenantId: TENANT_ID,
        citaId: 'cita-1',
        totalFacturado: '25.00',
      });

      const validHash = crypto
        .createHmac('sha256', secretKey)
        .update('order-1Cdominio.com')
        .digest('hex');

      await service.processIpn(
        'order-1',
        'C',
        validHash,
        'dominio.com',
        db as any,
      );

      expect(tx.update).toHaveBeenCalledWith(citas);
      expect(dgiService.emitirFacturaAsync).not.toHaveBeenCalled();
    });
  });
});
