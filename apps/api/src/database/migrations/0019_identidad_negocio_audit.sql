-- Fase 6-G: valor nuevo de accion_audit para registrar cada cambio de
-- identidad de marca (nombre comercial, RUC, telefono, color, logo) hecho
-- por el propio admin del tenant. Idempotente.

ALTER TYPE accion_audit ADD VALUE IF NOT EXISTS 'actualizar_identidad';
