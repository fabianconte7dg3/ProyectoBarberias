-- seed-veterinaria-piloto.sql
-- Tenant dedicado para el piloto de un vertical no-barbería de punta a punta
-- (Fase 2.4, ver docs/plan.md §2.4). Mismo patrón que seed-qa-test.sql, mismas
-- credenciales conocidas (reutiliza los hashes bcrypt ya documentados en
-- Credenciales_QA_Local.md: admin QaTest1234! / empleado PIN 1234) — así no hace
-- falta documentar un segundo set de credenciales de prueba.
--
-- Por qué un tenant separado y no reutilizar `qa-test`: `qa-test` está
-- documentado (Credenciales_QA_Local.md) para arrancar siempre en
-- industria='barberia' — otras verificaciones futuras dependen de eso. Este
-- tenant simula lo que `crearTenantManual` (SuperAdmin) generaría para un
-- alta real de veterinaria: mismas plantillas de config_campos_personalizados
-- y config_widgets_destacados definidas en super-admin.service.ts.
--
-- Idempotente: usa ON CONFLICT, seguro volver a correrlo. Solo para desarrollo
-- local — nunca correr contra producción.

INSERT INTO barberias (
  id, nombre_comercial, slug, plan_suscripcion, plan_id, estado,
  industria, terminologia_empleado, terminologia_servicio, terminologia_cliente,
  config_campos_personalizados, config_widgets_destacados
)
VALUES (
  gen_random_uuid(),
  'Veterinaria Piloto QA',
  'veterinaria-piloto',
  'basico',
  'basico',
  'activo',
  'veterinaria',
  'Veterinario',
  'Consulta',
  'Dueño de mascota',
  '[
    {"entidad": "paciente", "clave": "especie", "etiqueta": "Especie", "tipo": "texto", "requerido": true},
    {"entidad": "paciente", "clave": "raza", "etiqueta": "Raza", "tipo": "texto", "requerido": false},
    {"entidad": "paciente", "clave": "peso_kg", "etiqueta": "Peso (kg)", "tipo": "numero", "requerido": false},
    {"entidad": "paciente", "clave": "alergias", "etiqueta": "Alergias conocidas", "tipo": "texto", "requerido": false}
  ]'::jsonb,
  '["pacientes_activos", "revisiones_proximas", "produccion_empleado"]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  nombre_comercial = EXCLUDED.nombre_comercial,
  estado = 'activo',
  industria = EXCLUDED.industria,
  terminologia_empleado = EXCLUDED.terminologia_empleado,
  terminologia_servicio = EXCLUDED.terminologia_servicio,
  terminologia_cliente = EXCLUDED.terminologia_cliente,
  config_campos_personalizados = EXCLUDED.config_campos_personalizados,
  config_widgets_destacados = EXCLUDED.config_widgets_destacados;

-- Admin: login por email/contraseña. Contraseña en texto plano: QaTest1234!
INSERT INTO usuarios (id, tenant_id, nombre_completo, email, password, rol, activo)
SELECT gen_random_uuid(), b.id, 'Vet Admin', 'vet-admin@test.local',
  '$2b$10$jjz1VmKWcx4A7SWUNamIteSYfkW7phW/TDZUQ2pykfvDIHA4AN.Zy', 'admin', true
FROM barberias b WHERE b.slug = 'veterinaria-piloto'
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, activo = true;

-- Veterinario (empleado): login por PIN. PIN en texto plano: 1234
INSERT INTO usuarios (id, tenant_id, nombre_completo, email, pin_acceso, rol, porcentaje_comision, porcentaje_comision_producto, activo)
SELECT gen_random_uuid(), b.id, 'Vet Empleado', 'vet-empleado@test.local',
  '$2b$10$aC1anklkvCTKk.lhndVNQ.gvepKIhso2PwRiWDcsRrPPjAXuaEwSm', 'empleado', '50', '10', true
FROM barberias b WHERE b.slug = 'veterinaria-piloto'
ON CONFLICT (email) DO UPDATE SET pin_acceso = EXCLUDED.pin_acceso, activo = true;

-- Horario del veterinario (lunes a viernes, 09:00-17:00) — sin esto la
-- disponibilidad real (Fase 2.3) no tendría nada que mostrar.
INSERT INTO horarios (tenant_id, empleado_id, dia_semana, hora_inicio, hora_fin, activo)
SELECT b.id, u.id, dia, '09:00', '17:00', true
FROM barberias b
JOIN usuarios u ON u.tenant_id = b.id AND u.email = 'vet-empleado@test.local'
CROSS JOIN unnest(ARRAY['lunes','martes','miercoles','jueves','viernes']::dia_semana[]) AS dia
WHERE b.slug = 'veterinaria-piloto'
AND NOT EXISTS (
  SELECT 1 FROM horarios h WHERE h.empleado_id = u.id AND h.dia_semana = dia
);

-- Servicios típicos de una consulta veterinaria.
INSERT INTO servicios (id, tenant_id, nombre, duracion_minutos, precio_base, activo)
SELECT gen_random_uuid(), b.id, 'Consulta General', 20, '15.00', true
FROM barberias b WHERE b.slug = 'veterinaria-piloto'
AND NOT EXISTS (SELECT 1 FROM servicios s WHERE s.tenant_id = b.id AND s.nombre = 'Consulta General');

INSERT INTO servicios (id, tenant_id, nombre, duracion_minutos, precio_base, activo)
SELECT gen_random_uuid(), b.id, 'Vacunación', 15, '25.00', true
FROM barberias b WHERE b.slug = 'veterinaria-piloto'
AND NOT EXISTS (SELECT 1 FROM servicios s WHERE s.tenant_id = b.id AND s.nombre = 'Vacunación');
