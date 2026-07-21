# Changelog - Frontend Hito 2 (MVP del Portal de Reservas)

## Resumen Ejecutivo
Se construyó el **Hito 2** completo del Frontend (App Router de Next.js). Este hito representa la cara pública del SaaS: el flujo de reservas (embudo de conversión) que ven los clientes finales desde sus teléfonos móviles.

El diseño se realizó bajo la premisa **Mobile-First**, priorizando la velocidad, la cero fricción (no descargas, ideal para PWA) y el alto contraste visual con TailwindCSS V4.

## Flujo de Reservas Implementado (Pantallas)

### 1. Pantalla 1: Selección de Servicio y Barbero (`/[tenantSlug]/reservar`)
- **UI:** Botones grandes y semánticos, renderizados condicionalmente con Tailwind.
- **Lógica:** Se leen los Mocks locales (futuramente conectados al API).
- **Zod:** Validación estricta `reservaSeleccionSchema`. Obliga a elegir un servicio y un barbero (o la opción "Cualquiera" que asume `barberoId: null`).
- **Navegación:** `router.push()` inyectado al validar todo.

### 2. Pantalla 2: Calendario Inteligente (`/[tenantSlug]/reservar/fecha`)
- **UI:** 
  - `DaySelector.tsx`: Carrusel horizontal de los próximos 14 días con UX nativa (snap-x).
  - `TimeSlotGrid.tsx`: Grilla de horarios. Muestra la hora de inicio **y fin** calculando la duración del servicio seleccionado.
- **Filtro Inteligente:** Si se selecciona "Hoy", se ocultan los horarios que ya pasaron.
- **Protección de Ruta:** Redirige atrás si el usuario entra sin haber seleccionado un servicio primero.

### 3. Pantalla 3: Formulario Express y Confirmación (`/[tenantSlug]/reservar/confirmar`)
- **BookingSummary:** Muestra el resumen visual de la cita escogida (Servicio, Precio, Fecha formateada, Barbero).
- **ClientForm:** Solo Nombre y WhatsApp.
  - Se instaló `libphonenumber-js` para validar y normalizar números de WhatsApp asumiendo PA (+507) por defecto.
- **Máquina de Estados:** `idle | loading | error | success`. Al confirmar simula latencia de red, previene dobles clicks.
- **SuccessView:** Al completarse, se inyecta `?status=success` en la URL (via `router.replace` para evitar romper el historial web) y se limpia el Store para no revivir datos antiguos.
- **UX Adicional:** Botón verde para confirmación vía deep-link de WhatsApp (`wa.me`).

## Estado y Persistencia (Zustand)
- Se implementó **Zustand** en `lib/store.ts`.
- Se utilizó el middleware `persist` enlazado al `sessionStorage`. 
- **Beneficio:** Si el usuario recarga la página, recibe un mensaje, o accidentalmente navega hacia atrás, los datos seleccionados se mantienen vivos, bajando la tasa de abandono de reserva.
- Se desarrolló `useHydration.ts` para evitar los errores clásicos de *hydration mismatch* entre SSR (Next.js) y el estado inyectado del navegador.

## Archivos Principales Afectados/Creados
- `apps/web/src/app/globals.css` (Temas y Tailwind V4)
- `apps/web/src/app/[tenantSlug]/layout.tsx` (Inyección SSR de temas)
- `apps/web/src/lib/types.ts` (Zod Schemas y tipos)
- `apps/web/src/lib/store.ts` (Zustand)
- `apps/web/src/app/[tenantSlug]/reservar/*` (Rutas del flujo)
- `apps/web/src/components/booking/*` (Componentes visuales del flujo)

---
*Fin del Hito 2. El sistema está pausado y sincronizado en Git. Próximo paso planificado: Hito 3 (Panel Administrativo de Barberos / Login PIN).*
