#!/usr/bin/env bash
#
# Backup manual de Postgres via pg_dump. NO esta enganchado a ningun cron
# real todavia — correrlo a mano hasta que exista un destino de backup
# decidido (ver docs/02-arquitectura-y-db/Plan_Fase4_Infraestructura.md,
# seccion Backups). No da Point-in-Time Recovery real (eso requiere WAL
# archiving continuo + storage S3-compatible, un paso siguiente aparte
# una vez haya destino elegido) — esto es solo un snapshot puntual.
#
# Variables de entorno esperadas (todas requeridas, sin defaults —
# preferible fallar ruidoso a escribir en el lugar equivocado):
#   PG_CONTAINER        nombre del contenedor Postgres (ej. volumetrix_prod_postgres)
#   PG_USER             usuario con permiso de leer todo (ej. postgres)
#   PG_DATABASE         base de datos a respaldar (ej. volumetrix)
#   BACKUP_DESTINATION  directorio donde escribir el .sql.gz
#
# Uso:
#   PG_CONTAINER=volumetrix_prod_postgres PG_USER=postgres \
#     PG_DATABASE=volumetrix BACKUP_DESTINATION=/ruta/a/backups \
#     ./scripts/backup-postgres.sh

set -euo pipefail

: "${PG_CONTAINER:?Falta PG_CONTAINER (nombre del contenedor Postgres)}"
: "${PG_USER:?Falta PG_USER}"
: "${PG_DATABASE:?Falta PG_DATABASE}"
: "${BACKUP_DESTINATION:?Falta BACKUP_DESTINATION (directorio de salida)}"

mkdir -p "$BACKUP_DESTINATION"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${BACKUP_DESTINATION}/${PG_DATABASE}_${TIMESTAMP}.sql.gz"

echo "==> Respaldando ${PG_DATABASE} desde ${PG_CONTAINER} -> ${OUT_FILE}"
docker exec -i "$PG_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DATABASE" --no-owner --no-privileges \
  | gzip > "$OUT_FILE"

echo "==> Listo: $(du -h "$OUT_FILE" | cut -f1)"
