#!/usr/bin/env bash
# Recrea volumetrix_test desde cero y reproduce las migraciones SQL reales en orden.
# Ver docs/02-arquitectura-y-db/Plan_Fase3_Suite_Tests.md — volumetrix_test es descartable,
# se puede correr este script cuantas veces haga falta (ej. después de agregar una migración nueva).
#
# La secuencia real de migraciones + correcciones de drift vive en
# infrastructure/scripts/apply-migrations.sh, reusada tal cual también para
# levantar staging/producción desde cero (ver Plan_Fase4_Infraestructura.md) —
# este script solo hace el DROP/CREATE de la DB descartable y delega el resto.
set -euo pipefail

CONTAINER="volumetrix_postgres"
DB="volumetrix_test"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Recreando base de datos $DB en $CONTAINER"
docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS $DB WITH (FORCE);"
docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE $DB;"

CONTAINER="$CONTAINER" DB="$DB" "$SCRIPT_DIR/../../../../infrastructure/scripts/apply-migrations.sh"
