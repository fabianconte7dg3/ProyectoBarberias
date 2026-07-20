-- ============================================================================
-- MIGRACIÓN: Eliminar filtro duro para permitir validación detallada en backend
-- ============================================================================

-- 1. auth_get_user_by_email
CREATE OR REPLACE FUNCTION auth_get_user_by_email(p_email TEXT)
RETURNS TABLE (id UUID, tenant_id UUID, password VARCHAR, activo BOOLEAN, rol rol_usuario)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY 
  SELECT u.id, u.tenant_id, u.password, u.activo, u.rol
  FROM usuarios u
  WHERE u.email = p_email; -- Filtro activo=true removido para poder devolver 403 en app
END;
$$ LANGUAGE plpgsql;

-- 2. auth_get_tenant_by_slug
CREATE OR REPLACE FUNCTION auth_get_tenant_by_slug(p_slug VARCHAR)
RETURNS TABLE (id UUID, estado estado_barberia)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY 
  SELECT b.id, b.estado
  FROM barberias b
  WHERE b.slug = p_slug; -- Filtro estado='activo' removido para poder devolver 403 en app
END;
$$ LANGUAGE plpgsql;
