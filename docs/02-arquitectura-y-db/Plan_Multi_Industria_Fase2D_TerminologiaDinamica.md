# Multi-Industria — Fase 2-D: Terminología Dinámica Real (Portal de Reserva)

> **Fecha:** 2026-07-24
> **Estado:** ✅ Aplicado (backend + frontend, portal de reserva público)
> **Alcance:** Conectar `terminologiaEmpleado`/`terminologiaServicio`/`terminologiaCliente` (agregadas en
> [Fase 1](./Plan_Multi_Industria_Schema.md)) al frontend público, reemplazando el copy genérico
> introducido en [Fase 2](./Plan_Multi_Industria_Fase2_Rename.md).

---

## 1. Objetivo

Que un tenant de otro vertical (ej. veterinaria) vea su propio lenguaje ("Elige a tu Veterinario") en
vez del genérico "Elige a tu Empleado" que quedó tras el rename de la Fase 2. Este es el punto donde el
trabajo de esquema (Fase 1) y de rename (Fase 2) se vuelve visible para un cliente real.

## 2. Qué había antes (confirmado en código, no solo en docs viejos)

- `apps/web/src/app/[tenantSlug]/layout.tsx` usaba un `getTenantConfig()` **mockeado**: un solo tenant
  hardcodeado (`'barberia-carlos'`), sin llamada real al backend. El objeto resultante ni se propagaba a
  los hijos (solo su `color` vía CSS var).
- `reservar/layout.tsx` derivaba su propio nombre del slug (`tenantSlug.replace('-', ' ')`).
- **No existía ningún endpoint público** que devolviera el perfil de un tenant por slug.

## 3. Qué se construyó

### Backend: nuevo módulo `TenantsModule`

Sigue exactamente el patrón ya establecido en `servicios.service.ts:findPublicBySlug` (resolver
`tenantId` con la función `SECURITY DEFINER auth_get_tenant_by_slug(slug)` — ya filtra
`estado='activo'` — y leer con `runInTenantScope` + RLS):

- `apps/api/src/tenants/tenants.service.ts` — `findPublicBySlug(slug)` devuelve **solo** los campos
  públicos de `barberias`: `nombreComercial`, `slug`, `colorPrimario`, `logoUrl`, `industria`,
  `terminologiaEmpleado`, `terminologiaServicio`, `terminologiaCliente`. Nunca expone `ruc`,
  `killSwitchActivo`, `bloqueadoPorPlataforma`, `planSuscripcion`, etc.
- `apps/api/src/tenants/tenants.controller.ts` — `@Public() GET /tenants/publico/:slug`.
- Registrado en `app.module.ts` junto al resto de módulos.

### Frontend: Context, no Zustand

Se eligió **React Context** en vez de un store de Zustand (a pesar de que `adminStore.ts`/`store.ts` ya
usan Zustand en este repo) porque el dato se resuelve **una sola vez** en el Server Component raíz del
segmento `[tenantSlug]` y no necesita persistencia entre pestañas/recargas — es exactamente el patrón que
la documentación de Next.js (versión real instalada, confirmada contra `node_modules/next/dist/docs`, no
contra conocimiento genérico — este repo tiene un `AGENTS.md` que advierte de cambios en esta versión)
recomienda para este caso: Server Component resuelve datos → Client Component `Provider` los distribuye.

- **Nuevo** `apps/web/src/lib/tenant-context.tsx`: tipo `TenantPublica`, `TenantProvider`, y el hook
  `useTenant()` (lanza error claro si se usa fuera del Provider).
- `apps/web/src/app/[tenantSlug]/layout.tsx`: reemplaza el mock por un `fetch` real a
  `${API_URL}/tenants/publico/${tenantSlug}` (`cache: 'no-store'`, el tenant puede cambiar de
  terminología en caliente vía SuperAdmin). 404 → `notFound()`, igual que antes. Envuelve `{children}`
  en `<TenantProvider>`.
- `apps/web/src/app/[tenantSlug]/reservar/layout.tsx`: se convirtió a Client Component (`'use client'`)
  — antes solo usaba `params` para derivar un string, sin fetch propio, cambio seguro. Usa `useParams()`
  (patrón ya usado en `confirmar/page.tsx`) + `useTenant()` para el `nombreComercial` real en el header.
- `admin/layout.tsx` **no se tocó** — ya hereda el `TenantProvider` del layout padre; cualquier página de
  admin puede llamar `useTenant()` directamente sin cambios estructurales.

### Wiring: dónde se conectó `useTenant()` en esta fase

Solo en el Portal de Reserva público (decisión de alcance, ver sección 5):

| Archivo | Cambio |
|---|---|
| `components/booking/BarberSelection.tsx` | "Elige a tu empleado" → `` `Elige a tu ${terminologiaEmpleado.toLowerCase()}` `` |
| `components/booking/BarberProfileCard.tsx` | "Empleado Profesional & Especialista" → dinámico |
| `components/booking/BookingSummary.tsx` | Labels "Servicio"/"Empleado" → dinámicos |
| `app/[tenantSlug]/reservar/page.tsx` | "Cargando catálogo de la barbería..." → `` `Cargando catálogo de ${nombreComercial}...` `` |
| `app/[tenantSlug]/reservar/confirmar/page.tsx` | Fallbacks `"Servicio Seleccionado"`/`"Empleado Asignado"` → dinámicos |

## 4. Verificación real (no solo compilación)

1. `tsc --noEmit` limpio en `apps/api` y `apps/web`.
2. `curl http://localhost:4000/tenants/publico/barberiajose` → devuelve `terminologiaEmpleado: "Barbero"`
   correctamente.
3. Navegador real: `/barberiajose/reservar` renderiza **"2. Elige a tu barbero"** (minúscula, tomado en
   vivo de la DB).
4. **Prueba de cambio de industria en caliente**: se cambió temporalmente el tenant `estilo-solo-carlos`
   (Solo-preneur) a `industria='veterinaria'`, `terminologiaEmpleado='Veterinario'` directo por SQL —
   **sin rebuild ni restart** — y `/estilo-solo-carlos/reservar` mostró de inmediato **"Veterinario
   Profesional & Especialista"** (rama `BarberProfileCard`, la que usa el modo Solo-preneur). Confirma
   que ambas ramas de UI (`BarberSelection` multi-staff y `BarberProfileCard` solo-preneur) leen el dato
   real. Tenant revertido a `barberia` después de la prueba.
5. Regresión: `POST /citas/publica` de extremo a extremo con `empleadoId` real → 201 Created, sin
   romper el flujo de reserva existente. Registro de prueba eliminado después.

## 5. Explícitamente diferido

- **Terminología dinámica en el panel de administración** (`agenda`, `barberos`, `configuracion`,
  `dashboard`). Mismo patrón (`useTenant()` ya está disponible en todo ese árbol), pero es una
  superficie mucho más grande (labels, títulos de gráficos, tablas) y de menor urgencia — lo usa el
  staff interno, no el cliente que decide si reservar.
- **Banner de "Reserva Pausada"** en el portal público cuando `killSwitchActivo`/`estado` no es
  `activo` — ya documentado como funcionalidad esperada en `matriz-permisos-y-bloqueos.md` pero nunca
  implementada en el frontend. El nuevo endpoint `/tenants/publico/:slug` podría exponer ese estado en
  el futuro, pero no se agregó ahora para no mezclar features.
