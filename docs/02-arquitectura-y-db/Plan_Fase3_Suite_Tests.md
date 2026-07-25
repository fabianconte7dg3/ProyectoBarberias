# Fase 3: Suite de Tests Automatizados Real

> Estado: ✅ Implementado y verificado (2026-07-25, alcance acordado — ver `plan.md` Fase 3 para lo que
> queda deliberadamente fuera). Ver [`plan.md`](../plan.md) Fase 3 para el checklist tachable.

## Contexto

Hoy la cobertura de tests real es cero: los 13 `*.spec.ts` de `apps/api` (uno por controller/service
generado con `nest generate`) y el único `test/app.e2e-spec.ts` son boilerplate sin personalizar —
solo instancian el módulo y comprueban `toBeDefined()`. `apps/web` tiene `vitest`,
`@testing-library/react` y `@testing-library/dom` en `package.json` desde hace tiempo, pero sin
`vitest.config.ts`, sin script `test`, y sin un solo archivo `*.test.tsx`.

El propio `docs/plan.md` marca el punto de partida: "empezar por los módulos críticos: RLS/tenant
scoping, cálculo de comisiones, idempotencia de `crearCita`". Esta fase no busca llegar a cobertura
total (sería un esfuerzo de varias sesiones) sino construir la infraestructura de testing real y
demostrar que funciona sobre las 3 garantías más importantes del sistema — las que, si se rompen, rompen
silenciosamente (aislamiento entre tenants, dinero mal calculado, citas duplicadas).

## Decisión de diseño: por qué integration tests reales, no mocks, para RLS/idempotencia/comisiones

RLS es una garantía de Postgres, no de la aplicación (ver `CLAUDE.md` — "la base de datos igual bloquea
el acceso cruzado, no es una convención de aplicación"). Un test que mockea `NodePgDatabase` de Drizzle
no puede probar que una política `USING (tenant_id = current_tenant_id())` realmente bloquea una fila —
solo probaría que el código de la app construyó el `WHERE` que *pensamos* que construyó. Lo mismo aplica
a la idempotencia de `citas.service.ts`: depende de `onConflictDoNothing({ target: citas.idempotencyKey
})` y de capturar el código de error real de Postgres (`23P01` del `EXCLUDE` constraint, `23505` de la
unique key) — comportamiento del motor, no lógica que se pueda simular fielmente con un mock.

Por eso estas 3 áreas se cubren con **integration tests contra un Postgres real**, separados de los
tests unitarios rápidos (`*.spec.ts`, que no requieren Docker) en un proyecto Jest propio.

## Base de datos de test dedicada: `volumetrix_test`

Reutiliza el mismo contenedor `volumetrix_postgres` que ya corre en desarrollo (no se levanta un
contenedor nuevo) — una base de datos adicional, `volumetrix_test`, creada y poblada por
`apps/api/test/integration/bootstrap-test-db.sh`:

1. `DROP DATABASE IF EXISTS volumetrix_test` + `CREATE DATABASE volumetrix_test` (siempre desde cero,
   descartable).
2. Reproduce las 21 migraciones SQL de `apps/api/src/database/migrations/` vía `psql`, el mismo patrón
   que ya usa este proyecto para la base de datos real — pero **no** en orden alfabético/numérico: el
   prefijo no es una clave de orden confiable acá (`0003` y `0006` existen duplicados, 2 y 3 archivos
   respectivamente), así que el script usa un orden explícito, hallado por prueba y error real contra
   Postgres. Esto sirvió exactamente para lo que se esperaba — encontrar drift no documentado — y lo
   encontró: `0001_rls_policies.sql` referencia `yappy_config` (creada en `0003_financiero.sql`, que a su
   vez necesita la función `current_tenant_id()` definida en `0001` — dependencia circular real, resuelta
   pre-creando esa función antes de ambas); `0006_kill_switch.sql` y `0003_gorgeous_sabra.sql` agregan la
   misma columna (`barberias.kill_switch_activo`) sin `IF NOT EXISTS` — se omite el primero; y
   `detalles_transaccion` (tabla completa, con su enum `tipo_item`) **no tiene ninguna migración que la
   cree** — existe en `volumetrix` por un `CREATE TABLE` aplicado a mano en algún momento. El script la
   recrea con el DDL exacto inspeccionado vía `\d detalles_transaccion` contra la base real. Cada uno de
   estos ajustes vive únicamente en `bootstrap-test-db.sh` — ningún archivo de migración real se tocó.
3. Un `GRANT ALL ... TO app_user` de cierre (no es una migración nueva — vive solo en el script de
   bootstrap) como red de seguridad: el rol `app_user` ya existe a nivel de cluster (lo usa
   `volumetrix` en desarrollo), pero permisos a nivel de tabla son por base de datos, y el historial de
   migraciones no garantiza que cada `GRANT` esté completo para una base nueva (ver advertencia ya
   existente en `CLAUDE.md` sobre drift entre `schema.ts` y la base real).

No se hace `TRUNCATE` entre tests: cada test crea su propio tenant con UUID aleatorio (`gen_random_uuid()`
vía Drizzle `defaultRandom()`), así que nunca colisiona con datos de otra corrida — `volumetrix_test` es
descartable y se puede recrear en cualquier momento con el mismo script.

## Dos conexiones, mismo patrón que producción

`apps/api/test/integration/setup/test-db.ts` expone dos pools `pg.Pool` + `drizzle()`:

- **`superDb`** — conecta como `postgres` (superusuario, `BYPASSRLS` implícito). Solo para *armar*
  fixtures (crear tenant, empleado, servicio, cliente) sin pelear con RLS — exactamente el mismo rol que
  ya usa este proyecto para aplicar seeds (`docker exec ... psql -U postgres ...`).
- **`appDb`** — conecta como `app_user`, idéntico al `DATABASE_URL` real de `apps/api/.env` pero apuntando
  a `volumetrix_test`. Es la conexión que reciben los servicios bajo prueba.

Las aserciones sobre RLS/idempotencia/comisiones corren los servicios reales
(`CitasService.crearCita`, `TransaccionesService.cobrarCita`) envueltos en
`runInTenantScope(appDb, tenantId, callback)` — la misma función que usa producción para webhooks/jobs
(ver `tenant.utils.ts`), no una reimplementación paralela para el test.

Un diff completo de `information_schema.columns` entre `volumetrix` y `volumetrix_test` (tras el
bootstrap) confirmó estos ajustes y encontró 4 más, todos del mismo patrón (columna real sin ninguna
migración que la cree): `clientes.acepta_marketing`, `usuarios.porcentaje_comision_producto`,
`transacciones.idempotency_key` (columna completa) y `transacciones.cita_id` (debía ser nullable, la
migración original la declara `NOT NULL`). Los 4 se agregan en el script de bootstrap, en el mismo punto
donde debería haber estado el resto de columnas "core" de `0000`. **Excepción deliberada:**
`plataforma_admins` tiene además diferencias de tipo/nulabilidad (`password_hash`, `totp_secret_cifrado`,
`created_at`, `updated_at`) que se dejan sin reconciliar — ninguno de los 3 archivos de test de esta
pasada usa esa tabla (SuperAdmin queda fuera del alcance de "RLS/comisiones/idempotencia de crearCita"),
así que no se persigue más allá de dejarlo documentado acá.

## Alcance de esta pasada (backend)

- `apps/api/test/integration/rls-tenant-isolation.integration-spec.ts`
- `apps/api/test/integration/citas-idempotencia.integration-spec.ts`
- `apps/api/test/integration/transacciones-comisiones.integration-spec.ts`
- `apps/api/test/jest-integration.json` + script `npm run test:integration` (separado de `test`/`test:e2e`
  porque requiere Docker levantado, igual criterio que ya separa `test` de `test:e2e`)

**Explícitamente fuera de esta pasada:** personalizar los 13 `*.spec.ts` boilerplate restantes
(auth, usuarios, yappy, dgi, caja, etc.) y el `app.e2e-spec.ts` genérico — quedan como deuda conocida,
no se tocan para no diluir el foco en los 3 módulos críticos que pidió `plan.md`. Se documenta como
siguiente paso explícito, no se finge que quedó resuelto.

## Alcance de esta pasada (frontend)

Cero tests existían. En vez de escribir un test trivial de humo, se prioriza:

- `apps/web/vitest.config.ts` (entorno `jsdom`, alias `@` -> `src` igual que `tsconfig.json`) + scripts
  `test`/`test:watch` en `package.json`. Sin dependencias nuevas: `vitest`, `@testing-library/react` y
  `@testing-library/dom` ya estaban instaladas — los matchers de `@testing-library/jest-dom`
  (`toBeInTheDocument`, etc.) no hacían falta, `expect().toBeTruthy()`/`toBeNull()` sobre lo que
  devuelven las queries de Testing Library alcanza para lo que se prueba en esta pasada.
- `apps/web/src/lib/disponibilidad.test.ts` — `calcularSlotsDisponibles()` es lógica pura crítica
  (calcula qué horarios se pueden reservar respetando jornada/almuerzo/ocupados) sin dependencias de
  React — la elección natural de "empezar por lo crítico" aplicada al frontend, y el área donde ya hubo
  un bug de regresión real en la Fase 2.3 (combos que rebotaban por un guard mal escrito en otro archivo
  que consume esta función).
- `apps/web/src/components/admin/ProfileSelector.test.tsx` — test de regresión del fix de esta misma
  fase (ver siguiente sección): confirma que el badge de rol usa la terminología del tenant, no el string
  crudo.

**Explícitamente fuera de esta pasada:** cobertura de componentes de flujo completo (wizard de reserva,
`CobrarCitaModal`, etc.) — mucho mayor superficie, mismo criterio de foco que en el backend.

## Fix incluido: `ProfileSelector.tsx` (deuda ya listada en `plan.md` Fase 3)

Mostraba `member.rol` crudo (`"empleado"`, `"admin"`, `"recepcion"`) en vez de la terminología del
tenant. Corregido para leer `useTenant()` y mapear `'empleado' → terminologiaEmpleado` (ej.
"Veterinario"); `admin`/`recepcion` no tienen término dinámico en el esquema (son roles de plataforma,
no del vertical de negocio) así que se quedan como "Administrador"/"Recepción" genérico.

## Verificación (resultados reales)

1. `./apps/api/test/integration/bootstrap-test-db.sh` — recrea `volumetrix_test` sin errores.
2. `cd apps/api && npm run test:integration` — **3 suites, 13 tests, todos en verde.**
3. `cd apps/web && npx vitest run` — **2 archivos, 8 tests, todos en verde.**
4. `npx tsc --noEmit` en ambos paquetes — **0 errores.**
5. Los 13 `*.spec.ts` boilerplate y `test/app.e2e-spec.ts` existentes se dejan intactos (no se tocó
   ningún archivo). **Hallazgo, no causado por esta fase:** `npm test` (la suite normal, sin Docker) ya
   fallaba 12/13 antes de este trabajo — confirmado corriendo `git stash` y repitiendo `npm test` contra
   el estado previo del repo. Los controllers ya requieren providers reales que el boilerplate de
   `nest generate` nunca registró (`DRIZZLE_POOL_DB`, `Queue`, etc.), así que ni logran instanciar el
   módulo de test. Documentado en `plan.md` Fase 3 como deuda explícita, no se intenta arreglar acá.
