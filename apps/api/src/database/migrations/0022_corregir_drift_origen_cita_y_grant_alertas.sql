-- Corrige 2 casos de drift entre schema.ts y la DB real, encontrados al probar reservas publicas
-- reales por primera vez contra el staging real (ver
-- docs/02-arquitectura-y-db/Plan_Fase4_Infraestructura.md). Los dos ya estaban parcheados a mano
-- contra el Postgres local de desarrollo hace tiempo -- mismo patron de drift que ya documenta
-- CLAUDE.md (productos/detalles_transaccion/columnas sueltas), nunca antes en estos 2 puntos -- por
-- eso nunca se habian detectado: solo aparecen en una base nueva sin el parche a mano
-- (volumetrix_test, o cualquier staging/produccion real).

-- 1. schema.ts declara 'web_publica' como valor valido de origen_cita (usado por el flujo de
--    reserva publica, citas.controller.ts POST /citas/publica) desde que se agrego ese flujo, pero
--    0000_yummy_jubilee.sql solo creo el enum con ('bot_whatsapp','walk_in','manual_admin') y
--    ninguna migracion posterior agrego 'web_publica' (0016 solo agrego
--    'importacion_historica'). Sin este fix, toda reserva publica real falla con
--    "invalid input value for enum origen_cita: web_publica" (Internal Server Error visible al
--    cliente en el paso de confirmacion).
ALTER TYPE origen_cita ADD VALUE IF NOT EXISTS 'web_publica';

-- 2. alertas_seguridad (0009_observabilidad_y_alertas.sql) nunca tuvo GRANT para app_user -- esa
--    migracion solo otorgo GRANT EXECUTE de la funcion get_platform_business_metrics(). Sin esto,
--    el panel "Alertas de Seguridad" del dashboard de SuperAdmin falla siempre con
--    "permission denied for table alertas_seguridad".
GRANT SELECT, INSERT, UPDATE, DELETE ON alertas_seguridad TO app_user;
