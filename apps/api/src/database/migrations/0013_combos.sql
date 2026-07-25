-- ============================================================================
-- MIGRACIÓN 0013: Combos de servicios (bundle rastreado)
-- ============================================================================
-- Ver docs/02-arquitectura-y-db/Plan_Multi_Industria_Fase4_CombosGruposTemplates.md
-- §2 para el diseño completo. Idempotente, seguro de re-correr.

-- 1. Tabla combos
CREATE TABLE IF NOT EXISTS combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  precio_total DECIMAL(10,2) NOT NULL,
  duracion_ajustada_minutos INTEGER,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_combos_tenant_activo ON combos(tenant_id, activo);

ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_combos ON combos;
CREATE POLICY tenant_isolation_combos ON combos
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Catálogo de configuración (igual que servicios/productos) — soft-delete vía `activo`.
GRANT SELECT, INSERT, UPDATE ON combos TO app_user;

-- 2. Tabla combo_servicios (líneas del combo)
-- Desviación deliberada del diseño (que proponía PK compuesta combo_id+servicio_id):
-- id surrogate + UNIQUE(combo_id, servicio_id), consistente con el resto del esquema
-- (ninguna otra tabla usa PK compuesta), y con tenant_id propio para que la policy RLS
-- sea directa (igual que detalles_transaccion).
CREATE TABLE IF NOT EXISTS combo_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
  combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  servicio_id UUID NOT NULL REFERENCES servicios(id),
  orden INTEGER NOT NULL DEFAULT 0,
  precio_asignado DECIMAL(10,2) NOT NULL,
  UNIQUE (combo_id, servicio_id)
);

CREATE INDEX IF NOT EXISTS idx_combo_servicios_combo ON combo_servicios(combo_id);

ALTER TABLE combo_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_servicios FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_combo_servicios ON combo_servicios;
CREATE POLICY tenant_isolation_combo_servicios ON combo_servicios
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Editado en bloque al guardar un combo (se borran y re-insertan las líneas) — necesita DELETE.
GRANT SELECT, INSERT, UPDATE, DELETE ON combo_servicios TO app_user;

-- 3. citas: servicio_id pasa a nullable (alternativa: combo_id), nueva columna combo_id.
-- Regla "exactamente uno de servicio_id/combo_id" es de aplicación, no constraint SQL
-- (a propósito, para no bloquear casos futuros — ver §2 del doc de diseño).
ALTER TABLE citas ALTER COLUMN servicio_id DROP NOT NULL;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS combo_id UUID REFERENCES combos(id);

-- 4. citas.grupo_reserva_id — agrupador de citas grupales (cliente + acompañante).
-- NULL = cita individual (comportamiento actual, sin cambios). No participa en el
-- motor de disponibilidad, solo en presentación/cobro (ver 0014_citas_grupales_y_cobro_conjunto.sql).
ALTER TABLE citas ADD COLUMN IF NOT EXISTS grupo_reserva_id UUID;
CREATE INDEX IF NOT EXISTS idx_citas_grupo_reserva ON citas(grupo_reserva_id) WHERE grupo_reserva_id IS NOT NULL;
