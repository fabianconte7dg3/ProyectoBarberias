import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    loginAdmin: jest.Mock;
    loginStaff: jest.Mock;
    getStaffForLogin: jest.Mock;
    registerBarberia: jest.Mock;
  };

  function mockResponse() {
    return { cookie: jest.fn(), clearCookie: jest.fn() } as any;
  }

  beforeEach(async () => {
    authService = {
      loginAdmin: jest.fn(),
      loginStaff: jest.fn(),
      getStaffForLogin: jest.fn(),
      registerBarberia: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMe devuelve el usuario del request sin llamar al servicio', () => {
    const req = { user: { userId: 'u1', rol: 'admin' } } as any;
    expect(controller.getMe(req)).toBe(req.user);
  });

  it('loginAdmin setea la cookie jwt httpOnly y devuelve el accessToken', async () => {
    authService.loginAdmin.mockResolvedValue({
      accessToken: 'token-123',
      usuario: { id: 'u1', nombreCompleto: 'Admin', rol: 'admin' },
    });
    const res = mockResponse();

    const result = await controller.loginAdmin(
      { email: 'a@a.com', password: 'x' },
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'jwt',
      'token-123',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result).toEqual({
      message: 'Login exitoso',
      accessToken: 'token-123',
      usuario: { id: 'u1', nombreCompleto: 'Admin', rol: 'admin' },
    });
  });

  it('logout limpia la cookie jwt', () => {
    const res = mockResponse();
    const result = controller.logout(res);
    expect(res.clearCookie).toHaveBeenCalledWith(
      'jwt',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result).toEqual({ message: 'Logout exitoso' });
  });

  it('loginStaff setea la cookie jwt y no expone el accessToken en el body', async () => {
    authService.loginStaff.mockResolvedValue({
      accessToken: 'token-staff',
      usuario: { id: 'u2', nombreCompleto: 'Empleado', rol: 'empleado' },
    });
    const res = mockResponse();

    const result = await controller.loginStaff(
      { slug: 'qa', userId: 'u2', pin: '1234' },
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'jwt',
      'token-staff',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result).toEqual({
      message: 'Login exitoso',
      usuario: { id: 'u2', nombreCompleto: 'Empleado', rol: 'empleado' },
    });
  });
});
