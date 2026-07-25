import { describe, it, expect, afterEach, vi } from 'vitest';
import { calcularSlotsDisponibles, type DisponibilidadDia } from './disponibilidad';

// Fecha fija lejos en el futuro: nunca coincide con "hoy" al correr los tests (evita el filtro de
// isPast) excepto en el test que explícitamente lo prueba con el reloj mockeado.
const FECHA_FUTURA = '2099-06-15';

describe('calcularSlotsDisponibles', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('genera slots cada 30 min que caben en la jornada, sin almuerzo ni ocupados', () => {
    const disp: DisponibilidadDia = {
      disponible: true,
      jornada: { inicio: '09:00:00', fin: '12:00:00' },
      ocupados: [],
      almuerzo: null,
    };
    expect(calcularSlotsDisponibles(FECHA_FUTURA, 30, disp)).toEqual([
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    ]);
  });

  it('excluye únicamente los slots que se solapan con el almuerzo (bordes exactos sí se incluyen)', () => {
    const disp: DisponibilidadDia = {
      disponible: true,
      jornada: { inicio: '09:00:00', fin: '15:00:00' },
      ocupados: [],
      almuerzo: { inicioMinutos: 12 * 60, finMinutos: 13 * 60 }, // 12:00-13:00
    };
    // Servicio de 60 min: 11:00-12:00 termina justo cuando empieza el almuerzo (no se solapa),
    // 13:00-14:00 empieza justo cuando termina (tampoco se solapa) -> ambos deben quedar.
    expect(calcularSlotsDisponibles(FECHA_FUTURA, 60, disp)).toEqual([
      '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00',
    ]);
  });

  it('excluye los slots que se solapan con una cita u otro bloqueo existente', () => {
    const disp: DisponibilidadDia = {
      disponible: true,
      jornada: { inicio: '09:00:00', fin: '11:00:00' },
      ocupados: [
        { tipo: 'cita', id: 'c1', inicio: `${FECHA_FUTURA}T09:30:00`, fin: `${FECHA_FUTURA}T10:00:00` },
      ],
      almuerzo: null,
    };
    expect(calcularSlotsDisponibles(FECHA_FUTURA, 30, disp)).toEqual(['09:00', '10:00', '10:30']);
  });

  it('si el servicio no cabe en la jornada, no devuelve ningún slot', () => {
    const disp: DisponibilidadDia = {
      disponible: true,
      jornada: { inicio: '09:00:00', fin: '10:00:00' },
      ocupados: [],
      almuerzo: null,
    };
    expect(calcularSlotsDisponibles(FECHA_FUTURA, 90, disp)).toEqual([]);
  });

  it('si el día no está disponible o no tiene jornada, devuelve vacío de inmediato', () => {
    const sinJornada: DisponibilidadDia = { disponible: true, jornada: null, ocupados: [], almuerzo: null };
    const noDisponible: DisponibilidadDia = {
      disponible: false,
      jornada: { inicio: '09:00:00', fin: '17:00:00' },
      ocupados: [],
      almuerzo: null,
    };
    expect(calcularSlotsDisponibles(FECHA_FUTURA, 30, sinJornada)).toEqual([]);
    expect(calcularSlotsDisponibles(FECHA_FUTURA, 30, noDisponible)).toEqual([]);
  });

  it('si la fecha elegida es hoy, excluye los horarios que ya pasaron', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2099, 5, 15, 10, 15, 0)); // 15 jun 2099, 10:15 (mismo mes que FECHA_FUTURA)

    const disp: DisponibilidadDia = {
      disponible: true,
      jornada: { inicio: '09:00:00', fin: '12:00:00' },
      ocupados: [],
      almuerzo: null,
    };
    expect(calcularSlotsDisponibles(FECHA_FUTURA, 30, disp)).toEqual(['10:30', '11:00', '11:30']);
  });
});
