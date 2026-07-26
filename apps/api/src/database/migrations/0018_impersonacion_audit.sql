-- Fase 6.3: valor nuevo de accion_audit para registrar cada uso de
-- impersonation ("Login as Tenant") de Super Admin. Idempotente.

ALTER TYPE accion_audit ADD VALUE IF NOT EXISTS 'impersonacion';
