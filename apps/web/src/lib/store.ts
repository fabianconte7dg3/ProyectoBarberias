import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface BookingState {
  servicioId?: string;
  comboId?: string;
  empleadoId?: string | null;
  // Nombre/precio del servicio o combo elegido y nombre del empleado (si se
  // eligió uno específico, no "Cualquiera") — persistidos junto al id para que
  // el resumen de confirmación pueda mostrar datos reales en vez de un
  // placeholder genérico (bug encontrado en la Fase 6.6: antes se mostraba
  // literalmente "{terminologiaServicio} Seleccionado" y un precio fijo "15.00").
  itemNombre?: string;
  itemPrecio?: string;
  empleadoNombre?: string | null;
  duracionMinutos?: number;
  fecha?: string; // YYYY-MM-DD
  hora?: string; // HH:mm
  setServicioYEmpleado: (servicioId: string, empleadoId: string | null, duracionMinutos: number, itemNombre: string, itemPrecio: string, empleadoNombre: string | null) => void;
  setComboYEmpleado: (comboId: string, empleadoId: string | null, duracionMinutos: number, itemNombre: string, itemPrecio: string, empleadoNombre: string | null) => void;
  setFechaYHora: (fecha: string, hora: string) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      servicioId: undefined,
      comboId: undefined,
      empleadoId: undefined,
      itemNombre: undefined,
      itemPrecio: undefined,
      empleadoNombre: undefined,
      duracionMinutos: undefined,
      fecha: undefined,
      hora: undefined,

      setServicioYEmpleado: (servicioId, empleadoId, duracionMinutos, itemNombre, itemPrecio, empleadoNombre) =>
        set({ servicioId, comboId: undefined, empleadoId, duracionMinutos, itemNombre, itemPrecio, empleadoNombre }),
      setComboYEmpleado: (comboId, empleadoId, duracionMinutos, itemNombre, itemPrecio, empleadoNombre) =>
        set({ comboId, servicioId: undefined, empleadoId, duracionMinutos, itemNombre, itemPrecio, empleadoNombre }),
      setFechaYHora: (fecha, hora) => set({ fecha, hora }),
      reset: () => set({ servicioId: undefined, comboId: undefined, empleadoId: undefined, itemNombre: undefined, itemPrecio: undefined, empleadoNombre: undefined, duracionMinutos: undefined, fecha: undefined, hora: undefined })
    }),
    {
      name: 'booking-storage',
      // sessionStorage ensures it only survives reloads or navigation in the same tab,
      // not reopening the browser next week.
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
