-- ============================================================================
-- MIGRACIÓN: Row Level Security (RLS) para aislamiento multi-tenant
-- ============================================================================
-- Correr DESPUÉS de la migración inicial generada por drizzle-kit
-- (drizzle-kit generate / drizzle-kit push crea las tablas; este archivo
-- activa y define las políticas de seguridad a nivel de fila).
--
-- Patrón: cada conexión/transacción debe ejecutar
--   SET LOCAL app.current_tenant_id = '<uuid-del-tenant>';
-- ANTES de cualquier query. Ver tenant.interceptor.ts para cómo se hace
-- esto automáticamente en cada request de NestJS.
-- ============================================================================

-- Columna calculada que faltaba en el schema de Drizzle (diferencia de caja)
ALTER TABLE cierres_de_caja
  ADD COLUMN IF NOT EXISTS diferencia DECIMAL(10, 2)
  GENERATED ALWAYS AS (efectivo_declarado - efectivo_esperado) STORED;

-- Función helper: castea el setting de sesión a uuid de forma segura.
-- Si no se ha seteado app.current_tenant_id, retorna NULL (y por tanto
-- las políticas rechazan todo acceso, en vez de fallar con error).
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Tablas con tenant_id directo: activar RLS + política estándar
-- ============================================================================

DO $$
DECLARE
  tabla TEXT;
  tablas TEXT[] := ARRAY[
    'usuarios',
    'servicios',
    'clientes',
    'citas',
    'transacciones',
    'horarios',
    'bloqueos_temporales',
    'whatsapp_config',
    'cierres_de_caja',
    'plantillas_whatsapp',
    'yappy_config'
  ];
BEGIN
  FOREACH tabla IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tabla);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tabla); -- aplica incluso al dueño de la tabla
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%s ON %I', tabla, tabla);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_%s ON %I
         USING (tenant_id = current_tenant_id())
         WITH CHECK (tenant_id = current_tenant_id())',
      tabla, tabla
    );
  END LOOP;
END $$;

-- ============================================================================
-- audit_logs: tenant_id es NULLABLE (acciones globales del sistema).
-- Política especial: visible si pertenece al tenant activo, O si es un
-- log global (tenant_id IS NULL) Y el rol de sesión es 'app_admin'.
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (
    tenant_id = current_tenant_id()
    OR (tenant_id IS NULL AND current_setting('app.role', true) = 'app_admin')
  )
  WITH CHECK (tenant_id = current_tenant_id());

-- ============================================================================
-- barberias: es la tabla de tenants en sí, no lleva tenant_id.
-- Cada barbería solo debe poder leer/editar su propia fila.
-- ============================================================================

ALTER TABLE barberias ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberias FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_barberias ON barberias;

CREATE POLICY tenant_isolation_barberias ON barberias
  USING (id = current_tenant_id())
  WITH CHECK (id = current_tenant_id());

-- ============================================================================
-- Rol de aplicación: la app NUNCA debe conectarse como superusuario/owner,
-- porque BYPASSRLS anula todas las políticas de arriba.
-- ============================================================================
-- CREATE ROLE app_user LOGIN PASSWORD '...' NOBYPASSRLS;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- (transacciones y audit_logs son append-only: revocar UPDATE/DELETE explícitamente)
-- REVOKE UPDATE, DELETE ON transacciones, audit_logs FROM app_user;
