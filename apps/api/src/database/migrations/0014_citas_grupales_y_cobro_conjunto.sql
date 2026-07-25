-- ============================================================================
-- MIGRACIÓN 0014: Citas grupales — cobro conjunto multi-empleado
-- ============================================================================
-- Ver docs/02-arquitectura-y-db/Plan_Multi_Industria_Fase4_CombosGruposTemplates.md
-- §3 para el diseño de citas.grupo_reserva_id (agregado en 0013_combos.sql). Esta
-- migración resuelve la "nota de implementación pendiente" del documento: cómo cobrar
-- 2+ citas de un mismo grupo en una sola transacción cuando cada una puede tener un
-- empleado distinto. Idempotente, seguro de re-correr.
--
-- Diseño elegido: UNA transacción cubre el grupo completo (transacciones.cita_id queda
-- NULL, igual que hoy para ventas de mostrador). Cada línea de servicio en
-- detalles_transaccion se enlaza a su cita y a su empleado específicos, para que la
-- comisión se atribuya correctamente por empleado real — no un solo empleado por
-- transacción como asumía el modelo anterior. Las transacciones existentes (una sola
-- cita, un solo empleado) no cambian de comportamiento: detalles_transaccion.empleado_id
-- queda NULL y los reportes usan cita.empleado_id como antes (fallback, ver
-- reportes.service.ts).

-- 1. transacciones.grupo_reserva_id — tag de correlación cuando esta transacción cubre
--    un grupo completo (no una FK real: grupo_reserva_id es un UUID compartido entre
--    filas de citas, igual que en la propia tabla citas, no una tabla propia).
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS grupo_reserva_id UUID;
CREATE INDEX IF NOT EXISTS idx_transacciones_grupo_reserva ON transacciones(grupo_reserva_id) WHERE grupo_reserva_id IS NOT NULL;

-- 2. detalles_transaccion.cita_id — qué cita generó esta línea de servicio. Se puebla
--    siempre que se conoce la cita, no solo en cobro grupal: un combo genera varias
--    líneas para la misma cita, y esto permite deduplicarlas al contar citas en reportes.
--    NULL en líneas de producto.
ALTER TABLE detalles_transaccion ADD COLUMN IF NOT EXISTS cita_id UUID REFERENCES citas(id);
CREATE INDEX IF NOT EXISTS idx_detalles_transaccion_cita ON detalles_transaccion(cita_id) WHERE cita_id IS NOT NULL;

-- 3. detalles_transaccion.empleado_id — qué empleado realizó este servicio puntual.
--    NULL en transacciones de un solo empleado (comportamiento actual sin cambios).
ALTER TABLE detalles_transaccion ADD COLUMN IF NOT EXISTS empleado_id UUID REFERENCES usuarios(id);

-- Sin cambios de GRANT: las columnas nuevas heredan los permisos ya otorgados sobre
-- transacciones/detalles_transaccion (GRANT es a nivel de tabla en este esquema).
