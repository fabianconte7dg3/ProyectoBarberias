-- 0008_superadmin_operatividad.sql

-- 1. Actualizar enum de acciones de auditoría
ALTER TYPE accion_audit ADD VALUE IF NOT EXISTS 'crear_tenant';
ALTER TYPE accion_audit ADD VALUE IF NOT EXISTS 'cambiar_estado_tenant';
ALTER TYPE accion_audit ADD VALUE IF NOT EXISTS 'cambiar_plan_tenant';
ALTER TYPE accion_audit ADD VALUE IF NOT EXISTS 'kill_switch_plataforma';

-- 2. Crear tabla planes
CREATE TABLE IF NOT EXISTS planes (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    precio_mensual DECIMAL(10, 2) NOT NULL,
    limite_barberos INTEGER NOT NULL DEFAULT 3,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permisos para app_user en la tabla planes
GRANT ALL PRIVILEGES ON TABLE planes TO app_user;

-- 3. Insertar datos de planes iniciales
INSERT INTO planes (id, nombre, precio_mensual, limite_barberos, activo)
VALUES 
    ('basico', 'Plan Básico (Hasta 3 Barberos)', 29.00, 3, true),
    ('premium', 'Plan Premium (Hasta 10 Barberos)', 79.00, 10, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Agregar columna plan_id a barberias y sincronizar datos
ALTER TABLE barberias ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50) REFERENCES planes(id) DEFAULT 'basico';

UPDATE barberias 
SET plan_id = plan_suscripcion::text 
WHERE plan_id IS NULL OR plan_id = 'basico';

-- 5. Actualizar función SECURITY DEFINER get_platform_stats() para consultar la tabla planes
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE (
    total_barberias BIGINT,
    barberias_activas BIGINT,
    barberias_suspendidas BIGINT,
    mrr_estimado NUMERIC,
    total_citas_mes BIGINT,
    total_facturado_mes NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_barberias,
        COUNT(*) FILTER (WHERE b.estado = 'activo' AND b.bloqueado_por_plataforma = false)::BIGINT AS barberias_activas,
        COUNT(*) FILTER (WHERE b.estado = 'suspendido_pago' OR b.bloqueado_por_plataforma = true)::BIGINT AS barberias_suspendidas,
        COALESCE(SUM(p.precio_mensual) FILTER (WHERE b.estado = 'activo' AND b.bloqueado_por_plataforma = false), 0)::NUMERIC AS mrr_estimado,
        (SELECT COUNT(*)::BIGINT FROM citas c WHERE c.created_at >= date_trunc('month', CURRENT_DATE)) AS total_citas_mes,
        (SELECT COALESCE(SUM(t.total_facturado), 0)::NUMERIC FROM transacciones t WHERE t.created_at >= date_trunc('month', CURRENT_DATE)) AS total_facturado_mes
    FROM barberias b
    LEFT JOIN planes p ON p.id = b.plan_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_platform_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_platform_stats() TO app_user;

-- 6. Función SECURITY DEFINER para búsqueda pública por token de activación
CREATE OR REPLACE FUNCTION auth_get_user_by_activation_token(p_token VARCHAR)
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    email VARCHAR,
    token_activacion VARCHAR,
    token_expira_en TIMESTAMP WITH TIME ZONE,
    activo BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.tenant_id,
        u.email,
        u.token_activacion,
        u.token_expira_en,
        u.activo
    FROM usuarios u
    WHERE u.token_activacion = p_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION auth_get_user_by_activation_token(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_get_user_by_activation_token(VARCHAR) TO app_user;
