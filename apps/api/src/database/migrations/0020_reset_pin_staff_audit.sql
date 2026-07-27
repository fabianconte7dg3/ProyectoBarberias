-- Fase 6-I: valor nuevo de accion_audit para registrar cada reseteo de PIN
-- de staff hecho por el admin del tenant (empleado olvido su PIN). Idempotente.

ALTER TYPE accion_audit ADD VALUE IF NOT EXISTS 'reset_pin_staff';
