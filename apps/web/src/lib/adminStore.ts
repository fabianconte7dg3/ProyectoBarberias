import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AdminUser {
  id: string;
  nombreCompleto: string;
  rol: 'admin' | 'empleado' | 'recepcion';
  // El token JWT NO se guarda aquí, vive en la cookie httpOnly
}

/**
 * Estado de impersonación de Super Admin ("Login as Tenant", Fase 6.3).
 * Es solo una caché visual, igual que `user` — la fuente de verdad real es
 * el claim `imp`/`impByEmail` del JWT httpOnly, re-verificado en cada mount
 * por `useAdminAuth` vía GET /auth/me.
 */
export interface ImpersonationInfo {
  active: boolean;
  superAdminEmail: string;
}

interface AdminState {
  user: AdminUser | null;
  tenantSlug: string | null;
  impersonation: ImpersonationInfo | null;
  login: (user: AdminUser, tenantSlug: string, impersonation?: ImpersonationInfo | null) => void;
  logout: () => void;
  setImpersonation: (info: ImpersonationInfo | null) => void;
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
      impersonation: null,
      login: (user, tenantSlug, impersonation = null) => set({ user, tenantSlug, impersonation }),
      logout: () => set({ user: null, impersonation: null }),
      setImpersonation: (impersonation) => set({ impersonation }),
    }),
    {
      name: 'admin-storage',
      // localStorage es seguro para estos datos no sensibles.
      // Si un XSS lo lee, solo sabe el nombre del empleado, pero no puede suplantarlo
      // porque no tiene la cookie httpOnly.
      storage: createJSONStorage(() => localStorage),
    }
  )
);
