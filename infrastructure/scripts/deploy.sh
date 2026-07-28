#!/usr/bin/env bash
# Automatiza el deploy de Volumetrix en un servidor nuevo (Ubuntu/Debian),
# codificando la secuencia real que se hizo a mano la primera vez que se
# desplego un entorno real (ver docs/02-arquitectura-y-db/
# Plan_Fase4_Infraestructura.md, seccion 8): instalar Docker, generar
# .env.<entorno> con secretos aleatorios, build + up de docker compose, y
# aplicar migraciones solo la primera vez (DB vacia). Correr de nuevo el
# script en un servidor ya desplegado es seguro: no pisa el .env existente
# ni re-aplica migraciones si la DB ya tiene tablas.
#
# Uso: ./deploy.sh <production|staging> <dominio>
# Ejemplo: ./deploy.sh production midominio.com
#
# Debe correrse DENTRO del servidor destino, con el repo ya clonado, parado
# en cualquier directorio (se auto-ubica en infrastructure/). Asume un
# usuario con sudo sin password (el default en AMIs/imagenes de Ubuntu de
# la mayoria de proveedores de nube) para instalar Docker si falta.
#
# Lo que este script NO puede automatizar, porque depende del proveedor de
# DNS/nube de cada quien, no del servidor mismo:
#   1. Apuntar el DNS del dominio a la IP publica de este servidor.
#   2. Abrir los puertos 80 y 443 en el firewall / security group.
# Al final imprime instrucciones concretas para ambos.
set -euo pipefail

ENTORNO="${1:-}"
DOMINIO="${2:-}"

if [[ "$ENTORNO" != "production" && "$ENTORNO" != "staging" ]]; then
  echo "Uso: $0 <production|staging> <dominio>" >&2
  echo "Ejemplo: $0 production midominio.com" >&2
  exit 1
fi
if [[ -z "$DOMINIO" ]]; then
  echo "Falta el dominio. Uso: $0 <production|staging> <dominio>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$INFRA_DIR"

ENV_FILE=".env.${ENTORNO}"
ENV_EXAMPLE=".env.${ENTORNO}.example"
COMPOSE_ARGS=(-f "docker-compose.${ENTORNO}.yml")

if [[ "$ENTORNO" == "production" ]]; then
  PG_CONTAINER="volumetrix_prod_postgres"
else
  PG_CONTAINER="volumetrix_staging_postgres"
  # El compose de staging expone Caddy en 8080/8443 a proposito (para poder
  # convivir con un deploy de produccion en la misma maquina). Un servidor
  # de staging standalone SI necesita 80/443 reales -- Let's Encrypt solo
  # valida el challenge HTTP-01 en el puerto 80 estandar, no en 8080. Se
  # genera este override una sola vez si no existe (mismo patron usado en
  # el deploy real de staging, ver Plan_Fase4_Infraestructura.md seccion 8).
  OVERRIDE_FILE="docker-compose.staging.override.yml"
  if [[ ! -f "$OVERRIDE_FILE" ]]; then
    echo "==> Generando $OVERRIDE_FILE (remapea Caddy a los puertos 80/443 estandar)..."
    cat > "$OVERRIDE_FILE" <<'YAML'
services:
  caddy:
    ports:
      - "80:80"
      - "443:443"
YAML
  fi
  COMPOSE_ARGS+=(-f "$OVERRIDE_FILE")
fi

echo "==> Volumetrix deploy — entorno: $ENTORNO, dominio: $DOMINIO"

# --- 1. Docker + plugin compose ---
if ! command -v docker &>/dev/null; then
  echo "==> Docker no encontrado, instalando (script oficial get.docker.com)..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "==> Docker instalado. Si esta es la primera vez que este usuario entra al"
  echo "    grupo 'docker', puede hacer falta cerrar sesion SSH y volver a entrar"
  echo "    antes de que 'docker' funcione sin sudo. Si el siguiente paso falla"
  echo "    por permisos, reconecta y volve a correr este mismo script."
else
  echo "==> Docker ya esta instalado ($(docker --version))."
fi

if ! docker compose version &>/dev/null; then
  echo "ERROR: 'docker compose' (plugin v2) no esta disponible incluso despues de" >&2
  echo "       instalar Docker. Instalalo a mano (paquete docker-compose-plugin)" >&2
  echo "       y volve a correr este script." >&2
  exit 1
fi

# --- 2. .env.<entorno>: generar una sola vez, con secretos aleatorios ---
if [[ -f "$ENV_FILE" ]]; then
  echo "==> $ENV_FILE ya existe, no se toca (los secretos se generan una sola vez)."
else
  echo "==> Generando $ENV_FILE desde $ENV_EXAMPLE con secretos aleatorios..."
  [[ -f "$ENV_EXAMPLE" ]] || { echo "ERROR: no existe $ENV_EXAMPLE" >&2; exit 1; }

  POSTGRES_PW="$(openssl rand -hex 24)"
  APP_USER_PW="$(openssl rand -hex 24)"
  JWT_SECRET="$(openssl rand -hex 32)"
  APP_SECRET="$(openssl rand -hex 32)"
  MFA_SECRET="$(openssl rand -hex 32)"
  if [[ "$ENTORNO" == "production" ]]; then
    DB_HOST_PUERTO="pgbouncer:6432"
  else
    DB_HOST_PUERTO="postgres:5432"
  fi

  cp "$ENV_EXAMPLE" "$ENV_FILE"
  sed -i \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PW}|" \
    -e "s|^APP_USER_PASSWORD=.*|APP_USER_PASSWORD=${APP_USER_PW}|" \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" \
    -e "s|^APP_SECRET=.*|APP_SECRET=${APP_SECRET}|" \
    -e "s|^MFA_SECRET_KEY=.*|MFA_SECRET_KEY=${MFA_SECRET}|" \
    -e "s|^APP_DOMAIN=.*|APP_DOMAIN=${DOMINIO}|" \
    -e "s|^WEB_URL=.*|WEB_URL=https://${DOMINIO}|" \
    -e "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://app_user:${APP_USER_PW}@${DB_HOST_PUERTO}/volumetrix|" \
    "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "==> $ENV_FILE generado. EVOLUTION_API_KEY quedo con el placeholder CAMBIAR_ESTO:"
  echo "    completalo a mano si vas a usar WhatsApp (ver docs/03-integraciones/WhatsApp_Evolution_API.md)."
fi

# --- 3. Build + up ---
echo "==> Construyendo imagenes..."
docker compose --env-file "$ENV_FILE" "${COMPOSE_ARGS[@]}" build

echo "==> Levantando servicios..."
docker compose --env-file "$ENV_FILE" "${COMPOSE_ARGS[@]}" up -d

# --- 4. Esperar a que Postgres este sano ---
echo "==> Esperando a que Postgres este healthy ($PG_CONTAINER)..."
STATUS="starting"
for _ in $(seq 1 30); do
  STATUS="$(docker inspect --format='{{.State.Health.Status}}' "$PG_CONTAINER" 2>/dev/null || echo "starting")"
  [[ "$STATUS" == "healthy" ]] && break
  sleep 2
done
if [[ "$STATUS" != "healthy" ]]; then
  echo "ERROR: Postgres no llego a healthy. Revisa 'docker compose ${COMPOSE_ARGS[*]} logs postgres'." >&2
  exit 1
fi

# --- 5. Migraciones, solo si la DB esta vacia (primer deploy real) ---
DB_NAME="$(grep '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2)"
DB_NAME="${DB_NAME:-volumetrix}"
TABLE_COUNT="$(docker exec -i "$PG_CONTAINER" psql -U postgres -d "$DB_NAME" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"

if [[ "${TABLE_COUNT:-0}" -eq 0 ]]; then
  echo "==> DB vacia, aplicando migraciones..."
  CONTAINER="$PG_CONTAINER" DB="$DB_NAME" "$SCRIPT_DIR/apply-migrations.sh"
else
  echo "==> DB ya tiene $TABLE_COUNT tablas, se omiten migraciones (no es el primer deploy)."
fi

# --- 6. Resumen final ---
SERVER_IP="$(curl -fsS --max-time 3 https://ifconfig.me 2>/dev/null || echo "<no se pudo detectar, usa la IP publica de este servidor>")"

echo ""
echo "======================================================================"
echo " Deploy de $ENTORNO listo. Faltan 2 pasos MANUALES fuera de este script:"
echo "======================================================================"
echo ""
echo "1) DNS — crea estos registros A apuntando a $SERVER_IP:"
if [[ "$ENTORNO" == "production" ]]; then
  echo "     $DOMINIO"
  echo "     www.$DOMINIO"
  echo "     api.$DOMINIO"
  echo "     *.$DOMINIO   (wildcard — un subdominio por negocio/tenant)"
else
  echo "     $DOMINIO   (staging usa un solo host, ruteo interno por path)"
fi
echo ""
echo "2) Firewall / Security Group — abre los puertos 80 y 443 (0.0.0.0/0)"
echo "   hacia este servidor. Sin esto, Caddy no puede completar el desafio"
echo "   HTTP-01 de Let's Encrypt y nunca emite el certificado TLS."
echo ""
echo "Una vez hecho eso (la propagacion de DNS puede tardar unos minutos),"
echo "verifica con:"
if [[ "$ENTORNO" == "production" ]]; then
  echo "   curl -sI https://$DOMINIO/"
  echo "   curl https://api.$DOMINIO/health"
else
  echo "   curl -sI https://$DOMINIO/"
  echo "   curl https://$DOMINIO/api/health"
fi
echo ""
echo "Primer login: entra a https://$DOMINIO/super-admin — el wizard de"
echo "instalacion inicial pide crear el usuario SuperAdmin (paso 1 de 3, con"
echo "TOTP). No hay ningun usuario ni contraseña precargada."
echo "======================================================================"
