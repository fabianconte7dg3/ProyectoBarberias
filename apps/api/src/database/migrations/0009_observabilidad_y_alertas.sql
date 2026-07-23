-- ============================================================================
-- MIGRACIÓN 0009: Observabilidad de Seguridad y Métricas de Negocio Avanzadas
-- ============================================================================

-- 1. Tabla de Alertas de Seguridad y Salud
CREATE TABLE IF NOT EXISTS alertas_seguridad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES barberias(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'canario_rls', 'superadmin_login_fallido', 'rate_limit_excedido', 'yappy_hmac_fallo'
    nivel VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
    mensaje TEXT NOT NULL,
    metadatos JSONB DEFAULT '{}'::jsonb,
    atendida BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alertas_seguridad_tenant ON alertas_seguridad(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alertas_seguridad_atendida ON alertas_seguridad(atendida);
CREATE INDEX IF NOT EXISTS idx_alertas_seguridad_tipo ON alertas_seguridad(tipo);

-- 2. Función SQL SECURITY DEFINER para Métricas de Negocio Avanzadas y Barberías en Riesgo
CREATE OR REPLACE FUNCTION get_platform_business_metrics()
RETURNS TABLE (
    barberias_nuevas_mes BIGINT,
    barberias_nuevas_semana BIGINT,
    canceladas_mes BIGINT,
    plan_basico_count BIGINT,
    plan_premium_count BIGINT,
    barberias_en_riesgo JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_nuevas_mes BIGINT;
    v_nuevas_semana BIGINT;
    v_canceladas_mes BIGINT;
    v_basico BIGINT;
    v_premium BIGINT;
    v_riesgo JSONB;
BEGIN
    -- Nuevas del mes
    SELECT COUNT(*)::BIGINT INTO v_nuevas_mes
    FROM barberias
    WHERE created_at >= date_trunc('month', CURRENT_DATE);

    -- Nuevas de la semana
    SELECT COUNT(*)::BIGINT INTO v_nuevas_semana
    FROM barberias
    WHERE created_at >= date_trunc('week', CURRENT_DATE);

    -- Canceladas del mes
    SELECT COUNT(*)::BIGINT INTO v_canceladas_mes
    FROM barberias
    WHERE estado = 'cancelado' AND created_at >= date_trunc('month', CURRENT_DATE);

    -- Conteo por plan
    SELECT COUNT(*)::BIGINT INTO v_basico
    FROM barberias
    WHERE (plan_id = 'basico' OR plan_suscripcion = 'basico') AND estado = 'activo';

    SELECT COUNT(*)::BIGINT INTO v_premium
    FROM barberias
    WHERE (plan_id = 'premium' OR plan_suscripcion = 'premium') AND estado = 'activo';

    -- Barberías en riesgo: inactivas > 7 días o con WhatsApp desconectado/suspendido
    SELECT COALESCE(jsonb_agg(r), '[]'::jsonb) INTO v_riesgo
    FROM (
        SELECT 
            b.id,
            b.nombre_comercial AS "nombreComercial",
            b.slug,
            b.estado,
            COALESCE(w.estado, 'desconectado') AS "estadoWhatsapp",
            MAX(c.created_at) AS "ultimaCitaAt",
            CASE 
                WHEN COALESCE(w.estado, 'desconectado') IN ('desconectado', 'suspendido') THEN 'WhatsApp desconectado'
                WHEN MAX(c.created_at) IS NULL THEN 'Sin citas registradas'
                WHEN MAX(c.created_at) < NOW() - INTERVAL '7 days' THEN 'Sin actividad en > 7 días'
                ELSE 'Inactividad'
            END AS "motivoRiesgo"
        FROM barberias b
        LEFT JOIN whatsapp_config w ON w.tenant_id = b.id
        LEFT JOIN citas c ON c.tenant_id = b.id
        WHERE b.estado = 'activo' AND b.bloqueado_por_plataforma = false
        GROUP BY b.id, b.nombre_comercial, b.slug, b.estado, w.estado
        HAVING 
            COALESCE(w.estado, 'desconectado') IN ('desconectado', 'suspendido')
            OR MAX(c.created_at) IS NULL 
            OR MAX(c.created_at) < NOW() - INTERVAL '7 days'
        ORDER BY 
            CASE 
                WHEN MAX(c.created_at) < NOW() - INTERVAL '7 days' THEN 1
                WHEN COALESCE(w.estado, 'desconectado') IN ('desconectado', 'suspendido') THEN 2
                ELSE 3
            END,
            MAX(c.created_at) ASC NULLS FIRST
        LIMIT 50
    ) r;

    RETURN QUERY SELECT 
        v_nuevas_mes,
        v_nuevas_semana,
        v_canceladas_mes,
        v_basico,
        v_premium,
        v_riesgo;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_platform_business_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_platform_business_metrics() TO app_user;
