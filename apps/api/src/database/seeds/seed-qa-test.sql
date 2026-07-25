-- seed-qa-test.sql
-- Tenant + usuarios de PRUEBA con credenciales conocidas y fijas, para no tener
-- que resetear credenciales de cuentas reales cada vez que hace falta verificar
-- algo manualmente (login, panel de admin, etc.) en el entorno local.
--
-- Ver docs/06-referencias-tecnicas/Credenciales_QA_Local.md para las credenciales
-- en texto plano y cómo usarlas.
--
-- Idempotente: usa ON CONFLICT, seguro volver a correrlo. Solo pensado para
-- entornos de desarrollo local — nunca correr contra producción.
--
-- Nota: los IDs de usuarios/servicios se generan con gen_random_uuid() (no se
-- fijan a mano) porque @IsUUID() en los DTOs del backend exige un UUID v4
-- válido — un UUID "legible" tipo 000...002 no pasa esa validación. El tenant
-- se referencia siempre por su slug ('qa-test'), no por su id.

INSERT INTO barberias (id, nombre_comercial, slug, plan_suscripcion, plan_id, estado, industria, terminologia_empleado, terminologia_servicio, terminologia_cliente)
VALUES (
  gen_random_uuid(),
  'QA Test Tenant',
  'qa-test',
  'basico',
  'basico',
  'activo',
  'barberia',
  'Barbero',
  'Servicio',
  'Cliente'
)
ON CONFLICT (slug) DO UPDATE SET
  nombre_comercial = EXCLUDED.nombre_comercial,
  estado = 'activo';

-- Admin de prueba: login por email/contraseña en /[slug]/admin/login → "Iniciar Sesión como Administrador"
-- Contraseña en texto plano: QaTest1234!
INSERT INTO usuarios (id, tenant_id, nombre_completo, email, password, rol, activo)
SELECT gen_random_uuid(), b.id, 'QA Admin', 'qa-admin@test.local',
  '$2b$10$jjz1VmKWcx4A7SWUNamIteSYfkW7phW/TDZUQ2pykfvDIHA4AN.Zy', 'admin', true
FROM barberias b WHERE b.slug = 'qa-test'
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, activo = true;

-- Empleado de prueba: login rápido por PIN en /[slug]/admin/login → selector de perfil
-- PIN en texto plano: 1234
INSERT INTO usuarios (id, tenant_id, nombre_completo, email, pin_acceso, rol, porcentaje_comision, porcentaje_comision_producto, activo)
SELECT gen_random_uuid(), b.id, 'QA Empleado', 'qa-empleado@test.local',
  '$2b$10$aC1anklkvCTKk.lhndVNQ.gvepKIhso2PwRiWDcsRrPPjAXuaEwSm', 'empleado', '50', '10', true
FROM barberias b WHERE b.slug = 'qa-test'
ON CONFLICT (email) DO UPDATE SET pin_acceso = EXCLUDED.pin_acceso, activo = true;

-- Servicio de prueba, para poder probar el flujo completo de reserva/cobro.
INSERT INTO servicios (id, tenant_id, nombre, duracion_minutos, precio_base, activo)
SELECT gen_random_uuid(), b.id, 'Servicio de Prueba', 30, '10.00', true
FROM barberias b WHERE b.slug = 'qa-test'
AND NOT EXISTS (
  SELECT 1 FROM servicios s WHERE s.tenant_id = b.id AND s.nombre = 'Servicio de Prueba'
);
