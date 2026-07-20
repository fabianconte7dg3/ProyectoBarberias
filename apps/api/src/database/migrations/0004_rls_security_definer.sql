-- ============================================================================
-- MIGRACIÓN: Funciones SECURITY DEFINER para resolución de Tenant
-- ============================================================================
-- Estas funciones permiten consultas muy específicas que cruzan tenants (bypass RLS)
-- pero de forma estrictamente controlada y encapsulada.

-- 1. Obtener el tenant de un barbero (filtra por activo)
CREATE OR REPLACE FUNCTION get_tenant_for_usuario(u_id UUID)
RETURNS UUID AS $$
  SELECT tenant_id FROM usuarios WHERE id = u_id AND activo = true;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Obtener el tenant para una transacción de Yappy
CREATE OR REPLACE FUNCTION get_tenant_for_yappy_order(y_order_id VARCHAR)
RETURNS UUID AS $$
  SELECT tenant_id FROM transacciones WHERE yappy_order_id = y_order_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 3. Obtener el tenant para una cita (para la ruta de cancelación pública)
CREATE OR REPLACE FUNCTION get_tenant_for_cita(c_id UUID)
RETURNS UUID AS $$
  SELECT tenant_id FROM citas WHERE id = c_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Aseguramos que nadie por defecto pueda ejecutarlas (incluyendo el rol postgres si actuara como un usuario normal)
REVOKE EXECUTE ON FUNCTION get_tenant_for_usuario(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_tenant_for_yappy_order(VARCHAR) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_tenant_for_cita(UUID) FROM PUBLIC;

-- Concedemos el permiso estrictamente a app_user
GRANT EXECUTE ON FUNCTION get_tenant_for_usuario(UUID) TO app_user;
GRANT EXECUTE ON FUNCTION get_tenant_for_yappy_order(VARCHAR) TO app_user;
GRANT EXECUTE ON FUNCTION get_tenant_for_cita(UUID) TO app_user;

-- ============================================================================
-- 4. auth_get_user_by_email
-- Necesario para login y registro, ya que app_user no puede leer la tabla usuarios sin un tenant.
-- ============================================================================
CREATE OR REPLACE FUNCTION auth_get_user_by_email(p_email TEXT)
RETURNS TABLE (id UUID, tenant_id UUID, password VARCHAR, activo BOOLEAN, rol rol_usuario)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY 
  SELECT u.id, u.tenant_id, u.password, u.activo, u.rol
  FROM usuarios u
  WHERE u.email = p_email AND u.activo = true;
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION auth_get_user_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_get_user_by_email(TEXT) TO app_user;


-- ============================================================================
-- 5. auth_get_tenant_by_slug
-- Necesario para login staff, ya que barberias está protegida por RLS.
-- ============================================================================
CREATE OR REPLACE FUNCTION auth_get_tenant_by_slug(p_slug VARCHAR)
RETURNS TABLE (id UUID, estado estado_barberia)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY 
  SELECT b.id, b.estado
  FROM barberias b
  WHERE b.slug = p_slug AND b.estado = 'activo';
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION auth_get_tenant_by_slug(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_get_tenant_by_slug(VARCHAR) TO app_user;

-- ============================================================================
-- 6. auth_get_user_by_token
-- Necesario para activate staff (buscar usuario por token de activación sin tenant_id)
-- ============================================================================
CREATE OR REPLACE FUNCTION auth_get_user_by_token(p_token VARCHAR)
RETURNS TABLE (id UUID, tenant_id UUID, token_expira_en TIMESTAMP WITH TIME ZONE)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY 
  SELECT u.id, u.tenant_id, u.token_expira_en
  FROM usuarios u
  WHERE u.token_activacion = p_token;
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION auth_get_user_by_token(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_get_user_by_token(VARCHAR) TO app_user;
