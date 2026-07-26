# Fase 4: Infraestructura de Producción

> Estado: 🔶 Parcial (2026-07-26) — dominio/DNS/SSL, CI/CD y PgBouncer quedan implementados y
> verificados localmente. Staging real, backups con destino real y monitoreo con servicio real quedan
> como placeholders explícitos, documentados abajo — requieren decisiones externas (proveedor DNS,
> servidor de staging, destino de backup, servicio de monitoreo) que todavía no se tomaron.

## Contexto

`docs/plan.md` Fase 4 tenía 6 pendientes sin empezar. El usuario decidió el dominio de producción
(`volumetrixpa.com`) y, en vez del esquema actual de path (`volumetrixpa.com/barberia-jose/...`), pidió
URLs por subdominio de tenant (`barberia-jose.volumetrixpa.com/...`) — un cambio real de arquitectura de
ruteo, no solo de infraestructura.

Referencia de patrón: un proyecto separado del usuario (`Volumetrix_IA`, otro repo, sin relación de
código con este) ya resuelve el mismo problema de proxy inverso Caddy con SSL automático por subdominio +
dominio propio de cliente. Se reutilizó **el patrón** (Caddy + on-demand TLS), no su código — los dos
proyectos se mantienen separados, conectados solo a nivel de infraestructura (mismo servidor, mismo
Caddy) si algún día comparten VPS.

Restricción real de este entorno: no hay VPS de producción, proveedor de DNS, ni servicio de
backup/monitoreo elegidos. Por eso esta fase construye y verifica localmente (Docker Compose, `tsc`,
tests reales) todo lo que es código/configuración versionable, y deja señalado — sin inventar — lo que
necesita una decisión externa del usuario.

## 1. Subdominio por tenant: `apps/web/src/proxy.ts`

**Hallazgo importante de esta fase**: Next.js 16.2.11 renombró el archivo de convención `middleware.ts` a
`proxy.ts` (confirmado leyendo `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
proxy.md` — `middleware.ts` ya no es una convención soportada en esta versión). Cualquier intento de
crear un `middleware.ts` clásico simplemente no se ejecutaría.

`proxy.ts` lee el header `Host`, separa el puerto, y:
- Si el host es el dominio raíz (`volumetrixpa.com`/`localhost`) o un subdominio reservado (`www`,
  `api`, `admin`) → no reescribe nada, sirve `app/page.tsx`/`app/super-admin/**` tal cual.
- En cualquier otro caso, el primer label del host **es** el slug del tenant sin tabla de mapeo
  (consistente con que `[tenantSlug]` ya usa el slug crudo hoy) → `NextResponse.rewrite` a
  `/${slug}${pathname}`, preservando querystring.

La validación de "el tenant existe" la sigue haciendo `[tenantSlug]/layout.tsx` contra
`/tenants/publico/:slug`, igual que antes — el proxy no duplica esa llamada en cada request.

Dos lugares armaban URLs públicas absolutas con el esquema de path viejo (`AdminHeader.tsx`'s
`handleCopyLink`, `InviteEmpleadoModal.tsx`'s link de activación) — se centralizaron en un helper único
`apps/web/src/lib/tenant-url.ts` (`buildTenantPublicUrl`) en vez de duplicar la lógica de construcción de
URL en cada sitio.

**Verificado en navegador real**: `qa-test.localhost:3000/reservar` resuelve al tenant correcto (Chrome
resuelve `*.localhost` a 127.0.0.1 sin tocar `/etc/hosts`), `admin/login` bajo el mismo subdominio
también funciona, y el dominio raíz sin subdominio sigue sirviendo la landing sin reescribir.

## 2. CORS de producción: `apps/api/src/main.ts`

`origin: true` (refleja cualquier origin) se mantiene intacto en dev/CI (`NODE_ENV !== 'production'`). En
producción, valida contra un regex anclado:

```
/^https:\/\/([a-z0-9-]+\.)?volumetrixpa\.com$/
```

Anclado a `^https://` y con el punto explícito antes del dominio para que **no** matchee typosquatting
tipo `evil-volumetrixpa.com` (regex sin anclar sí lo dejaría pasar). Verificado con 8 casos reales
(dominio raíz, www, subdominio de tenant, típosquatting, http sin TLS, subdominio anidado) — todos con el
resultado esperado.

## 3. Caddy: on-demand TLS con validación real de dominio

`infrastructure/production/Caddyfile`: `volumetrixpa.com`/`www` → `web:3000`, `api.volumetrixpa.com` →
`api:4000`, `*.volumetrixpa.com` → `web:3000` (tenants).

**Decisión de TLS**: on-demand por subdominio (cada host emite su propio certificado individual la
primera vez que se ve, vía HTTP-01) en vez de un certificado wildcard real. Un wildcard
(`*.volumetrixpa.com`) requeriría DNS-01 challenge con credenciales de API de un proveedor DNS
(Cloudflare, Route53, etc.) que todavía no se eligió — queda como optimización posterior. On-demand TLS
solo necesita el registro DNS wildcard (`*.volumetrixpa.com → IP del servidor`), sin API keys de
terceros.

**Hallazgo de seguridad real, corregido en el camino**: la primera versión de `on_demand_tls` no tenía
`ask` configurado apuntando a nada útil (apuntaba a `/health`, que siempre responde 200 sin importar el
dominio pedido). Sin un `ask` que valide de verdad, on-demand TLS emitiría un certificado para
**cualquier** hostname que alguien apunte a la IP del servidor — abuso / agotamiento de rate limits de
Let's Encrypt. Se agregó `GET /tenants/validar-dominio` (`TenantsController` + `TenantsService.
validarDominioParaTls`) que solo autoriza los hosts fijos de la plataforma o un subdominio cuyo slug sea
un tenant activo real (reutiliza `auth_get_tenant_by_slug`, la misma función SQL que ya usa
`findPublicBySlug`). Verificado con curl: dominio ajeno → 403, slug de tenant real (`qa-test`) → 200,
host fijo → 200, sin parámetro → 403.

## 4. `docker-compose.production.yml`

Servicios `postgres`/`redis`/`pgbouncer`/`api`/`web`/`caddy`, healthchecks en todos, sin secretos
hardcodeados (`env_file: .env.production`, plantilla en `.env.production.example`).

**Nombre de proyecto y `container_name` con prefijo `volumetrix_prod_*` explícito** — hallazgo real
durante la verificación: la primera versión usaba los mismos nombres que
`infrastructure/docker-compose.yml` (dev). Al levantar el compose de producción en esta misma máquina
para probarlo, Docker **recreó el contenedor `volumetrix_postgres` de dev** (un `container_name` es
global, no se scopea por proyecto Compose) — apuntándolo a un volumen nuevo y vacío en vez del volumen
real de dev con los 5 tenants de prueba. Los datos de dev no se perdieron (el volumen viejo
`infrastructure_postgres_data` seguía intacto, solo quedó desconectado del contenedor), pero fue una
llamada de atención real sobre por qué el nombre de proyecto (`name: volumetrix-production`) y el
prefijo `_prod` en cada `container_name` no son cosméticos — sin ellos, correr dev + producción en la
misma máquina es directamente destructivo. Se corrigió y se re-verificó: dev y producción coexisten sin
colisión, datos de dev confirmados intactos.

`GET /health` (nuevo, `AppController`) — sin tocar la base de datos, usado por el healthcheck de Docker/
Caddy y por cualquier servicio externo de monitoreo de disponibilidad que se elija después.

**Verificado**: `docker compose config` valida sintaxis; `postgres`/`redis`/`pgbouncer` levantan
`healthy` localmente.

## 5. PgBouncer — verificación empírica, no solo teórica

`docs/plan.md` ya exigía verificar que `drizzle-orm/node-postgres` no rompe con prepared statements con
nombre bajo `pool_mode=transaction` antes de activar PgBouncer. En vez de solo documentar la teoría, se
reutilizó la suite de integration tests real ya existente (`apps/api/test/integration/`: RLS,
idempotencia, comisiones) corriéndola **a través de PgBouncer** en vez de directo a Postgres.

Mecanismo: un servicio `pgbouncer` nuevo detrás de un profile Docker Compose
(`docker compose --profile pgbouncer-test up -d pgbouncer`, en `infrastructure/docker-compose.yml`, no
en producción — no arranca con `docker compose up` normal) apuntando al mismo Postgres de dev que ya
tiene `volumetrix_test` bootstrapeado. Se parametrizó el puerto de conexión de
`apps/api/test/integration/setup/test-db.ts` (`TEST_DB_PORT`, default `5432`) y se agregó el script
`npm run test:integration:pgbouncer` (`apps/api/package.json`).

**Dos hallazgos reales de configuración en el camino** (ninguno relacionado a drizzle, ambos de
PgBouncer/Postgres):
1. La imagen `edoburu/pgbouncer` escucha por defecto en el puerto **5432** (no 6432, el convencional) —
   hay que fijar `LISTEN_PORT=6432` explícito o el healthcheck/conexión apunta al puerto equivocado.
2. La auto-configuración de la imagen vía una sola `DATABASE_URL` solo conoce **un** usuario. Los tests
   conectan con dos roles reales distintos (`postgres` superusuario para fixtures vía `superDb`,
   `app_user` para el código bajo prueba vía `appDb`) — con `auth_type=trust` o `plain` fallaba
   `"server login failed: wrong password type"` específicamente para el segundo rol. Se resolvió
   montando un `pgbouncer.ini`/`userlist.txt` explícitos (`infrastructure/pgbouncer-test/`) con
   `auth_type=scram-sha-256` y ambas credenciales — las mismas contraseñas de siempre en local
   (`password`/`app_password`, ya documentadas en texto plano en `CLAUDE.md`), no un secreto nuevo.

**Resultado**: `npm run test:integration:pgbouncer` → **13/13 tests en verde**, idéntico a la corrida
directa contra Postgres. Evidencia empírica real de compatibilidad. La producción no necesita este
segundo rol (`apps/api` solo se conecta como `app_user` en operación normal) — el `pgbouncer` de
`docker-compose.production.yml` usa la auto-configuración de un solo usuario sin problema.

## 6. CI/CD: `.github/workflows/ci.yml`

Dos jobs paralelos, en cada PR y push a `master` (hoy no hay ramas de feature — cubre el flujo actual sin
forzar un cambio de proceso):

- **`api`**: `tsc --noEmit` + `npm run test:integration` (las 3 suites reales), levantando
  `infrastructure/docker-compose.yml` (el de dev) tal cual — `bootstrap-test-db.sh` depende del nombre
  de contenedor explícito `volumetrix_postgres`, que el `services:` nativo de GitHub Actions no
  preserva (genera un nombre propio), así que se reutiliza el compose real en vez de reinventar uno.
- **`web`**: `tsc --noEmit` + `npm test` (Vitest).

**`npm test` (jest unitario) de `apps/api` queda fuera de CI a propósito**: 12/13 de los `*.spec.ts`
boilerplate de `nest generate` están rotos hoy (deuda ya documentada, diferida a Fase 3 en
`docs/plan.md`). Incluirlo dejaría el pipeline rojo desde el primer PR, lo cual entrena a ignorar CI en
vez de confiar en él.

Verificado reproduciendo los mismos pasos del workflow a mano en local (checkout limpio simulado con
`npm ci`, `tsc`, levantar el compose, correr los tests) antes de commitear.

## 7. Explícitamente fuera de esta pasada, con placeholders

- **Staging real**: `infrastructure/docker-compose.staging.yml` (copia de producción, prefijo
  `volumetrix_staging_*`, puertos Caddy `8080`/`8443` para poder correr junto a producción en la misma
  máquina) + `infrastructure/staging/Caddyfile` + `.env.staging.example`. Sin datos reales — no hay
  servidor de staging todavía. **Nota dejada en el propio Caddyfile de staging**: `TenantsService.
  HOSTS_FIJOS` no reconoce `staging.volumetrixpa.com` como host fijo (solo reconoce los de
  producción) — los subdominios de *tenant* en staging sí validan bien (la validación es por slug, no
  por dominio completo), pero el dominio raíz/www/api de staging necesitaría agregarse a `HOSTS_FIJOS`
  antes de depender de esto en un servidor real. No se agregó ahora porque el esquema de subdominios de
  staging no está decidido todavía.
- **Backups**: `scripts/backup-postgres.sh`, snapshot manual vía `pg_dump` (no PITR real — eso requiere
  WAL archiving continuo + storage S3-compatible, un paso siguiente aparte una vez haya destino
  elegido), parametrizable 100% por env vars (`PG_CONTAINER`, `PG_USER`, `PG_DATABASE`,
  `BACKUP_DESTINATION`, todas requeridas sin default). No está enganchado a ningún cron real. Verificado
  corriéndolo contra el Postgres de dev (dump real de 20K generado correctamente).
- **Monitoreo**: `GET /health` (punto 4) es el único requisito técnico común a cualquier proveedor
  externo (UptimeRobot, Better Uptime, etc.) — no se eligió proveedor ni se configuró ninguna alerta.

## Verificación consolidada

| Pieza | Cómo se verificó |
|---|---|
| Dockerfiles (`apps/api`, `apps/web`) | `docker build` de ambos, exitoso |
| `proxy.ts` | Navegador real: `qa-test.localhost:3000/reservar` y `/admin/login` resuelven al tenant; dominio raíz sin reescribir |
| CORS | 8 casos de regex verificados (típosquatting y http rechazados, subdominio de tenant aceptado) |
| Caddy `ask` (on-demand TLS) | curl: dominio ajeno → 403, tenant real → 200, host fijo → 200, sin parámetro → 403 |
| `docker-compose.production.yml` | `docker compose config` válido; `postgres`/`redis`/`pgbouncer` healthy localmente; sin colisión con dev (datos de 5 tenants confirmados intactos) |
| PgBouncer | `npm run test:integration:pgbouncer` → 13/13 tests reales en verde |
| CI | Pipeline reproducido a mano en local antes de commitear |
| Staging/backup | `docker compose config` válido; script de backup verificado contra Postgres de dev |
| `tsc --noEmit` | Limpio en `apps/api` y `apps/web` después de cada cambio |
