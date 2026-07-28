#!/usr/bin/env bash
# Aplica el schema completo de Volumetrix contra una base de datos Postgres ya
# existente y vacia, reproduciendo el orden real de migraciones + las
# correcciones de drift documentadas en CLAUDE.md: 'productos'/'detalles_transaccion'
# y varias columnas existen en la DB real de produccion pero ningun archivo de
# migracion los crea/agrega -- se aplicaron a mano contra 'volumetrix' en algun
# momento. Aplicar los archivos de migrations/ en orden numerico simple NO
# reproduce un schema correcto (faltan tablas, hay columnas duplicadas que
# revientan, un ciclo de dependencia entre 0001/0003) -- esta es la unica
# secuencia probada que si lo hace, extraida de bootstrap-test-db.sh (que la
# usa igual contra la DB descartable de integration tests) para poder
# reusarla tambien al levantar una base de staging/produccion real desde cero.
#
# Uso: CONTAINER=<contenedor_postgres> DB=<nombre_db> ./apply-migrations.sh
# Requiere que la base de datos $DB ya exista (recien creada, ej. via
# POSTGRES_DB del propio contenedor) y este vacia -- este script no la crea
# ni la borra, a proposito: no queremos que un script reusable pueda hacer
# DROP DATABASE contra una base de staging/produccion real por error.
set -euo pipefail

: "${CONTAINER:?Falta CONTAINER (nombre del contenedor de postgres)}"
: "${DB:?Falta DB (nombre de la base de datos, debe existir y estar vacia)}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$(cd "$SCRIPT_DIR/../../apps/api/src/database/migrations" && pwd)"

apply_migration() {
  echo "==> Aplicando $1"
  docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -f - < "$MIGRATIONS_DIR/$1"
}

# ============================================================================
# Orden EXPLÍCITO, no alfabético. El prefijo numérico no es una clave de orden confiable en
# este repo: 0003 y 0006 existen duplicados (2 y 3 archivos respectivamente), y el orden real
# de aplicación histórica contra 'volumetrix' no siempre coincide con el orden numérico — ver
# docs/02-arquitectura-y-db/Plan_Fase3_Suite_Tests.md para el detalle completo de cada ajuste
# de abajo. Ninguno de estos ajustes modifica un archivo de migración real: todos viven acá,
# solo para poder reproducir un estado final correcto en una DB nueva.
# ============================================================================

apply_migration 0000_yummy_jubilee.sql
apply_migration 0002_citas_modifications.sql

echo "==> Corrigiendo drift de columnas core (existen en volumetrix real, ninguna migración las"
echo "    agrega — halladas comparando information_schema.columns entre volumetrix y volumetrix_test)"
# Mismo patrón de drift que detalles_transaccion/productos más abajo, a nivel de columna en vez de
# tabla completa. Se aplican acá porque 0000 (recién corrida arriba) es donde deberían haber estado.
# La tabla está vacía en este punto del bootstrap, así que agregar NOT NULL/UNIQUE de una vez es seguro
# (sin necesidad de backfill).
docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 <<'SQL'
ALTER TABLE clientes ADD COLUMN acepta_marketing boolean NOT NULL DEFAULT false;
ALTER TABLE usuarios ADD COLUMN porcentaje_comision_producto numeric(4, 2);
ALTER TABLE transacciones ALTER COLUMN cita_id DROP NOT NULL;
ALTER TABLE transacciones ADD COLUMN idempotency_key varchar(255) NOT NULL UNIQUE;
SQL

echo "==> Pre-creando current_tenant_id() (0001_rls_policies.sql fue editado en algún momento para"
echo "    incluir yappy_config en su loop, lo que crea una dependencia circular real con"
echo "    0003_financiero.sql: current_tenant_id() se define en 0001 pero yappy_config se crea en"
echo "    0003, y 0003 usa current_tenant_id() en su propia policy. Se rompe el ciclo pre-creando"
echo "    la función acá, antes de ambas — CREATE OR REPLACE la vuelve a definir sin error.)"
docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 <<'SQL'
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;
SQL

echo "==> Creando productos y detalles_transaccion (2 tablas reales en volumetrix, sin ninguna"
echo "    migración que las cree — mismo drift, ver comentario abajo)"
# productos y detalles_transaccion existen en la base de datos real 'volumetrix' y se usan
# activamente (inventario retail, líneas de venta itemizadas), pero ningún archivo de migración
# las crea — tampoco el tipo enum tipo_item. Se aplicaron a mano contra la DB real en algún
# momento (mismo patrón de drift que ya advierte CLAUDE.md, acá a nivel de tabla completa en vez
# de solo columnas/índices). Este bloque reproduce el DDL real (inspeccionado con \d contra
# volumetrix) — detalles_transaccion sin cita_id/empleado_id, que sí llegan por una migración real
# (0014, ADD COLUMN IF NOT EXISTS).
docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
  nombre varchar(255) NOT NULL,
  descripcion text,
  precio_venta numeric(10, 2) NOT NULL,
  costo_compra numeric(10, 2) NOT NULL,
  stock_actual integer NOT NULL DEFAULT 0,
  stock_minimo integer NOT NULL DEFAULT 2,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT productos_stock_actual_check CHECK (stock_actual >= 0)
);

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON productos
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE TYPE tipo_item AS ENUM ('servicio', 'producto');

CREATE TABLE detalles_transaccion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
  transaccion_id uuid NOT NULL REFERENCES transacciones(id) ON DELETE CASCADE,
  tipo_item tipo_item NOT NULL,
  servicio_id uuid REFERENCES servicios(id),
  producto_id uuid REFERENCES productos(id),
  cantidad integer NOT NULL DEFAULT 1,
  precio_unitario numeric(10, 2) NOT NULL,
  subtotal numeric(10, 2) NOT NULL,
  comision_aplicada numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_detalles_item CHECK (
    (tipo_item = 'servicio' AND servicio_id IS NOT NULL AND producto_id IS NULL)
    OR (tipo_item = 'producto' AND producto_id IS NOT NULL AND servicio_id IS NULL)
  )
);

-- relforcerowsecurity = false en la DB real (inconsistente con el resto de tablas, que sí fuerzan
-- RLS — se reproduce tal cual está hoy, no se "corrige" un comportamiento de producción desde acá).
ALTER TABLE detalles_transaccion ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON detalles_transaccion
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
SQL

apply_migration 0003_financiero.sql
apply_migration 0001_rls_policies.sql
apply_migration 0003_gorgeous_sabra.sql
apply_migration 0004_rls_security_definer.sql
apply_migration 0005_login_blocks.sql

# 0006_kill_switch.sql: drizzle-kit generó este archivo (una sola línea, ADD COLUMN sin
# IF NOT EXISTS) para una columna que 0003_gorgeous_sabra.sql (también generado por drizzle-kit,
# journal desincronizado — ver advertencia en CLAUDE.md) ya agrega arriba. Correr los dos revienta
# con "column already exists" sin importar el orden: son la misma columna, dos veces. Se omite —
# no se borra el archivo real (es historial), solo no se reproduce al levantar una DB nueva.
echo "==> Omitiendo 0006_kill_switch.sql (columna duplicada de 0003_gorgeous_sabra.sql, ver comentario arriba)"

apply_migration 0006_auth_functions_update.sql
apply_migration 0006_import_export.sql
apply_migration 0007_superadmin.sql
apply_migration 0008_superadmin_operatividad.sql
apply_migration 0009_observabilidad_y_alertas.sql
apply_migration 0010_multi_industria_schema.sql
apply_migration 0011_rename_empleado.sql
apply_migration 0012_pacientes_y_notas_clinicas.sql
apply_migration 0013_combos.sql
apply_migration 0014_citas_grupales_y_cobro_conjunto.sql
apply_migration 0015_templates_widgets.sql
apply_migration 0016_agenda_confirmacion_inasistencias.sql
apply_migration 0017_rename_comision_propina_empleado.sql
apply_migration 0018_impersonacion_audit.sql
apply_migration 0019_identidad_negocio_audit.sql
apply_migration 0020_reset_pin_staff_audit.sql
apply_migration 0021_eliminar_seed_superadmin_hardcodeado.sql

# Red de seguridad: si alguien agrega un archivo nuevo a migrations/ y se olvida de sumarlo acá
# arriba, fallar ruidosamente en vez de dejar la DB con un subset silencioso del esquema.
# 25 archivos .sql reales hoy (24 aplicados arriba + 1 omitido, 0006_kill_switch.sql).
ACTUAL_COUNT=$(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' | wc -l)
if [[ "$ACTUAL_COUNT" -ne 25 ]]; then
  echo "ERROR: se esperaban 25 archivos .sql en $MIGRATIONS_DIR, se encontraron $ACTUAL_COUNT." >&2
  echo "       Si agregaste una migración nueva, sumala a este script en el orden correcto." >&2
  exit 1
fi

echo "==> GRANT base para app_user (ver docs/02-arquitectura-y-db/Plan_Fase3_Suite_Tests.md — el GRANT"
echo "    base de las tablas 'core' nunca quedó capturado en ninguna migración, solo aplicado a mano"
echo "    contra volumetrix en algún momento; las tablas con grants restringidos por diseño ya quedaron"
echo "    bien en las migraciones de arriba, así que NO se tocan acá para no aflojar esa restricción)."
docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 <<'SQL'
GRANT USAGE ON SCHEMA public TO app_user;

-- Tablas normales (sin restricción de diseño documentada): CRUD completo, igual a lo que ya
-- funciona hoy contra volumetrix en desarrollo.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  usuarios, servicios, clientes, citas, horarios, bloqueos_temporales,
  whatsapp_config, cierres_de_caja, plantillas_whatsapp, barberias, productos,
  detalles_transaccion
TO app_user;

-- Append-only por diseño (libro fiscal / log de auditoría — ver CLAUDE.md y AGENTS.md):
-- solo SELECT + INSERT. transacciones ya tiene además un UPDATE de columnas puntuales
-- (yappy/dgi) otorgado por la migración 0003, que no se toca acá.
GRANT SELECT, INSERT ON transacciones, audit_logs TO app_user;
SQL

echo "==> $DB lista."
