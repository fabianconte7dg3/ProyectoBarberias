# Patrón de Autenticación para Páginas del Panel Admin

> **Regla de oro:** Toda página nueva bajo `apps/web/src/app/[tenantSlug]/admin/`
> **DEBE** usar el hook `useAdminAuth`. Nunca copies el patrón antiguo de
> `useEffect([currentUser, ...])`.

---

## El Bug que Este Patrón Previene

### Qué pasaba antes

Cuando el barbero tenía la agenda abierta en el navegador y el **cliente**
abría el link de reserva (ej. `mi-barberia/reservar`) en una nueva pestaña, la
sesión del admin se **cerraba automáticamente**.

### Por qué ocurría

```
1. Cliente abre /reservar en nueva pestaña
2. useBookingStore (Zustand) escribe en sessionStorage / localStorage
3. localStorage dispara evento `storage` en TODAS las pestañas del mismo origen
4. Zustand (admin-storage) recibe el evento y re-hidrata el store
5. `currentUser` "cambia" (mismo valor, pero nueva referencia)
6. useEffect([currentUser, tenantSlug, router, logout]) se re-ejecuta
7. fetchApi('/auth/me') falla por contexto de cookie diferente
8. logout() se ejecuta → borra admin-storage
9. ¡El barbero ve su sesión cerrada sin haberla cerrado!
```

### La solución: `useAdminAuth`

El hook en [`apps/web/src/hooks/useAdminAuth.ts`](../../apps/web/src/hooks/useAdminAuth.ts) usa un `useRef` como **guard de ejecución**:
- La verificación de sesión corre **una sola vez** al montar el componente.
- No se re-dispara aunque `currentUser` cambie por storage events.
- El logout automático solo ocurre con **401 explícito del servidor**.

---

## Cómo Crear una Nueva Página del Admin

### Plantilla Base

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminMiNuevaPaginaPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  // Obtener usuario del store (solo para mostrar datos en la UI)
  const currentUser = useAdminStore((state) => state.user);

  // Estado de datos de negocio
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ CORRECTO: Guard de autenticación — una sola ejecución al montar
  useAdminAuth({ tenantSlug });
  // Si la página es solo para admins:
  // useAdminAuth({ tenantSlug, requiredRole: 'admin' });

  // ✅ CORRECTO: Carga de datos en useEffect separado con dep array vacío
  useEffect(() => {
    loadDatos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDatos = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<typeof datos>('/mi-endpoint');
      setDatos(res);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Contenido de la página */}
    </div>
  );
}
```

---

## Referencia Rápida: Opciones del Hook

```ts
import { useAdminAuth } from '@/hooks/useAdminAuth';

// Cualquier usuario autenticado (barbero, admin, recepcion)
useAdminAuth({ tenantSlug });

// Solo admins → redirige a /agenda si el rol no es 'admin'
useAdminAuth({ tenantSlug, requiredRole: 'admin' });

// El hook devuelve el usuario actual (opcional)
const { currentUser } = useAdminAuth({ tenantSlug });
```

---

## Lo que NO Debes Hacer

### ❌ Patrón INCORRECTO (el que causaba el bug)

```tsx
// ❌ NUNCA hagas esto en una página del admin
useEffect(() => {
  if (!currentUser) {
    router.push(`/${tenantSlug}/admin/login`);
    return;
  }
  fetchApi('/auth/me').catch(() => {
    logout();
    router.push(`/${tenantSlug}/admin/login`);
  });
}, [currentUser, tenantSlug, router, logout]); // <-- currentUser en deps = BUG
```

**Por qué es incorrecto:**
- `currentUser` en el dep array hace que el efecto se re-ejecute cada vez que
  Zustand re-hidrata el store (causado por storage events de otras pestañas).
- El `catch` sin discriminar el tipo de error ejecuta `logout()` ante cualquier
  fallo de red, CORS o timeout — no solo ante 401 del servidor.

### ❌ Patrón INCORRECTO (llamada directa a /auth/me)

```tsx
// ❌ No hagas esto — reinventa el guard que ya tiene useAdminAuth
useEffect(() => {
  async function initAuth() {
    const me = await fetchApi('/auth/me');  // Si falla → logout()
    loginStore(me);
    loadDatos();
  }
  initAuth();
}, [tenantSlug, loginStore, logoutStore]); // loginStore/logoutStore en deps = BUG
```

---

## Páginas Que Ya Usan el Patrón Correcto

Todas las páginas listadas abajo ya migraron al hook `useAdminAuth`:

| Página | Rol requerido |
|--------|--------------|
| `[tenantSlug]/admin/agenda/page.tsx` | Cualquiera |
| `[tenantSlug]/admin/clientes/page.tsx` | Cualquiera |
| `[tenantSlug]/admin/barberos/page.tsx` | Admin |
| `[tenantSlug]/admin/productos/page.tsx` | Admin |
| `[tenantSlug]/admin/caja/page.tsx` | Admin |
| `[tenantSlug]/admin/configuracion/page.tsx` | Admin |
| `[tenantSlug]/admin/dashboard/page.tsx` | Admin |
| `[tenantSlug]/admin/datos/page.tsx` | Admin |

---

## Resumen: Regla de Oro para Páginas Nuevas

> **Sí el archivo está en `apps/web/src/app/[tenantSlug]/admin/`**
> → Siempre usa `useAdminAuth({ tenantSlug })` como primera línea de lógica.
> → Carga de datos en `useEffect(() => { ... }, [])` separado.
> → **Nunca** pongas `currentUser`, `logout`, `loginStore` en el dep array
>   de un useEffect que haga peticiones al backend.
