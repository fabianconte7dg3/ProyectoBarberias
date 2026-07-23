/**
 * useAdminAuth — Guard de autenticación para páginas del panel de administración.
 *
 * Por qué existe este hook:
 * --------------------------
 * Zustand persist usa localStorage, que dispara eventos `storage` en TODAS las
 * pestañas del mismo origen cuando cualquier otra pestaña escribe en él.
 * Esto significa que si el cliente abre el link de reservas en otra pestaña
 * (o cualquier otra página que use booking-storage/sessionStorage), Zustand
 * detecta el cambio, re-hidrata el store y fuerza una re-evaluación de todos los
 * useEffect cuya dep array incluya `currentUser`.
 *
 * Si ese useEffect llama a fetchApi('/auth/me') y la cookie no responde por
 * cualquier motivo, ejecuta logout() → borra admin-storage → el admin ve que
 * se cierra su sesión aunque sí estaba autenticado.
 *
 * Solución:
 * ---------
 * - La verificación de sesión se ejecuta UNA SOLA VEZ al montar el componente
 *   (gracias al `useRef` como guard).
 * - El logout automático SÓLO ocurre cuando el servidor devuelve 401 o
 *   Unauthorized explícitamente, nunca por errores de red o CORS.
 *
 * Uso:
 * ----
 * ```ts
 * useAdminAuth({ tenantSlug });                         // solo guard
 * useAdminAuth({ tenantSlug, requiredRole: 'admin' });  // solo para admins
 * ```
 * Para cargar datos al montar, usa un useEffect con dep array vacío en tu página:
 * ```ts
 * useEffect(() => { loadData(); }, []); // eslint-disable-next-line react-hooks/exhaustive-deps
 * ```
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';

interface UseAdminAuthOptions {
  /** El slug del tenant (para la redirección al login correcto). */
  tenantSlug: string;
  /** Rol requerido para acceder a la página. Si no coincide, redirige a /agenda. */
  requiredRole?: 'admin' | 'barbero' | 'recepcion';
}

/**
 * Devuelve el usuario activo del admin store.
 * Redirige a login si no hay sesión, y valida la cookie httpOnly contra el backend
 * una sola vez al montar el componente.
 */
export function useAdminAuth({
  tenantSlug,
  requiredRole,
}: UseAdminAuthOptions) {
  const router = useRouter();
  const currentUser = useAdminStore((state) => state.user);
  const logout = useAdminStore((state) => state.logout);

  // Guard para ejecutar el efecto solo una vez (evita re-disparos por storage events)
  const sessionChecked = useRef(false);

  useEffect(() => {
    // Evitar doble ejecución por re-renders / storage events de otras pestañas
    if (sessionChecked.current) return;
    sessionChecked.current = true;

    // Sin sesión local → ir al login
    if (!currentUser) {
      router.push(`/${tenantSlug}/admin/login`);
      return;
    }

    // Verificar rol requerido (sin llamada al servidor)
    if (requiredRole === 'admin' && currentUser.rol !== 'admin') {
      router.push(`/${tenantSlug}/admin/agenda`);
      return;
    }

    // Validar que la cookie sigue siendo válida en el servidor.
    // Solo cerramos sesión en 401 explícito; ignoramos errores de red/CORS/500
    // para no desconectar al barbero por problemas temporales o actividad en
    // otras pestañas del navegador.
    fetchApi('/auth/me')
      .catch((err: Error) => {
        const msg = err?.message?.toLowerCase() || '';
        const is401 =
          msg.includes('401') ||
          msg.includes('unauthorized') ||
          msg.includes('no autorizado') ||
          msg.includes('token') ||
          msg.includes('sesion') ||
          msg.includes('sesión');

        if (is401) {
          logout();
          router.push(`/${tenantSlug}/admin/login`);
        }
        // Para errores de red/CORS/500: no cerrar sesión, el usuario puede
        // continuar trabajando y el error se resolverá solo.
      });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]); // Intencionalmente sin currentUser para evitar re-disparos

  return { currentUser };
}
