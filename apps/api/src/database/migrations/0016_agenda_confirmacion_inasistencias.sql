-- ============================================================================
-- MIGRACIÓN 0016: Agenda — confirmación obligatoria + historial de inasistencias
-- ============================================================================
-- Ver docs/02-arquitectura-y-db/Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md
-- para el diseño completo y el porqué de cada decisión. Idempotente, seguro
-- de re-correr.

-- 1. Nuevos valores de enum: origen de cita por importación histórica,
--    tipo de importación para citas históricas.
ALTER TYPE origen_cita ADD VALUE IF NOT EXISTS 'importacion_historica';
ALTER TYPE tipo_importacion ADD VALUE IF NOT EXISTS 'citas_historicas';

-- 2. Confirmación obligatoria (WhatsApp + link web) — flag independiente de
--    estado_cita, no interfiere con la máquina de estados existente.
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS confirmada BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS confirmacion_solicitada_en TIMESTAMPTZ;

-- 3. Ventana de anticipación configurable por tenant para pedir confirmación.
ALTER TABLE barberias
  ADD COLUMN IF NOT EXISTS horas_antes_confirmacion INTEGER NOT NULL DEFAULT 4;

-- 4. Historial de inasistencias con fecha (respalda clientes.ausencias_strikes,
--    que se mantiene como contador rápido). Insert-only.
CREATE TABLE IF NOT EXISTS inasistencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  cita_id UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inasistencias_tenant_cliente ON inasistencias(tenant_id, cliente_id);

ALTER TABLE inasistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE inasistencias FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_inasistencias ON inasistencias;
CREATE POLICY tenant_isolation_inasistencias ON inasistencias
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Append-only: un registro de inasistencia no se edita ni se borra en silencio,
-- mismo criterio que notas_clinicas/audit_logs.
GRANT SELECT, INSERT ON inasistencias TO app_user;
