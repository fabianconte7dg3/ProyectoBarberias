import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed'),
}));
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let db: { execute: jest.Mock; transaction: jest.Mock };
  let tx: { execute: jest.Mock; query: { usuarios: { findMany: jest.Mock } } };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    tx = {
      execute: jest.fn().mockResolvedValue({ rows: [] }),
      query: { usuarios: { findMany: jest.fn() } },
    };
    db = {
      execute: jest.fn(),
      transaction: jest.fn().mockImplementation((cb) => cb(tx)),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DRIZZLE_POOL_DB, useValue: db },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    (bcrypt.compare as jest.Mock).mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loginAdmin', () => {
    const dto = { email: 'admin@test.local', password: 'secret' };

    function mockAdminRow(overrides: Partial<Record<string, any>> = {}) {
      db.execute.mockResolvedValueOnce({
        rows: [
          {
            id: 'admin-1',
            tenant_id: '11111111-1111-4111-8111-111111111111',
            password: 'hashed-password',
            activo: true,
            rol: 'admin',
            nombre_completo: 'Dueño',
            ...overrides,
          },
        ],
      });
    }

    function mockTenantRow(overrides: Partial<Record<string, any>> = {}) {
      // runInTenantScope: 2 llamadas de setup (SET LOCAL ROLE, set_config) + 1 de la query real
      tx.execute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            { estado: 'activo', bloqueado_por_plataforma: false, ...overrides },
          ],
        });
    }

    it('rechaza si no existe el admin', async () => {
      db.execute.mockResolvedValueOnce({ rows: [] });
      await expect(service.loginAdmin(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza si el usuario encontrado no tiene rol admin', async () => {
      mockAdminRow({ rol: 'empleado' });
      await expect(service.loginAdmin(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza si la cuenta no está activa', async () => {
      mockAdminRow({ activo: false });
      await expect(service.loginAdmin(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza si la contraseña no coincide', async () => {
      mockAdminRow();
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      await expect(service.loginAdmin(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza si el tenant está bloqueado por la plataforma', async () => {
      mockAdminRow();
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      mockTenantRow({ bloqueado_por_plataforma: true });
      await expect(service.loginAdmin(dto as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza si el tenant está suspendido por pago', async () => {
      mockAdminRow();
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      mockTenantRow({ estado: 'suspendido_pago' });
      await expect(service.loginAdmin(dto as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('devuelve accessToken y usuario cuando todo es válido', async () => {
      mockAdminRow();
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      mockTenantRow();

      const result = await service.loginAdmin(dto);

      expect(result.accessToken).toBe('signed-jwt');
      expect(result.usuario).toEqual({
        id: 'admin-1',
        nombreCompleto: 'Dueño',
        rol: 'admin',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'admin-1',
        tenantId: '11111111-1111-4111-8111-111111111111',
        rol: 'admin',
      });
    });
  });

  describe('loginStaff', () => {
    const dto = { slug: 'qa-test', userId: 'staff-1', pin: '0000' };

    function mockTenantAndStaff(
      staffOverrides: Partial<Record<string, any>> = {},
    ) {
      db.execute.mockResolvedValueOnce({
        rows: [
          { id: '11111111-1111-4111-8111-111111111111', estado: 'activo' },
        ],
      });
      tx.execute.mockResolvedValue({ rows: [] });
      tx.query.usuarios.findMany.mockResolvedValueOnce([
        {
          id: 'staff-1',
          tenantId: '11111111-1111-4111-8111-111111111111',
          rol: 'empleado',
          pinAcceso: 'hashed-pin',
          activo: true,
          nombreCompleto: 'Empleado QA',
          ...staffOverrides,
        },
      ]);
    }

    it('rechaza y bloquea progresivamente tras 5 intentos fallidos, sin tocar la DB en el 6to', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      for (let i = 0; i < 5; i++) {
        mockTenantAndStaff();
        await expect(service.loginStaff(dto as any)).rejects.toThrow(
          UnauthorizedException,
        );
      }

      db.execute.mockClear();
      await expect(service.loginStaff(dto as any)).rejects.toThrow(
        ForbiddenException,
      );
      expect(db.execute).not.toHaveBeenCalled();
    });

    it('limpia los intentos fallidos tras un login exitoso', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      mockTenantAndStaff();
      await expect(service.loginStaff(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );

      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      mockTenantAndStaff();
      const result = await service.loginStaff(dto);

      expect(result.accessToken).toBe('signed-jwt');
      expect(result.usuario).toEqual({
        id: 'staff-1',
        nombreCompleto: 'Empleado QA',
        rol: 'empleado',
      });
    });

    it('rechaza si la cuenta de staff está suspendida', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      mockTenantAndStaff({ activo: false });
      await expect(service.loginStaff(dto as any)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
