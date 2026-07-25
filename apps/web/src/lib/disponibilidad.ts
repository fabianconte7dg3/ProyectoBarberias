import { parse, isPast } from 'date-fns';

export interface Ocupado {
  tipo: 'cita' | 'bloqueo';
  id: string;
  inicio: string;
  fin: string;
}

export interface Jornada {
  inicio: string; // "HH:mm:ss"
  fin: string;
}

export interface AlmuerzoCalculado {
  inicioMinutos: number;
  finMinutos: number;
}

export interface DisponibilidadDia {
  disponible: boolean;
  jornada: Jornada | null;
  ocupados: Ocupado[];
  almuerzo: AlmuerzoCalculado | null;
}

const INTERVALO_SLOT_MINUTOS = 30;

function minutosDesdeMedianoche(horaStr: string): number {
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
}

function minutosDeFechaLocal(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function seSolapan(inicioA: number, finA: number, inicioB: number, finB: number): boolean {
  return inicioA < finB && finA > inicioB;
}

/**
 * Traduce la disponibilidad cruda de GET /horarios/disponibilidad en una lista
 * de horarios "HH:mm" seleccionables, dado cuánto dura el servicio/combo
 * elegido. Compartida entre el caso de un empleado específico y el caso
 * "Cualquiera" (unión de varios empleados — ver fecha/page.tsx).
 */
export function calcularSlotsDisponibles(selectedDate: string, duracionMinutos: number, disp: DisponibilidadDia): string[] {
  if (!disp.disponible || !disp.jornada) return [];

  const today = new Date();
  const dateObj = parse(selectedDate, 'yyyy-MM-dd', today);
  const isTodaySelection = dateObj.toDateString() === today.toDateString();

  const inicioJornada = minutosDesdeMedianoche(disp.jornada.inicio);
  const finJornada = minutosDesdeMedianoche(disp.jornada.fin);

  const slots: string[] = [];
  for (let inicio = inicioJornada; inicio + duracionMinutos <= finJornada; inicio += INTERVALO_SLOT_MINUTOS) {
    const fin = inicio + duracionMinutos;
    const hhmm = `${String(Math.floor(inicio / 60)).padStart(2, '0')}:${String(inicio % 60).padStart(2, '0')}`;

    if (isTodaySelection) {
      const slotDate = parse(`${selectedDate} ${hhmm}`, 'yyyy-MM-dd HH:mm', new Date());
      if (isPast(slotDate)) continue;
    }

    if (disp.almuerzo && seSolapan(inicio, fin, disp.almuerzo.inicioMinutos, disp.almuerzo.finMinutos)) continue;

    const ocupado = disp.ocupados.some((o) => seSolapan(inicio, fin, minutosDeFechaLocal(o.inicio), minutosDeFechaLocal(o.fin)));
    if (ocupado) continue;

    slots.push(hhmm);
  }

  return slots;
}
