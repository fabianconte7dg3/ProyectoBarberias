import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface BookingState {
  servicioId?: string;
  comboId?: string;
  empleadoId?: string | null;
  duracionMinutos?: number;
  fecha?: string; // YYYY-MM-DD
  hora?: string; // HH:mm
  setServicioYEmpleado: (servicioId: string, empleadoId: string | null, duracionMinutos: number) => void;
  setComboYEmpleado: (comboId: string, empleadoId: string | null, duracionMinutos: number) => void;
  setFechaYHora: (fecha: string, hora: string) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      servicioId: undefined,
      comboId: undefined,
      empleadoId: undefined,
      duracionMinutos: undefined,
      fecha: undefined,
      hora: undefined,

      setServicioYEmpleado: (servicioId, empleadoId, duracionMinutos) => set({ servicioId, comboId: undefined, empleadoId, duracionMinutos }),
      setComboYEmpleado: (comboId, empleadoId, duracionMinutos) => set({ comboId, servicioId: undefined, empleadoId, duracionMinutos }),
      setFechaYHora: (fecha, hora) => set({ fecha, hora }),
      reset: () => set({ servicioId: undefined, comboId: undefined, empleadoId: undefined, duracionMinutos: undefined, fecha: undefined, hora: undefined })
    }),
    {
      name: 'booking-storage',
      // sessionStorage ensures it only survives reloads or navigation in the same tab,
      // not reopening the browser next week.
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
