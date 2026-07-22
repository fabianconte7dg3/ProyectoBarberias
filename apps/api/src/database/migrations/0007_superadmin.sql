-- 0007_superadmin.sql
-- Consola SuperAdmin SaaS: Tabla de Admins de Plataforma (fuera de RLS), Columna de Kill-Switch Plataforma y Funciones SECURITY DEFINER

ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'superadmin';

CREATE TABLE IF NOT EXISTS plataforma_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  totp_secret_cifrado TEXT NOT NULL,
  totp_habilitado BOOLEAN NOT NULL DEFAULT true,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agregar columna de bloqueo preventivo por la plataforma (Kill-Switch Plataforma)
ALTER TABLE barberias ADD COLUMN IF NOT EXISTS bloqueado_por_plataforma BOOLEAN NOT NULL DEFAULT false;

-- Funciones SQL SECURITY DEFINER para agregación global de la plataforma
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE (
  total_barberias BIGINT,
  barberias_activas BIGINT,
  barberias_suspendidas BIGINT,
  mrr_estimado NUMERIC,
  total_citas_mes BIGINT,
  total_facturado_mes NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_barberias,
    COUNT(*) FILTER (WHERE b.estado = 'activo' AND b.bloqueado_por_plataforma = false)::BIGINT AS barberias_activas,
    COUNT(*) FILTER (WHERE b.estado = 'suspendido_pago' OR b.bloqueado_por_plataforma = true)::BIGINT AS barberias_suspendidas,
    COALESCE(SUM(CASE WHEN b.plan_suscripcion = 'premium' THEN 79 ELSE 29 END) FILTER (WHERE b.estado = 'activo' AND b.bloqueado_por_plataforma = false), 0)::NUMERIC AS mrr_estimado,
    (SELECT COUNT(*)::BIGINT FROM citas c WHERE c.created_at >= date_trunc('month', NOW())) AS total_citas_mes,
    (SELECT COALESCE(SUM(t.total_facturado), 0)::NUMERIC FROM transacciones t WHERE t.created_at >= date_trunc('month', NOW())) AS total_facturado_mes
  FROM barberias b;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_tenants_summary()
RETURNS TABLE (
  id UUID,
  nombre_comercial VARCHAR,
  slug VARCHAR,
  plan_suscripcion plan_suscripcion,
  estado_barberia estado_barberia,
  bloqueado_por_plataforma BOOLEAN,
  admin_email VARCHAR,
  admin_nombre VARCHAR,
  created_at TIMESTAMPTZ,
  total_barberos BIGINT,
  total_citas_mes BIGINT,
  total_facturado_mes NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.nombre_comercial,
    b.slug,
    b.plan_suscripcion,
    b.estado AS estado_barberia,
    b.bloqueado_por_plataforma,
    u.email AS admin_email,
    u.nombre_completo AS admin_nombre,
    b.created_at,
    (SELECT COUNT(*)::BIGINT FROM usuarios u2 WHERE u2.tenant_id = b.id AND u2.rol = 'barbero') AS total_barberos,
    (SELECT COUNT(*)::BIGINT FROM citas c WHERE c.tenant_id = b.id AND c.created_at >= date_trunc('month', NOW())) AS total_citas_mes,
    (SELECT COALESCE(SUM(t.total_facturado), 0)::NUMERIC FROM transacciones t WHERE t.tenant_id = b.id AND t.created_at >= date_trunc('month', NOW())) AS total_facturado_mes
  FROM barberias b
  LEFT JOIN usuarios u ON u.tenant_id = b.id AND u.rol = 'admin'
  ORDER BY b.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_platform_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_platform_stats() TO app_user;

REVOKE EXECUTE ON FUNCTION get_all_tenants_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_all_tenants_summary() TO app_user;

-- Insertar SuperAdmin Inicial ($2a$10$e8n... = SuperAdmin123!)
-- Secret cifrado estático de prueba para TOTP: 'JBSWY3DPEHPK3PXP'
INSERT INTO plataforma_admins (email, password_hash, totp_secret_cifrado, totp_habilitado, activo)
VALUES (
  'superadmin@barberos.app',
  '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', -- bcrypt("SuperAdmin123!")
  '555e09f583bb72f5d72f990924bc24bf:d61bcf704db4f2e6900f07ef609ed4ae', -- secret enc
  true,
  true
)
ON CONFLICT (email) DO NOTHING;
