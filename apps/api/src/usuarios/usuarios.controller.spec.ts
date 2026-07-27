import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

describe('UsuariosController', () => {
  let controller: UsuariosController;
  let usuariosService: {
    inviteStaff: jest.Mock;
    toggleKillSwitch: jest.Mock;
    activateStaff: jest.Mock;
    updateComision: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    usuariosService = {
      inviteStaff: jest.fn(),
      toggleKillSwitch: jest.fn(),
      activateStaff: jest.fn(),
      updateComision: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [{ provide: UsuariosService, useValue: usuariosService }],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('inviteStaff usa el tenantId del JWT, no uno del body', async () => {
    usuariosService.inviteStaff.mockResolvedValue({
      activationToken: 'token-1',
    });
    const req = { user: { tenantId: 'tenant-1' } } as any;

    await controller.inviteStaff(
      { nombreCompleto: 'X', rol: 'empleado' } as any,
      req,
    );

    expect(usuariosService.inviteStaff).toHaveBeenCalledWith(
      { nombreCompleto: 'X', rol: 'empleado' },
      'tenant-1',
    );
  });

  it('toggleKillSwitch pasa tenantId, userId, ip y user-agent al servicio', async () => {
    usuariosService.toggleKillSwitch.mockResolvedValue({
      killSwitchActivo: true,
    });
    const req = { user: { tenantId: 'tenant-1', userId: 'admin-1' } } as any;

    await controller.toggleKillSwitch(req, true, '127.0.0.1', 'jest-agent');

    expect(usuariosService.toggleKillSwitch).toHaveBeenCalledWith(
      'tenant-1',
      'admin-1',
      true,
      '127.0.0.1',
      'jest-agent',
    );
  });
});
