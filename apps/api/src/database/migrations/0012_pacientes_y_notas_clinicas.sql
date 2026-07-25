-- ============================================================================
-- MIGRACIÓN 0012: Modelo de datos por vertical — pacientes + notas_clinicas
-- ============================================================================
-- Ver docs/02-arquitectura-y-db/Plan_Multi_Industria_Fase3_DatosPorVertical.md
-- para el diseño completo y el porqué de cada decisión. Idempotente, seguro
-- de re-correr.

-- 1. Motor de campos personalizados por tenant (config, no dato)
ALTER TABLE barberias
  ADD COLUMN IF NOT EXISTS config_campos_personalizados JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Tabla pacientes: sujeto del servicio opcional (mascota/paciente clínico)
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  campos_personalizados JSONB NOT NULL DEFAULT '{}'::jsonb,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pacientes_tenant_cliente ON pacientes(tenant_id, cliente_id);

ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_pacientes ON pacientes;
CREATE POLICY tenant_isolation_pacientes ON pacientes
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Soft-delete vía `activo` (mismo patrón que servicios/productos) — sin DELETE real.
GRANT SELECT, INSERT, UPDATE ON pacientes TO app_user;

-- 3. citas.paciente_id — nula para barbería/salón, requerida a nivel de
--    aplicación (no constraint SQL) para veterinaria/clínica.
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS paciente_id UUID REFERENCES pacientes(id);

-- 4. Tabla notas_clinicas: historial estructurado, append-only
CREATE TABLE IF NOT EXISTS notas_clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
  cita_id UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES usuarios(id), -- autor / profesional responsable
  diagnostico TEXT,
  tratamiento TEXT,
  proxima_revision_en DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notas_clinicas_cita ON notas_clinicas(cita_id);
CREATE INDEX IF NOT EXISTS idx_notas_clinicas_paciente ON notas_clinicas(paciente_id);

ALTER TABLE notas_clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_clinicas FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_notas_clinicas ON notas_clinicas;
CREATE POLICY tenant_isolation_notas_clinicas ON notas_clinicas
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- RLS aísla por tenant; la confidencialidad por profesional (solo el autor ve
-- diagnostico/tratamiento) se implementa en notas-clinicas.service.ts, no aquí
-- (ver sección 4 del doc de diseño). Append-only: sin UPDATE/DELETE para app_user,
-- igual que transacciones/audit_logs — un historial clínico no se edita en silencio.
GRANT SELECT, INSERT ON notas_clinicas TO app_user;
