import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { AuditService } from '../audit/audit.service';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import { TenantContext } from '../database/tenant/tenant-context';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-pin'),
}));
import * as bcrypt from 'bcrypt';

// Simula el patrón fluido de Drizzle `select().from().where().limit()`, donde tanto
// `.where(...)` como `.limit(...)` deben poder awaitearse directo (algunas queries del
// servicio no llaman `.limit()`).
function selectChainable(result: any) {
  const whereResult: any = Promise.resolve(result);
  whereResult.limit = jest.fn().mockReturnValue(Promise.resolve(result));
  return {
    from: jest
      .fn()
      .mockReturnValue({ where: jest.fn().mockReturnValue(whereResult) }),
  };
}

function updateChainable() {
  return jest.fn().mockReturnValue({
    set: jest
      .fn()
      .mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }),
  });
}

describe('UsuariosService', () => {
  let service: UsuariosService;
  let auditService: { logAction: jest.Mock };
  let injectedDb: any;
  let txDb: any;

  const TENANT_ID = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    auditService = { logAction: jest.fn().mockResolvedValue(undefined) };
    injectedDb = {
      select: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn(),
    };
    txDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      query: { usuarios: { findMany: jest.fn(), findFirst: jest.fn() } },
    };

    jest.spyOn(TenantContext, 'getDb').mockReturnValue(txDb);
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue(TENANT_ID);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: DRIZZLE_POOL_DB, useValue: injectedDb },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('inviteStaff', () => {
    it('rechaza cuando ya se alcanzó el límite de empleados del plan', async () => {
      txDb.select.mockReturnValueOnce(selectChainable([{ planId: 'basico' }]));
      injectedDb.select.mockReturnValueOnce(
        selectChainable([{ limiteEmpleados: 2 }]),
      );
      txDb.select.mockReturnValueOnce(selectChainable([{ count: 2 }]));

      await expect(
        service.inviteStaff(
          { nombreCompleto: 'X', rol: 'empleado' } as any,
          TENANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('crea la invitación cuando hay cupo disponible', async () => {
      txDb.select.mockReturnValueOnce(selectChainable([{ planId: 'basico' }]));
      injectedDb.select.mockReturnValueOnce(
        selectChainable([{ limiteEmpleados: 3 }]),
      );
      txDb.select.mockReturnValueOnce(selectChainable([{ count: 1 }]));
      txDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest
            .fn()
            .mockResolvedValue([{ id: 'user-1', token: 'activation-token' }]),
        }),
      });

      const result = await service.inviteStaff(
        { nombreCompleto: 'X', rol: 'empleado' } as any,
        TENANT_ID,
      );

      expect(result.activationToken).toBe('activation-token');
    });
  });

  describe('toggleKillSwitch', () => {
    it('no hace nada y no audita si ya está en el estado pedido', async () => {
      txDb.select.mockReturnValueOnce(
        selectChainable([{ killSwitchActivo: true }]),
      );

      const result = await service.toggleKillSwitch(TENANT_ID, 'admin-1', true);

      expect(result.message).toMatch(/ya se encuentra/);
      expect(auditService.logAction).not.toHaveBeenCalled();
    });

    it('actualiza el estado y registra auditoría cuando cambia', async () => {
      txDb.select.mockReturnValueOnce(
        selectChainable([{ killSwitchActivo: false }]),
      );
      txDb.update.mockReturnValue({
        set: jest
          .fn()
          .mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }),
      });

      const result = await service.toggleKillSwitch(
        TENANT_ID,
        'admin-1',
        true,
        '127.0.0.1',
        'jest',
      );

      expect(result.killSwitchActivo).toBe(true);
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'kill_switch',
          payloadDespues: { killSwitchActivo: true },
        }),
      );
    });

    it('lanza NotFoundException si el negocio no existe', async () => {
      txDb.select.mockReturnValueOnce(selectChainable([]));
      await expect(
        service.toggleKillSwitch(TENANT_ID, 'admin-1', true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateComision', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      txDb.select.mockReturnValueOnce(selectChainable([]));
      await expect(service.updateComision('user-x', 15)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('actualiza la comisión y registra auditoría', async () => {
      txDb.select.mockReturnValueOnce(
        selectChainable([
          { porcentajeComision: '10', porcentajeComisionProducto: '5' },
        ]),
      );
      txDb.update.mockReturnValue({
        set: jest
          .fn()
          .mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }),
      });

      const result = await service.updateComision(
        'user-x',
        20,
        8,
        'admin-1',
        '127.0.0.1',
        'jest',
      );

      expect(result).toEqual({
        success: true,
        porcentajeComision: 20,
        porcentajeComisionProducto: 8,
      });
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'cambio_comision' }),
      );
    });
  });

  describe('activateStaff', () => {
    it('lanza NotFoundException si el token no existe', async () => {
      injectedDb.execute.mockResolvedValue({ rows: [] });
      await expect(
        service.activateStaff({ token: 'bad-token', pin: '1234' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si el token expiró', async () => {
      injectedDb.execute.mockResolvedValue({
        rows: [
          {
            id: 'user-1',
            tenantId: TENANT_ID,
            tokenExpiraEn: new Date(Date.now() - 1000),
          },
        ],
      });
      await expect(
        service.activateStaff({ token: 'expired', pin: '1234' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('activa la cuenta con PIN hasheado cuando el token es válido', async () => {
      injectedDb.execute.mockResolvedValue({
        rows: [
          {
            id: 'user-1',
            tenantId: TENANT_ID,
            tokenExpiraEn: new Date(Date.now() + 1000 * 60),
          },
        ],
      });
      const tx = {
        execute: jest.fn().mockResolvedValue(undefined),
        update: updateChainable(),
      };
      injectedDb.transaction.mockImplementation((cb: any) => cb(tx));

      const result = await service.activateStaff({
        token: 'valid',
        pin: '1234',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('1234', 10);
      expect(tx.update).toHaveBeenCalled();
      expect(result.message).toMatch(/activada exitosamente/);
    });
  });
});
