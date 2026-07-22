-- 0006_import_export.sql
-- Módulo de Importación/Exportación Masiva: Tabla de Auditoría con RLS Append-Only

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_importacion') THEN
    CREATE TYPE tipo_importacion AS ENUM ('clientes', 'productos', 'servicios');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_trabajo_importacion') THEN
    CREATE TYPE estado_trabajo_importacion AS ENUM ('procesando', 'completado', 'completado_con_errores', 'fallido');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS trabajos_importacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
  iniciado_por_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo tipo_importacion NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  estado estado_trabajo_importacion NOT NULL DEFAULT 'procesando',
  total_filas INTEGER NOT NULL DEFAULT 0,
  filas_creadas INTEGER NOT NULL DEFAULT 0,
  filas_actualizadas INTEGER NOT NULL DEFAULT 0,
  filas_con_error INTEGER NOT NULL DEFAULT 0,
  detalle_errores JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completado_at TIMESTAMPTZ
);

-- RLS Estándar
ALTER TABLE trabajos_importacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajos_importacion FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON trabajos_importacion;
CREATE POLICY tenant_isolation_policy ON trabajos_importacion
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Patron Append-Only: Permisos a app_user
GRANT SELECT, INSERT ON trabajos_importacion TO app_user;
GRANT UPDATE (estado, filas_creadas, filas_actualizadas, filas_con_error, detalle_errores, completado_at) ON trabajos_importacion TO app_user;
