-- ============================================================================
-- Update auth_get_user_by_email to return all users (so login can check state)
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
  WHERE u.email = p_email;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Update auth_get_tenant_by_slug to return all tenants (so login can check state)
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
  WHERE b.slug = p_slug;
END;
$$ LANGUAGE plpgsql;
REVOKE EXECUTE ON FUNCTION auth_get_user_by_email(TEXT) FROM PUBLIC; GRANT EXECUTE ON FUNCTION auth_get_user_by_email(TEXT) TO app_user; REVOKE EXECUTE ON FUNCTION auth_get_tenant_by_slug(VARCHAR) FROM PUBLIC; GRANT EXECUTE ON FUNCTION auth_get_tenant_by_slug(VARCHAR) TO app_user;
