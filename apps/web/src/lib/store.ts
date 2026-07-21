import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface BookingState {
  servicioId?: string;
  barberoId?: string | null;
  fecha?: string; // YYYY-MM-DD
  hora?: string; // HH:mm
  setServicioYBarbero: (servicioId: string, barberoId: string | null) => void;
  setFechaYHora: (fecha: string, hora: string) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      servicioId: undefined,
      barberoId: undefined,
      fecha: undefined,
      hora: undefined,
      
      setServicioYBarbero: (servicioId, barberoId) => set({ servicioId, barberoId }),
      setFechaYHora: (fecha, hora) => set({ fecha, hora }),
      reset: () => set({ servicioId: undefined, barberoId: undefined, fecha: undefined, hora: undefined })
    }),
    {
      name: 'booking-storage',
      // sessionStorage ensures it only survives reloads or navigation in the same tab,
      // not reopening the browser next week.
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
