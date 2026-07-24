-- 0011_rename_empleado.sql
-- Fase 2 (Milestone A) de la migración a Multi-Industria: renombra los identificadores
-- acoplados al vertical de barbería (`barbero`) a un término genérico (`empleado`).
-- Ver docs/02-arquitectura-y-db/Plan_Multi_Industria_Fase2_Rename.md para el contexto completo.
--
-- EXCLUIDO A PROPÓSITO de este script (ver doc): transacciones.comision_barbero /
-- transacciones.propina_barbero (columnas de un libro contable append-only, requieren
-- revisión fiscal dedicada) y la tabla `barberias` / enum `estado_barberia` (nombre del
-- negocio, no del rol de staff).
--
-- Verificado contra la base real (no solo contra los archivos de migración, que están
-- desincronizados del journal de Drizzle — ver Fase 1): existen hoy `no_solapamiento_barbero`
-- (EXCLUDE/GiST), 4 FK con "barbero" en el nombre, y el índice idx_citas_tenant_barbero_inicio
-- NO existe (declarado en schema.ts pero nunca materializado) — por eso se crea directo con
-- el nombre nuevo en vez de renombrarse.

-- 1. Valores de enum
ALTER TYPE rol_usuario RENAME VALUE 'barbero' TO 'empleado';
ALTER TYPE origen_bloqueo RENAME VALUE 'barbero' TO 'empleado';

-- 2. Columnas
ALTER TABLE citas RENAME COLUMN barbero_id TO empleado_id;
ALTER TABLE horarios RENAME COLUMN barbero_id TO empleado_id;
ALTER TABLE bloqueos_temporales RENAME COLUMN barbero_id TO empleado_id;
ALTER TABLE clientes RENAME COLUMN barbero_frecuente_id TO empleado_frecuente_id;
ALTER TABLE planes RENAME COLUMN limite_barberos TO limite_empleados;

-- 3. Nombres de constraint (Postgres no los renombra solo al renombrar la columna)
ALTER TABLE citas RENAME CONSTRAINT no_solapamiento_barbero TO no_solapamiento_empleado;
ALTER TABLE citas RENAME CONSTRAINT citas_barbero_id_usuarios_id_fk TO citas_empleado_id_usuarios_id_fk;
ALTER TABLE horarios RENAME CONSTRAINT horarios_barbero_id_usuarios_id_fk TO horarios_empleado_id_usuarios_id_fk;
ALTER TABLE bloqueos_temporales RENAME CONSTRAINT bloqueos_temporales_barbero_id_usuarios_id_fk TO bloqueos_temporales_empleado_id_usuarios_id_fk;
ALTER TABLE clientes RENAME CONSTRAINT clientes_barbero_frecuente_id_usuarios_id_fk TO clientes_empleado_frecuente_id_usuarios_id_fk;

-- 4. Índice declarado en schema.ts pero nunca materializado en este entorno.
CREATE INDEX IF NOT EXISTS idx_citas_tenant_empleado_inicio ON citas (tenant_id, empleado_id, inicio_estimado);

-- 5. Función SECURITY DEFINER get_all_tenants_summary(): mismo cuerpo que 0007_superadmin.sql,
--    con la columna/filtro de staff renombrados (total_barberos -> total_empleados).
--    DROP explícito porque CREATE OR REPLACE no permite cambiar el tipo de retorno (columna renombrada).
DROP FUNCTION IF EXISTS get_all_tenants_summary();

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
  total_empleados BIGINT,
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
    (SELECT COUNT(*)::BIGINT FROM usuarios u2 WHERE u2.tenant_id = b.id AND u2.rol = 'empleado') AS total_empleados,
    (SELECT COUNT(*)::BIGINT FROM citas c WHERE c.tenant_id = b.id AND c.created_at >= date_trunc('month', NOW())) AS total_citas_mes,
    (SELECT COALESCE(SUM(t.total_facturado), 0)::NUMERIC FROM transacciones t WHERE t.tenant_id = b.id AND t.created_at >= date_trunc('month', NOW())) AS total_facturado_mes
  FROM barberias b
  LEFT JOIN usuarios u ON u.tenant_id = b.id AND u.rol = 'admin'
  ORDER BY b.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_all_tenants_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_all_tenants_summary() TO app_user;

-- 6. Datos: los nombres de plan sembrados en 0008 mencionan "Barberos" en el texto comercial.
UPDATE planes SET nombre = 'Plan Básico (Hasta 3 Empleados)' WHERE id = 'basico' AND nombre = 'Plan Básico (Hasta 3 Barberos)';
UPDATE planes SET nombre = 'Plan Premium (Hasta 10 Empleados)' WHERE id = 'premium' AND nombre = 'Plan Premium (Hasta 10 Barberos)';
