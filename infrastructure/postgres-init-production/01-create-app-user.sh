#!/bin/sh
# Provisiona el rol de aplicacion `app_user` en un Postgres de produccion/staging
# nuevo (volumen vacio) — mismo mecanismo que infrastructure/postgres-init/ para
# dev/CI, pero con la password real tomada de una env var en vez de hardcodeada,
# porque este directorio se monta contra Postgres reales, no descartables.
#
# Por que hace falta un rol separado del owner: POSTGRES_USER (arriba, en
# docker-compose.production.yml / docker-compose.staging.yml) es el usuario que
# la imagen oficial de Postgres crea como SUPERUSUARIO al inicializar el volumen
# — un superusuario hace bypass de RLS sin importar NOBYPASSRLS (ver postgres
# docs: "row security is not applied" para superusuarios). Antes de este script,
# POSTGRES_USER estaba seteado directo a `app_user` en los .env.*.example, lo que
# habria dejado RLS sin efecto en cualquier despliegue real — contradice el
# diseno documentado en apps/api/src/database/migrations/0001_rls_policies.sql.
# Con este script, POSTGRES_USER pasa a ser un rol "owner" separado (usado solo
# para aplicar migraciones a mano, nunca por la app en runtime) y `app_user`
# (no-superusuario, NOBYPASSRLS) es el unico rol que usa la app — via PgBouncer
# en produccion, directo en staging.
#
# Falla fuerte (exit 1) si falta la password, en vez de caer a un default
# conocido — un Postgres real sin app_user provisionado correctamente debe
# fallar el arranque, no arrancar silenciosamente inseguro.
set -eu

if [ -z "${APP_USER_PASSWORD:-}" ]; then
  echo "ERROR: APP_USER_PASSWORD no esta seteada en el entorno — no se puede" >&2
  echo "       provisionar el rol app_user. Definila en .env.production / .env.staging" >&2
  echo "       antes de levantar este stack." >&2
  exit 1
fi

# Chequeo de idempotencia hecho aparte (no en un DO $$ ... $$) a proposito: la
# interpolacion de variables de psql (:'var') no se sustituye dentro de bloques
# dollar-quoted, así que ':'app_user_password'' le llegaria literal al parser
# de SQL del servidor y rompe con "syntax error at or near ':'".
ROLE_EXISTS=$(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -tAc "SELECT 1 FROM pg_roles WHERE rolname = 'app_user'")

if [ -z "$ROLE_EXISTS" ]; then
  # Comillas simples de la password escapadas al estilo SQL (' -> ''). El heredoc
  # no lleva el delimitador entre comillas a proposito, para que el shell
  # expanda $ESCAPED_PASSWORD (sin word-splitting/globbing, igual que dentro de
  # comillas dobles) antes de que psql reciba el SQL.
  ESCAPED_PASSWORD=$(printf '%s' "$APP_USER_PASSWORD" | sed "s/'/''/g")
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
CREATE ROLE app_user LOGIN PASSWORD '$ESCAPED_PASSWORD' NOSUPERUSER NOBYPASSRLS;
EOSQL
fi
