# Walkthrough — Entender el proyecto en 15 minutos

> Objetivo (tomado literalmente del roadmap original del proyecto,
> [`archives/Checklist_Desarrollo_SaaS.md`](../archives/Checklist_Desarrollo_SaaS.md): *"si un
> programador nuevo entra, debe entender la arquitectura en 15 minutos"*): este documento es ese
> recorrido. Describe
> el estado **actual** del código — hoy la marca sigue siendo **BarberOS**; el rebrand a "Volumetrix" es
> un plan propuesto y no ejecutado, ver [`plan.md`](../plan.md) Fase 1.

## Qué es esto

Un SaaS multi-tenant de agendamiento para barberías en Panamá, con una arquitectura pensada desde el
inicio para poder pivotar a otros verticales de servicios (spa, veterinaria, clínicas, talleres) sin
reescribir el motor — ver [`Vision_Multi_Industria.md`](../01-vision-y-plan/Vision_Multi_Industria.md).
Monorepo con dos apps independientes: `apps/api` (NestJS) y `apps/web` (Next.js). Guía completa de
arquitectura, comandos y convenciones: [`CLAUDE.md`](../../CLAUDE.md).

## La pieza que sostiene todo: RLS multi-tenant

Cada fila de cada tabla protegida tiene una política de PostgreSQL que compara `tenant_id` contra
`current_tenant_id()` — una función SQL que lee `current_setting('app.current_tenant_id')`. El
`TenantInterceptor` de NestJS setea ese valor por request, dentro de una transacción, a partir del JWT.
Esto significa que aunque un desarrollador olvide un `WHERE tenant_id = ...` en una query, la base de
datos igual bloquea el acceso cruzado — no es una convención de aplicación, es una garantía de motor. Hay
un job automatizado (`CanaryProcessor`, corre cada hora) que intenta activamente romper este aislamiento
y alerta si lo logra.

## Recorrido por hitos completados (backend)

Resumen condensado — detalle completo en
[`RESUMEN_HITOS_Y_FLUJOS.md`](./RESUMEN_HITOS_Y_FLUJOS.md):

1. **Setup multitenant + JWT** — RLS + `TenantInterceptor`.
2. **Catálogo y roles** — CRUD de empleados/servicios protegido por rol.
3. **Clientes y VIPs** — CRM con cálculo de ausencias (`no-shows`).
4. **Agendamiento** — creación de citas con idempotencia + bloqueo optimista contra double-booking a
   nivel de constraint de Postgres (`EXCLUDE`, no solo validación en app).
5. **Finanzas y caja** — cobro mixto, comisiones, arqueo de caja ciego.
6. **WhatsApp asíncrono** — BullMQ + Evolution API, confirmaciones/recordatorios desacoplados del
   request HTTP.
7. **Auditoría y kill-switch** — log inmutable de acciones sensibles + apagado de emergencia por tenant.
8. **Auth de staff con PIN + cookies httpOnly** — login rápido en tablets, rate-limiting progresivo.
9. **SuperAdmin** — onboarding asistido, 2FA TOTP obligatorio, enforcement de límites por plan.
10. **Observabilidad** — canario de RLS automatizado, alertas de seguridad, métricas de churn.

## Lo construido en la iniciativa Multi-Industria (esta sesión de trabajo)

Documentado en detalle en `docs/02-arquitectura-y-db/Plan_Multi_Industria_*.md`:

- **Fase 1 (esquema):** columnas `industria`, `terminologia_empleado/servicio/cliente` en `barberias`;
  `datos_adicionales` (jsonb) en `clientes`; `notas` (text) en `citas`. Todo aditivo, con defaults
  seguros — cero downtime, cero breaking change.
- **Fase 2 (rename):** `barbero` → `empleado` en 51 archivos (backend + DB + frontend), guiado por el
  compilador (`tsc --noEmit` como checklist de errores), no por grep-and-pray. Las columnas fiscales
  `comisionBarbero`/`propinaBarbero` quedaron **intencionalmente** sin tocar (libro contable append-only,
  requiere revisión propia).
- **Fase 2-D (terminología dinámica real):** nuevo endpoint público `GET /tenants/publico/:slug` +
  `TenantProvider`/`useTenant()` en React Context, conectado tanto en el Portal de Reserva como en las 8
  páginas del Panel de Administración. Verificado en navegador real, incluyendo un cambio de industria
  en caliente por SQL (sin rebuild) reflejado instantáneamente en la UI.
- **Fix de bug real (no relacionado a multi-industria, encontrado en el camino):** una recarga dura del
  navegador en una ruta de admin protegida podía cerrar la sesión por una carrera de hidratación entre
  Zustand y el guard `useAdminAuth` — corregido, verificado con 3 escenarios reales.
- **Higiene de repo:** el proyecto llegó a tener 47.890 archivos trackeados en git, de los cuales 47.282
  (98.7%) eran `node_modules` — causa raíz: `apps/api` nunca tuvo `.gitignore` propio. Corregido:
  329 archivos trackeados hoy. Detalle completo, incluyendo un efecto secundario real que rompió
  temporalmente `apps/api` (dependencias borradas del disco, no solo destrackeadas) y su corrección:
  [`Auditoria_Metodologia_Desarrollo_IA.md`](../01-vision-y-plan/Auditoria_Metodologia_Desarrollo_IA.md).

## Estado actual, de un vistazo

- **Producto:** 100% funcional para barberías (flujo completo validado: reserva pública → agenda →
  cobro → caja → reportes).
- **Multi-industria:** la terminología ya es dinámica (cosmético, funciona), pero la captura de datos
  específica del vertical (`datos_adicionales`, `notas`) no tiene wiring de UI/API todavía — ver
  [`spec.md`](../spec.md) §7.
- **Marca:** "BarberOS" en código y UI. Rebrand a "Volumetrix" propuesto, no ejecutado — ver
  [`plan.md`](../plan.md) Fase 1.
- **Tests automatizados:** cobertura real cero (boilerplate sin personalizar) — ver
  [`spec.md`](../spec.md) §10.
- **Infraestructura:** todo corre en Docker local; nada de dominio/SSL/CI-CD/staging todavía.

## Por dónde seguir

[`plan.md`](../plan.md) tiene el desglose completo en tareas chicas, fase por fase, empezando por las
decisiones pendientes del rebrand a Volumetrix.
