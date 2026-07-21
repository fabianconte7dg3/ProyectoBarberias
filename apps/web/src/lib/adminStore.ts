import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AdminUser {
  id: string;
  nombreCompleto: string;
  rol: 'admin' | 'barbero' | 'recepcion';
  // El token JWT NO se guarda aquí, vive en la cookie httpOnly
}

interface AdminState {
  user: AdminUser | null;
  tenantSlug: string | null;
  login: (user: AdminUser, tenantSlug: string) => void;
  logout: () => void;
}

/**
 * Store exclusivo para la "Intranet" operativa.
 * Mantiene la sesión visual (quién está logueado) persistida
 * en caso de que recarguen la página por error.
 */
export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      user: null,
      tenantSlug: null,
      login: (user, tenantSlug) => set({ user, tenantSlug }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'admin-storage',
      // localStorage es seguro para estos datos no sensibles.
      // Si un XSS lo lee, solo sabe el nombre del barbero, pero no puede suplantarlo
      // porque no tiene la cookie httpOnly.
      storage: createJSONStorage(() => localStorage),
    }
  )
);
