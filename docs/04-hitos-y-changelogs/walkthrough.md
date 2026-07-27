# Walkthrough — Entender el proyecto en 15 minutos

> Objetivo (tomado literalmente del roadmap original del proyecto,
> [`archives/Checklist_Desarrollo_SaaS.md`](../archives/Checklist_Desarrollo_SaaS.md): *"si un
> programador nuevo entra, debe entender la arquitectura en 15 minutos"*): este documento es ese
> recorrido. Describe el estado **actual** del código — la marca es **Volumetrix** (rebrand ejecutado el
> 2026-07-25, ver [`plan.md`](../plan.md) Fase 1 y el detalle en
> [`Plan_Rebrand_Fase1_BarberOS_a_Volumetrix.md`](../02-arquitectura-y-db/Plan_Rebrand_Fase1_BarberOS_a_Volumetrix.md)).
> La base de datos y los contenedores Docker también se renombraron (`volumetrix_postgres`/
> `volumetrix_redis`, DB `volumetrix`).

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
  `comisionBarbero`/`propinaBarbero` (libro contable append-only) se dejaron fuera de este pase a
  propósito, para revisarlas aparte con más cuidado — renombradas después, en la Fase 2.4, tras confirmar
  que no tienen conexión con el módulo DGI ni ningún contrato externo.
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

## Rediseño visual completo (Fase 6, 2026-07-26)

Documentado en detalle en
[`Plan_Rediseno_Visual_Stitch.md`](../05-diseno-y-ux/Plan_Rediseno_Visual_Stitch.md) (análisis de
fondo) y `docs/plan.md` Fase 6 (desglose ejecutable, sub-fase por sub-fase):

- **Dos sistemas de diseño, no uno:** el theme neutro de shadcn se reemplazó por completo en
  `globals.css` — **Volumetrix Design System** (rosa `#b0004a`/teal `#006876`, superficie
  `[tenantSlug]/**`: panel de tenant + portal de reserva + landing) y **Volumetrix Executive System**
  (navy/rosa, superficie `super-admin/**`, scopeado vía `[data-surface="executive"]`). El white-labeling
  por tenant (`colorPrimario` sobreescribiendo `--primary`) se preservó intacto sobre los tokens nuevos.
- **Super Admin (6.2)** partió de `slate`/`zinc`/`blue` hardcoded por todas partes — el trabajo más
  grande de recoloreo de la fase, más una sidebar nueva y separar el listado de tenants a su propia
  ruta. **Panel de tenant (6.4)** partió ya usando tokens semánticos (heredó el Design System solo con
  6.1), así que fue en gran parte limpieza de acentos `blue-*` sueltos.
- **Impersonation de Super Admin ("Login as Tenant", 6.3):** JWT de 30 min con claims `imp`/`impBy`,
  log de auditoría, banner ámbar persistente mientras la sesión está impersonando.
- **"Mi Silla" para staff (6.5):** vista de trabajo dedicada para rol `empleado` (cola de clientes del
  día, KPIs, cobro), reutilizando los endpoints ya existentes (`GET /citas`, `GET
  /reportes/mi-desempeno`) sin necesitar superficie de API nueva. Convive con `admin/agenda`, no la
  reemplaza.
- **Portal de reserva pública + landing (6.6):** wizard de reserva restyled con un stepper de progreso
  real; se encontró y corrigió un bug real en el camino — el resumen de confirmación mostraba datos
  inventados (`"{terminología} Seleccionado"`, precio fijo `"15.00"`) en vez del servicio/empleado/
  precio real elegido. Landing page nueva en `/` (antes boilerplate de `create-next-app`) — el mockup
  `three.js` del export resultó ser JS roto de otra pantalla, así que se construyó sin esa dependencia.
- **Patrón repetido en varias sub-fases:** cuando el mockup de Stitch mostraba datos que no existen en
  el modelo (ratings de profesionales, gráficos de MRR, "Metas del Día" por empleado, IVA en el
  booking), se dejó fuera a propósito — UI con datos inventados es peor que no tener esa UI. Cada
  omisión está documentada en `docs/plan.md` Fase 6, sub-fase por sub-fase.

## Estado actual, de un vistazo

- **Producto:** 100% funcional para barberías (flujo completo validado: reserva pública → agenda →
  cobro → caja → reportes).
- **Multi-industria:** la terminología ya es dinámica (cosmético, funciona), pero la captura de datos
  específica del vertical (`datos_adicionales`, `notas`) no tiene wiring de UI/API todavía — ver
  [`spec.md`](../spec.md) §7.
- **Marca:** "Volumetrix" en código y UI (rebrand ejecutado 2026-07-25) — ver [`plan.md`](../plan.md)
  Fase 1.
- **Diseño visual:** rediseño completo con los dos sistemas de Stitch (Design System / Executive
  System) en las 24 superficies mapeadas — panel de tenant, Super Admin, portal de reserva pública y
  landing — más impersonation de Super Admin y la vista "Mi Silla" para staff (rebrand ejecutado
  2026-07-26) — ver [`plan.md`](../plan.md) Fase 6.
- **Tests automatizados:** cobertura real en los módulos críticos desde la Fase 3 (2026-07-25) — RLS
  multi-tenant, idempotencia de citas, cálculo de comisiones (`apps/api`, integration tests contra
  Postgres real vía `npm run test:integration`) y `calcularSlotsDisponibles`/`ProfileSelector`
  (`apps/web`, `npm test`). Los 13 `*.spec.ts` boilerplate originales de `apps/api` (`npm test` normal,
  sin DB) fueron reparados el 2026-07-26 — reescritos con mocks reales y casos de negocio (bloqueo
  progresivo de login, cálculo de comisiones/combos, validación de hash HMAC del webhook de Yappy,
  límite de empleados por plan, etc.), no solo `should be defined`; 13/13 suites, 77 tests en verde —
  ver [`Plan_Fase3_Suite_Tests.md`](../02-arquitectura-y-db/Plan_Fase3_Suite_Tests.md) y
  [`spec.md`](../spec.md) §10.
- **Infraestructura:** dominio (`volumetrixpa.com`) con subdominio por tenant y SSL on-demand vía Caddy,
  CI/CD (GitHub Actions) y PgBouncer verificado empíricamente ya están implementados — ver
  [`Plan_Fase4_Infraestructura.md`](../02-arquitectura-y-db/Plan_Fase4_Infraestructura.md). Staging real,
  backups con destino real y monitoreo con servicio real quedan como placeholders, pendientes de
  decisión externa (proveedor DNS/backup/monitoreo, servidor de staging).

## Por dónde seguir

[`plan.md`](../plan.md) tiene el desglose completo en tareas chicas, fase por fase, empezando por las
decisiones pendientes del rebrand a Volumetrix.
