import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CitasController } from './citas.controller';
import { CitasService } from './citas.service';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';

describe('CitasController', () => {
  let controller: CitasController;
  let citasService: {
    crearCita: jest.Mock;
    obtenerCitasAgenda: jest.Mock;
    crearCitasGrupales: jest.Mock;
  };
  let db: { execute: jest.Mock; transaction: jest.Mock };
  let tx: { execute: jest.Mock };

  const TENANT_ID = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    citasService = {
      crearCita: jest.fn(),
      obtenerCitasAgenda: jest.fn(),
      crearCitasGrupales: jest.fn(),
    };
    tx = { execute: jest.fn().mockResolvedValue({ rows: [] }) };
    db = {
      execute: jest.fn(),
      transaction: jest.fn().mockImplementation((cb) => cb(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CitasController],
      providers: [
        { provide: CitasService, useValue: citasService },
        { provide: DRIZZLE_POOL_DB, useValue: db },
      ],
    }).compile();

    controller = module.get<CitasController>(CitasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('crearCitaPublica rechaza con 404 si el slug no resuelve a ningún tenant', async () => {
    db.execute.mockResolvedValueOnce({ rows: [] });
    const res = { status: jest.fn() } as any;

    await expect(
      controller.crearCitaPublica({} as any, 'key-1', 'slug-inexistente', res),
    ).rejects.toThrow(NotFoundException);
  });

  it('crearCitaPublica resuelve el tenant por slug y delega en CitasService dentro del scope del tenant', async () => {
    db.execute.mockResolvedValueOnce({ rows: [{ id: TENANT_ID }] });
    citasService.crearCita.mockResolvedValue({
      isExisting: false,
      cita: { id: 'cita-1' },
    });
    const res = { status: jest.fn() } as any;

    const result = await controller.crearCitaPublica(
      {} as any,
      'key-1',
      'qa-test',
      res,
    );

    expect(citasService.crearCita).toHaveBeenCalledWith({}, 'key-1', true);
    expect(result).toEqual({ id: 'cita-1' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('getCitas pasa el usuario autenticado y los filtros al servicio', async () => {
    citasService.obtenerCitasAgenda.mockResolvedValue([]);
    const req = { user: { userId: 'u1', rol: 'empleado' } } as any;

    await controller.getCitas(req, '2026-07-26', 'empleado-1');

    expect(citasService.obtenerCitasAgenda).toHaveBeenCalledWith({
      user: req.user,
      fechaStr: '2026-07-26',
      empleadoId: 'empleado-1',
    });
  });
});
