import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface BookingState {
  servicioId?: string;
  comboId?: string;
  empleadoId?: string | null;
  fecha?: string; // YYYY-MM-DD
  hora?: string; // HH:mm
  setServicioYEmpleado: (servicioId: string, empleadoId: string | null) => void;
  setComboYEmpleado: (comboId: string, empleadoId: string | null) => void;
  setFechaYHora: (fecha: string, hora: string) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      servicioId: undefined,
      comboId: undefined,
      empleadoId: undefined,
      fecha: undefined,
      hora: undefined,

      setServicioYEmpleado: (servicioId, empleadoId) => set({ servicioId, comboId: undefined, empleadoId }),
      setComboYEmpleado: (comboId, empleadoId) => set({ comboId, servicioId: undefined, empleadoId }),
      setFechaYHora: (fecha, hora) => set({ fecha, hora }),
      reset: () => set({ servicioId: undefined, comboId: undefined, empleadoId: undefined, fecha: undefined, hora: undefined })
    }),
    {
      name: 'booking-storage',
      // sessionStorage ensures it only survives reloads or navigation in the same tab,
      // not reopening the browser next week.
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
