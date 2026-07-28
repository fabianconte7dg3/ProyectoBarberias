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

### 1.1 Corrección post-Fase 4 (encontrada durante Fase 6.4): rewrite no era idempotente

La verificación original de esta fase solo probó `reservar` y `admin/login` — ninguna de las dos hace
`router.push`/`<Link>` a una ruta ya prefijada con el slug del tenant. El panel de administración
completo sí lo hace todo el tiempo (`AdminHeader` arma cada link de navegación como
`/${tenantSlug}/admin/...`, igual que `admin/login` al redirigir tras el login y `useAdminAuth` al
redirigir por rol incorrecto). Bajo un subdominio de tenant, cualquiera de esas navegaciones producía un
segundo paso por el proxy que **volvía a anteponer el slug** (`/qa-test/qa-test/admin/agenda`) → 404. En
la práctica, el panel de administración era inutilizable por subdominio en cuanto el usuario hacía clic
en cualquier link interno — el bug no era visible en la verificación original porque esta nunca navegó
dentro del panel ya logueado.

Corregido en `proxy.ts`: si el `pathname` ya empieza con `/${slug}`, no se reescribe (se deja pasar tal
cual). Idempotente — soporta que el rewrite se aplique más de una vez sobre el mismo path sin duplicar el
prefijo.

### 1.2 Riesgo abierto, no resuelto: cookie `jwt` (SameSite=Lax) entre subdominio de tenant y `api`

Durante la misma verificación, autenticar contra `qa-test.localhost:3000` (subdominio) y llamar a la API
en `localhost:4000` resultó en que la cookie `jwt` no viajaba en el fetch subsiguiente — consistente con
que `qa-test.localhost` y `localhost` son *sitios* distintos para el algoritmo `SameSite` (hostnames
distintos), mientras que `localhost:3000`/`localhost:4000` sí son el mismo sitio (mismo hostname, solo
difiere el puerto, y `SameSite` no distingue puertos). En producción esto no debería repetirse —
`barberia-jose.volumetrixpa.com` y `api.volumetrixpa.com` comparten el mismo eTLD+1
(`volumetrixpa.com`), que es el criterio real de "mismo sitio" — pero **esto es un razonamiento, no algo
verificado contra un dominio real**. Antes de depender de subdominios en producción, confirmar contra
`volumetrixpa.com` de verdad (o un dominio de staging con el mismo patrón) que la cookie de sesión viaja
correctamente entre `<tenant>.volumetrixpa.com` y `api.volumetrixpa.com`.

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

## 7. Explícitamente fuera de esta pasada, con placeholders (histórico — ver §8, ya ejecutado)

- **Staging real**: `infrastructure/docker-compose.staging.yml` (copia de producción, prefijo
  `volumetrix_staging_*`, puertos Caddy `8080`/`8443` para poder correr junto a producción en la misma
  máquina) + `infrastructure/staging/Caddyfile` + `.env.staging.example`. Sin datos reales — no hay
  servidor de staging todavía. **Nota dejada en el propio Caddyfile de staging**: `TenantsService.
  HOSTS_FIJOS` no reconoce `staging.volumetrixpa.com` como host fijo (solo reconoce los de
  producción) — los subdominios de *tenant* en staging sí validan bien (la validación es por slug, no
  por dominio completo), pero el dominio raíz/www/api de staging necesitaría agregarse a `HOSTS_FIJOS`
  antes de depender de esto en un servidor real. No se agregó ahora porque el esquema de subdominios de
  staging no está decidido todavía.

## 8. Staging real desplegado por primera vez (2026-07-28)

Deploy real contra una EC2 de AWS (Ubuntu 26.04, provista por el usuario) con un dominio propio del
usuario vía DDNS gratuito apuntando a la IP de la instancia — dominio real omitido a propósito de este
documento (público en GitHub), la variable relevante es `APP_DOMAIN` en `.env.staging` (no versionado).

### Decisión: ruteo por path en vez de subdominio

El plan gratuito de DDNS usado no permite wildcard (`*.dominio`) ni crear más de un hostname —
imposibilita el esquema `api.<dominio>` + `*.<dominio>` que usa producción. Como el frontend ya resuelve
cualquier tenant por **ruta** (`/<slug>/...`, no necesita que el subdominio SEA el slug — ver
`apps/web/src/proxy.ts`), un único hostname alcanza ruteando por path en Caddy:
`{$APP_DOMAIN}/api/*` → `api:4000` (con `handle_path`, que saca el prefijo `/api` antes de proxyear),
todo lo demás → `web:3000`. Frontend y backend quedan en el mismo origen — de yapa, elimina cualquier
fricción de CORS (nunca hay petición realmente cross-origin que gatear).

Esto reemplaza el Caddyfile de staging viejo (wildcard + on-demand TLS + `HOSTS_FIJOS`, nunca desplegado)
por uno con automatic HTTPS normal (dominio único conocido de antemano, no hace falta el endpoint `ask` de
validación que sí necesita producción para su wildcard de tenants).

**3 archivos parametrizados por `NEXT_PUBLIC_ROOT_HOST`** (antes hardcodeaban `volumetrixpa.com`/
`localhost`), para que un dominio de staging cualquiera pueda usarse sin tocar código:
`apps/web/src/proxy.ts`, `apps/web/src/lib/tenant-url.ts` (arma URLs de tenant por path en vez de
subdominio cuando el host es el root host de staging), `apps/web/Dockerfile` (nuevo build arg).
`docker-compose.staging.yml` deriva `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_ROOT_HOST` directo de `APP_DOMAIN`
(ya existía en `.env.staging.example`) — cero hardcode de dominio en ningún archivo versionado.

### Migraciones: secuencia real extraída a script reusable

`apps/api/test/integration/bootstrap-test-db.sh` era, hasta ahora, el único lugar con la secuencia
correcta de migraciones + correcciones de drift (ver CLAUDE.md — varias tablas/columnas de la DB real no
las crea ningún archivo de migración). Aplicar `migrations/*.sql` en orden numérico simple sobre una DB
nueva NO reproduce un schema correcto. Se extrajo esa secuencia a
`infrastructure/scripts/apply-migrations.sh` (parametrizado por `CONTAINER`/`DB` vía env vars, no borra
ni crea la DB — solo la puebla), reusado tanto por `bootstrap-test-db.sh` (ahora un wrapper delgado que
solo hace el DROP/CREATE de la DB descartable) como por este deploy de staging. Primera vez que esta
secuencia corre fuera de la DB descartable de tests — funcionó limpio contra una DB de staging real desde
cero. Verificado que el refactor no rompió nada: `test:integration` 13/13 en verde antes de tocar la EC2.

### 2 bugs reales encontrados desplegando por primera vez (no hipotéticos — nunca se había desplegado)

1. **`web` nunca pasaba su propio healthcheck.** Next.js standalone (`server.js` generado por
   `output: 'standalone'`) hace bind literal al valor de `process.env.HOSTNAME` si está seteado — y
   Docker **siempre** setea `HOSTNAME=<id_del_contenedor>` en cada contenedor por defecto. El servidor
   terminaba escuchando solo en la IP interna del contenedor en la red de Docker, nunca en `127.0.0.1` ni
   `0.0.0.0` — ni el propio healthcheck (`wget http://localhost:3000/`, corriendo *dentro* del mismo
   contenedor) podía conectarse. Afecta también a `docker-compose.production.yml` (nunca antes
   desplegado, mismo Dockerfile). **Corregido**: `ENV HOSTNAME="0.0.0.0"` explícito en el stage `runner`
   de `apps/web/Dockerfile`, forzando bind a todas las interfaces.
2. **El healthcheck de `web`, aun con el bind corregido, seguía fallando con `localhost`.** `localhost`
   resuelve a `::1` (IPv6) antes que a `127.0.0.1` en `/etc/hosts` del contenedor Alpine, y el `wget` de
   BusyBox no cae a IPv4 si la conexión IPv6 es rechazada (el servidor solo escucha IPv4 tras el fix
   anterior) — nunca llegaba a conectar. Y conectando por IP literal (`127.0.0.1`) sin más, `proxy.ts`
   interpretaba el host `127.0.0.1` como si fuera un slug de tenant (no está en `ROOT_HOSTS`) y devolvía
   404. **Corregido** en ambos `docker-compose.staging.yml` y `docker-compose.production.yml`:
   `wget -qO- --header='Host: localhost' http://127.0.0.1:3000/ || exit 1` — IP explícita (evita la
   ambigüedad IPv6) + header `Host` explícito (satisface el chequeo de `ROOT_HOSTS`, que sí reconoce
   `"localhost"` sin importar el dominio real).

### Otros hallazgos operativos (no bugs de código, config del entorno)

- El volumen raíz por defecto de la instancia era de 8GB (4.6GB libres) — insuficiente con margen para
  Docker + Postgres + Redis + las imágenes de build. Se agrandó a 30GB vía AWS Console (`Modify Volume`,
  en caliente) + `growpart`/`resize2fs` desde SSH, sin reiniciar la instancia.
- El Security Group de la instancia solo tenía el puerto 22 abierto — hubo que agregar reglas de entrada
  para 80 y 443 (0.0.0.0/0) antes de que Let's Encrypt pudiera validar el dominio (el primer intento de
  Caddy falló con `Timeout during connect (likely firewall problem)`; reintentó y emitió el certificado
  correctamente en cuanto los puertos quedaron abiertos).
- `apt-get update` inicial tardó varios minutos (instancia con crédito de CPU/red limitado en su primer
  arranque) — lento pero no colgado, sin contención de lock de dpkg.

### Verificación

`curl -sI https://<dominio>/` → `HTTP/2 200` con TLS real emitido por Let's Encrypt; `/api/health` →
`{"status":"ok"}` a través del ruteo por path; `/api/super-admin/setup/status` → `{"necesitaSetup":true}`
(confirma en un deploy 100% real que el fix de seguridad del wizard — ver entrada de Fase 4 en
`docs/plan.md` sobre el backdoor de `superadmin@barberos.app` — funciona de punta a punta, no solo
localmente); navegador real contra `/super-admin` redirige correctamente a `/super-admin/setup` con la
plataforma recién instalada, sin ningún superadmin creado.
- **Backups**: `scripts/backup-postgres.sh`, snapshot manual vía `pg_dump` (no PITR real — eso requiere
  WAL archiving continuo + storage S3-compatible, un paso siguiente aparte una vez haya destino
  elegido), parametrizable 100% por env vars (`PG_CONTAINER`, `PG_USER`, `PG_DATABASE`,
  `BACKUP_DESTINATION`, todas requeridas sin default). No está enganchado a ningún cron real. Verificado
  corriéndolo contra el Postgres de dev (dump real de 20K generado correctamente).
- **Monitoreo**: `GET /health` (punto 4) es el único requisito técnico común a cualquier proveedor
  externo (UptimeRobot, Better Uptime, etc.) — no se eligió proveedor ni se configuró ninguna alerta.

## 9. Deploy parametrizado por dominio + script `deploy.sh` (2026-07-27)

**Motivación**: después de desplegar el staging real (§8) a mano — SSH, resize de disco, `.env.staging`
armado a mano, secretos generados uno por uno, `docker compose up`, aplicar migraciones — surgió la
pregunta de si ese proceso se puede agilizar para compartir el proyecto con un tercero que tiene su
propio dominio real. La respuesta: sí, la mayor parte era mecánica y repetible; lo único no automatizable
es lo que depende del proveedor de DNS/nube de cada quien (no del servidor), así que se separó
explícitamente qué automatiza el script y qué instrucciones imprime para que el usuario las haga a mano.

**Bug latente encontrado al generalizar**: `docker-compose.production.yml` tenía
`NEXT_PUBLIC_API_URL: https://api.volumetrixpa.com` **hardcodeado** como build arg (a diferencia de
`docker-compose.staging.yml`, que ya usaba `${APP_DOMAIN}` desde §8) — nadie lo había notado porque nunca
se intentó un deploy de producción real con otro dominio. Mismo problema en 3 lugares más:
`apps/api/src/main.ts` (`PROD_ORIGIN_REGEX` hardcodeaba `volumetrixpa.com` en el regex de CORS),
`apps/api/src/tenants/tenants.service.ts` (`HOSTS_FIJOS`, la lista de hosts válidos para el `ask` de
on-demand TLS) e `infrastructure/production/Caddyfile` (los 3 bloques de host hardcodeaban
`volumetrixpa.com`). Los cuatro se parametrizaron con `APP_DOMAIN` (env var ya existente en
`.env.production.example`/`.env.staging.example`, ahora efectivamente usada en todos los puntos que
antes asumían el dominio de producción real de Volumetrix):

- `main.ts`: el regex de CORS se construye en runtime desde `process.env.APP_DOMAIN` (default
  `volumetrixpa.com` para no romper el deploy real existente si algún día corre sin la env var seteada),
  escapando los metacaracteres del dominio antes de interpolarlo en el `RegExp`.
- `tenants.service.ts`: `HOSTS_FIJOS` pasó de `Set` literal a un `Set` calculado una vez desde
  `process.env.APP_DOMAIN` (mismo default).
- `production/Caddyfile`: los 3 bloques de host (`volumetrixpa.com, www.volumetrixpa.com` /
  `api.volumetrixpa.com` / `*.volumetrixpa.com`) pasaron a `{$APP_DOMAIN}` (interpolación nativa de
  Caddy, mismo patrón que ya se usaba en `staging/Caddyfile` desde §8).
- `docker-compose.production.yml`: `NEXT_PUBLIC_API_URL` pasó a `https://api.${APP_DOMAIN}`, se agregó
  `NEXT_PUBLIC_ROOT_HOST: ${APP_DOMAIN}` como build arg de `web` (antes solo lo tenía `staging`) y se
  agregó `env_file: - .env.production` al servicio `caddy` (necesario para que `{$APP_DOMAIN}` se
  resuelva en runtime dentro del container — mismo fix que ya tenía `staging` desde §8).

No se tocó `proxy.ts`/`tenant-url.ts`: ya leían `NEXT_PUBLIC_ROOT_HOST` desde §8 y ese mecanismo
generaliza sin cambios a un dominio de producción real con DNS wildcard — `buildTenantPublicUrl` solo se
llama desde dentro del panel de admin (`AdminSidebar`, `InviteEmpleadoModal`), nunca parado en el dominio
raíz, así que la rama de URL "por path" que agrega `NEXT_PUBLIC_ROOT_HOST` (pensada para el staging sin
wildcard DNS de §8) nunca se dispara en un deploy de producción con subdominio real — no había ambigüedad
real que resolver ahí, solo en los 4 puntos de arriba.

**`infrastructure/scripts/deploy.sh`** (nuevo): codifica la secuencia probada de §8 en un script
idempotente. Uso: `./deploy.sh <production|staging> <dominio>`, corrido dentro del servidor destino con
el repo ya clonado. Automatiza:
1. Instalar Docker (script oficial `get.docker.com`) si no está — se salta si ya existe.
2. Generar `.env.<entorno>` desde el `.example` correspondiente **solo si no existe ya** (no pisa
   secretos en redeploys), con `POSTGRES_PASSWORD`/`APP_USER_PASSWORD`/`JWT_SECRET`/`APP_SECRET`/
   `MFA_SECRET_KEY` generados con `openssl rand -hex`, `APP_DOMAIN`/`WEB_URL`/`DATABASE_URL` completados
   con el dominio pasado por argumento, y el archivo con `chmod 600`.
3. Para `staging`: generar `docker-compose.staging.override.yml` (remapea Caddy a 80/443 reales) si no
   existe — el compose base expone 8080/8443 a propósito para poder convivir con un `production` en la
   misma máquina, pero un staging standalone sí necesita 80/443 reales para que Let's Encrypt pueda
   validar el challenge HTTP-01 (mismo override que se armó a mano en §8).
4. `docker compose build` + `up -d`.
5. Esperar a que Postgres esté `healthy` (polling con timeout).
6. Aplicar migraciones vía `apply-migrations.sh` **solo si la base está vacía** (cuenta filas de
   `information_schema.tables`) — en un redeploy sobre una base ya poblada, se omite.
7. Imprimir un resumen con la IP pública detectada (`curl ifconfig.me`) y las 2 instrucciones que el
   script **no puede** ejecutar por sí mismo: qué registros DNS crear (root/www/api/wildcard en
   producción, un solo host en staging) y que hay que abrir los puertos 80/443 en el firewall/security
   group — más los comandos `curl` para verificar una vez hecho eso, y la URL del wizard de instalación
   inicial del SuperAdmin para el primer login.

**Alcance deliberadamente fuera de este script**: no gestiona DNS ni firewall por API (requeriría
credenciales de un proveedor específico — Route53, Cloudflare, el panel de cada nube — que varían por
usuario, exactamente el tipo de decisión externa que esta fase viene dejando explícita en vez de
adivinar). No re-genera secretos en un redeploy (evitaría invalidar sesiones/tokens existentes sin
querer). No corre en la instancia EC2 de staging ya desplegada en §8 — ese servidor ya tiene su
`.env.staging` y su `docker-compose.staging.override.yml` reales armados a mano; el script queda
disponible para el *próximo* deploy (staging o producción, propio o de un tercero), no se aplicó
retroactivamente sobre el que ya está corriendo.

### Verificación

- `npx tsc --noEmit` en `apps/api` — limpio tras los cambios en `main.ts`/`tenants.service.ts`.
- `bash -n deploy.sh` — sintaxis válida.
- `docker compose --env-file .env.production -f docker-compose.production.yml config` con un
  `.env.production` de prueba (dominio ficticio `midominio-prueba.com`, generado y borrado solo para la
  verificación, nunca commiteado) → `NEXT_PUBLIC_API_URL=https://api.midominio-prueba.com` y
  `NEXT_PUBLIC_ROOT_HOST=midominio-prueba.com` resueltos correctamente.
- `caddy validate` (imagen `caddy:2-alpine`, `APP_DOMAIN=midominio-prueba.com` como env var) contra
  `production/Caddyfile` → `Valid configuration`.

## 10. Bug real en staging: reserva pública fallaba con Internal Server Error (2026-07-28)

**Reportado por el usuario probando el staging real de punta a punta** (crear negocio → reservar como
cliente): el paso de confirmación de una reserva pública fallaba siempre con `Internal server error`.
Logs de `docker compose logs api` en la EC2 mostraron dos errores reales de Postgres, ambos el mismo
patrón de drift entre `schema.ts` y las migraciones versionadas que ya advierte `CLAUDE.md` — pero en
dos puntos nunca antes documentados, porque el Postgres local de desarrollo ya los tenía parcheados a
mano desde hace tiempo (por eso nunca se habían detectado: solo se manifiestan en una base nueva, como
`volumetrix_test` o un staging real recién levantado):

1. **`invalid input value for enum origen_cita: "web_publica"`** — `schema.ts` declara `'web_publica'`
   como valor válido de `origen_cita` desde que existe el flujo de reserva pública
   (`citas.controller.ts` `POST /citas/publica`), pero `0000_yummy_jubilee.sql` solo creó el enum con
   `('bot_whatsapp', 'walk_in', 'manual_admin')` y ninguna migración posterior agregó `'web_publica'`
   (`0016` solo agregó `'importacion_historica'`). Resultado: **toda reserva pública real fallaba** en
   cualquier base de datos nueva — el bug más serio de los dos, bloqueaba el flujo principal del
   producto.
2. **`permission denied for table alertas_seguridad`** — hallado en el camino, revisando los mismos
   logs: `0009_observabilidad_y_alertas.sql` crea la tabla `alertas_seguridad` pero nunca le otorga
   `GRANT` a `app_user` (solo otorga `GRANT EXECUTE` de una función relacionada). Resultado: el panel
   "Alertas de Seguridad" del dashboard de SuperAdmin fallaba silenciosamente en cualquier base nueva.

**Fix**: migración nueva
[`0022_corregir_drift_origen_cita_y_grant_alertas.sql`](../../apps/api/src/database/migrations/0022_corregir_drift_origen_cita_y_grant_alertas.sql)
(`ALTER TYPE origen_cita ADD VALUE IF NOT EXISTS 'web_publica'` + el `GRANT` faltante), agregada a
`infrastructure/scripts/apply-migrations.sh` en su lugar correspondiente en la secuencia (con el
candado de conteo de archivos actualizado a 26). Aplicada en los 3 lugares relevantes:
- Postgres local (`volumetrix`): no-op (`NOTICE: enum label "web_publica" already exists, skipping`) —
  confirma que ya estaba parcheado a mano, consistente con el resto de drift documentado.
- `volumetrix_test`: reconstruida desde cero con `bootstrap-test-db.sh` — la migración se aplicó limpia
  (sin el NOTICE, confirmando que reproduce el fix en una base realmente nueva) y
  `npm run test:integration` siguió en 13/13 verde.
- Staging real (EC2): aplicada directamente contra `volumetrix_staging_postgres` vía SSH — verificado con
  `enum_range(NULL::origen_cita)` y `\dp alertas_seguridad` que ambos fixes quedaron activos.

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
| Deploy parametrizado (§9) | `tsc --noEmit`; `docker compose config` con dominio de prueba; `caddy validate` del Caddyfile parametrizado; `bash -n deploy.sh` |
| Fix drift `origen_cita`/`alertas_seguridad` (§10) | `bootstrap-test-db.sh` desde cero + `test:integration` 13/13; aplicado y verificado en Postgres local, `volumetrix_test` y staging real (EC2) |
| `tsc --noEmit` | Limpio en `apps/api` y `apps/web` después de cada cambio |
