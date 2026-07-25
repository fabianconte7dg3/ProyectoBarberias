# Fase 1 — Rebrand BarberOS → Volumetrix (ejecutado 2026-07-25)

> Este documento registra qué se hizo, qué se decidió y cómo se verificó. El resumen corto vive en
> [`plan.md`](../plan.md) Fase 1; el detalle completo está aquí para no perder el rastro de las 3
> decisiones que bloqueaban esta fase.

## Decisiones resueltas (bloqueaban la ejecución)

1. **Slugs de tenant** (`estilo-solo-carlos`, etc.): se dejaron **sin tocar**. Son datos, no marca —
   cambiarlos habría roto cualquier link ya compartido con clientes. Confirmado con el usuario: todos los
   datos actuales son de prueba, sin restricción real, pero no había motivo para migrarlos igual.
2. **Ruta `/admin/barberos` → `/admin/empleados`**: se agregó **redirect 308 permanente** (equivalente
   moderno del 301 clásico — Next.js usa 307/308 para preservar el método HTTP del request, ver
   `redirects.md` en `node_modules/next/dist/docs`) vía `next.config.ts`. Verificado con `curl -I`:
   `308 -> /:tenantSlug/admin/empleados`.
3. **Renombrar la base de datos Docker** (`barberos` → `volumetrix`): usuario confirmó que todos los
   datos son de prueba (sin problema en perder o rehacer), pero se optó igual por el camino conservador
   aprobado (backup previo). En vez de un `pg_dump` + restore completo (más pasos, más superficie de
   error para el mismo resultado), se usó `ALTER DATABASE barberos RENAME TO volumetrix` — atómico, sin
   downtime de datos, mismo resultado. Se tomó un `pg_dump -F c` de respaldo **antes** de ejecutar el
   rename como red de seguridad (no se necesitó usarlo). Verificado con conteo de filas antes/después
   (`barberias`, `usuarios`, `citas`) — idéntico.

## Qué se cambió

### Backend (`apps/api`)
- `schema.ts`: `estadoBarberiaEnum` → `estadoTenantEnum` (solo el nombre de la variable TS — el enum
  físico de Postgres `estado_barberia` **no cambió**, cero migración SQL necesaria).
- `super-admin.service.ts`: los 2 literales `"BarberOS"` (URL de TOTP del setup inicial, mensaje de
  bienvenida) → `"Volumetrix"`.
- Mensajes genéricos `'Barbería no encontrada'` (hardcodeados en `citas.controller.ts`,
  `clientes.controller.ts`, `usuarios.service.ts`, `servicios.service.ts`) → `'Negocio no encontrado'` —
  no eran de marca, sino texto de error mostrado para *cualquier* tenant sin resolver, inconsistente ya
  con el trabajo de multi-industria (una veterinaria no es una "barbería").
- **No se tocó** (a propósito): tabla física `barberias`, enum `industria_negocio`, ninguna de las FKs de
  las tablas relacionadas — eso es una migración de datos aparte, fuera de este plan.

### Frontend (`apps/web`)
- 6 literales `"BarberOS"` → `"Volumetrix"` (`super-admin/page.tsx`, `super-admin/login/page.tsx`,
  `super-admin/setup/page.tsx`, `SuccessView.tsx`, `AdminHeader.tsx`, `admin/datos/page.tsx`).
- `app/[tenantSlug]/admin/barberos/` → `app/[tenantSlug]/admin/empleados/` (`git mv`, preserva historial),
  componente `AdminBarberosPage` → `AdminEmpleadosPage`, link del menú en `AdminHeader.tsx` actualizado.
- `next.config.ts`: nuevo `redirects()` — `/:tenantSlug/admin/barberos` → `/:tenantSlug/admin/empleados`
  (308 permanente).
- `components/super-admin/BarberiasEnRiesgoCard.tsx` → `NegociosEnRiesgoCard.tsx` (componente + copy:
  "Barberías en Riesgo de Churn" → "Negocios en Riesgo de Churn", etc.).
- `components/super-admin/CrearBarberiaModal.tsx` → `CrearNegocioModal.tsx` (componente + copy: "Crear
  Barbería" → "Crear Negocio" en todos los textos de UI del modal).
- **No se tocaron** los nombres de campo de la respuesta real de `/super-admin/business-metrics`
  (`barberiasBasico`, `barberiasPremium`, `barberiasEnRiesgo`, `estadoBarberia`) — son parte del contrato
  JSON real que devuelve `super-admin.service.ts`; renombrarlos solo en el frontend habría roto el mapeo
  sin ganar nada, y no estaba en el alcance original de este plan.

### Infraestructura
- `infrastructure/docker-compose.yml`: `barberos_postgres`→`volumetrix_postgres`,
  `barberos_redis`→`volumetrix_redis`, `POSTGRES_DB: barberos`→`volumetrix` (esta última solo importa si
  el volumen se recrea desde cero alguna vez — en un contenedor ya inicializado no tiene efecto).
- `apps/api/.env`: `DATABASE_URL` actualizado a `.../volumetrix`.
- Base de datos renombrada en vivo (`ALTER DATABASE`, ver arriba). Volúmenes con nombre (`postgres_data`,
  `redis_data`) preservados sin cambios — no se perdió ningún dato al recrear los contenedores con los
  nombres nuevos.
- Docs de referencia actualizados para que los comandos copiables sigan siendo correctos:
  [`CLAUDE.md`](../../CLAUDE.md), [`README_Arquitectura_Datos.md`](../06-referencias-tecnicas/README_Arquitectura_Datos.md),
  [`Credenciales_QA_Local.md`](../06-referencias-tecnicas/Credenciales_QA_Local.md).

## Verificación realizada

1. `cd apps/api && npx tsc --noEmit` — limpio.
2. `cd apps/web && npx tsc --noEmit` — limpio (tras regenerar `.next/types`, que había quedado con una
   referencia obsoleta a la ruta vieja).
3. `docker exec volumetrix_postgres psql ... SELECT count(*) FROM barberias/usuarios/citas` — conteos
   idénticos a antes del rename.
4. `curl http://localhost:4000/tenants/publico/barberiajose` — 200 OK, API sirviendo desde la DB
   renombrada.
5. `curl -I http://localhost:3000/[slug]/admin/barberos` — `308` → `/[slug]/admin/empleados`.
6. Smoke test real en navegador: login de admin QA (`qa-admin@test.local`) → `/qa-test/admin/empleados`
   carga la lista real de staff con comisiones y horarios. Login de SuperAdmin muestra "Volumetrix SaaS
   Platform".
7. `grep -rn "BarberOS" apps/api/src apps/web/src` → cero resultados.

## Explícitamente fuera de alcance (documentado, no ejecutado)

Igual que decía el plan original en `plan.md`:
- Rename físico de la tabla `barberias` o del enum `industria_negocio` (el valor `barberia` se queda).
- Nombre del proyecto/paquete en `package.json`, nombre del repositorio Git.
- Cualquier referencia a "BarberOS"/"barberos" en documentación **histórica** (`docs/archives/`,
  `Auditoria_Metodologia_Desarrollo_IA.md`, los docs de Fase 0 de multi-industria) — esos describen un
  estado pasado real y no deben reescribirse para simular que dijeron algo distinto.
