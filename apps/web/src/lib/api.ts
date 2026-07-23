export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Limpia localmente la sesión del staff (adminStore + localStorage).
 * Se llama automáticamente cuando el servidor devuelve 401.
 * No hace petición al servidor porque el token ya es inválido.
 */
function clearLocalSession() {
  if (typeof window === 'undefined') return;
  try {
    // Limpiar adminStore de Zustand (persist key = 'admin-storage')
    const stored = localStorage.getItem('admin-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.state = { user: null, tenantSlug: null };
      localStorage.setItem('admin-storage', JSON.stringify(parsed));
    }
    // Limpiar tokens del SuperAdmin si los hubiera
    localStorage.removeItem('super_jwt');
    localStorage.removeItem('jwt');
  } catch {
    // Ignorar si localStorage no está disponible
  }
}

/**
 * Wrapper de `fetch` preconfigurado para hacer peticiones autenticadas al backend.
 * - Soporta cookies httpOnly (credentials: 'include').
 * - Soporta Authorization Bearer token de localStorage.
 * - Interceptor global de 401: limpia la sesión local automáticamente.
 */
export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('super_jwt') || localStorage.getItem('jwt');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    // Interceptor global 401: si el servidor rechaza la sesión, limpiar localmente
    // para que Zustand deje de mostrar al usuario como "logueado"
    if (response.status === 401) {
      clearLocalSession();
    }

    let errorMessage = 'Error en la petición';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Ignorar si no es JSON
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

/**
 * Fetch SIN credenciales ni token de sesión, para endpoints públicos
 * (ej. /reservar, /activar). Evita que páginas públicas interfieran con
 * sesiones activas de staff/admin en el mismo navegador.
 */
export async function fetchPublic<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    credentials: 'omit', // NO enviar cookies ni tokens
  });

  if (!response.ok) {
    let errorMessage = 'Error en la petición';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Ignorar si no es JSON
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
