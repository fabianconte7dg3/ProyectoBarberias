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
 * Limpia SOLO el token de SuperAdmin del localStorage.
 * Se llama al hacer login exitoso como Staff/Admin de una barbería (tenant)
 * para evitar que un `super_jwt` previo contamine el contexto del tenant.
 */
function clearSuperAdminToken() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('super_jwt');
  } catch {
    // Ignorar si localStorage no está disponible
  }
}

// Endpoints de login de tenant (Staff/Admin de Barbería). Al autenticarse por
// aquí, se limpia cualquier super_jwt previo para evitar colisión de contexto.
const TENANT_LOGIN_ENDPOINTS = ['/auth/login/staff', '/auth/login/admin'];

// Prefijo de endpoints exclusivos de SuperAdmin. Solo estas rutas pueden
// leer/enviar el Authorization: Bearer con super_jwt.
const SUPER_ADMIN_PREFIX = '/super-admin';

/**
 * Wrapper de `fetch` preconfigurado para hacer peticiones autenticadas al backend.
 * - Soporta cookies httpOnly (credentials: 'include') — es la ÚNICA fuente de
 *   autenticación para rutas de tenant ([tenantSlug]/...).
 * - El Authorization: Bearer con `super_jwt` SOLO se envía cuando el endpoint
 *   empieza explícitamente con `/super-admin`. Nunca se usa como fallback para
 *   rutas de tenant.
 * - Interceptor global de 401: limpia la sesión local automáticamente.
 * - Al hacer login exitoso como Staff/Admin de una barbería, limpia cualquier
 *   super_jwt residual para evitar colisión de contexto entre SuperAdmin y Tenant.
 */
export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_URL}${normalizedEndpoint}`;
  const isSuperAdminEndpoint = normalizedEndpoint.startsWith(SUPER_ADMIN_PREFIX);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Authorization Bearer SOLO para endpoints explícitos de /super-admin.
  // Las rutas de tenant dependen 100% de la cookie httpOnly `jwt` enviada
  // automáticamente por `credentials: 'include'`; no hay fallback a
  // localStorage aquí para evitar que un super_jwt (u otro token viejo)
  // se cuele en peticiones de barbería.
  if (typeof window !== 'undefined' && isSuperAdminEndpoint) {
    const token = localStorage.getItem('super_jwt');
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

  // Login exitoso de Staff/Admin de Barbería: limpiar cualquier super_jwt
  // previo para que un contexto de SuperAdmin no contamine el del tenant.
  if (TENANT_LOGIN_ENDPOINTS.some((loginEndpoint) => normalizedEndpoint.startsWith(loginEndpoint))) {
    clearSuperAdminToken();
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
