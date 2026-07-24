-- 0010_multi_industria_schema.sql
-- Fase 1 de la migración a Multi-Industria: solo esquema, aditivo y no disruptivo.
-- Ver docs/02-arquitectura-y-db/Plan_Multi_Industria_Schema.md para el contexto completo.
--
-- No se renombra ninguna tabla ni columna existente (ej. barberoId, rol = 'barbero').
-- Ese trabajo queda documentado como Fase 2. Este script solo agrega:
--   1. Enum industria_negocio.
--   2. Columnas de industria/terminología dinámica en barberias.
--   3. Columna datos_adicionales (JSONB) en clientes, para atributos específicos
--      de cada vertical (ej. nombre_mascota/raza en veterinarias).
--   4. Columna notas (TEXT) en citas, para notas por visita.
--
-- Idempotente: seguro volver a correrlo.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'industria_negocio') THEN
    CREATE TYPE industria_negocio AS ENUM (
      'barberia', 'salon_belleza', 'spa_masajes', 'veterinaria',
      'clinica_medica', 'taller_mecanico', 'espacio_alquiler', 'otro'
    );
  END IF;
END $$;

ALTER TABLE barberias
  ADD COLUMN IF NOT EXISTS industria industria_negocio NOT NULL DEFAULT 'barberia',
  ADD COLUMN IF NOT EXISTS terminologia_empleado VARCHAR(100) NOT NULL DEFAULT 'Barbero',
  ADD COLUMN IF NOT EXISTS terminologia_servicio VARCHAR(100) NOT NULL DEFAULT 'Servicio',
  ADD COLUMN IF NOT EXISTS terminologia_cliente VARCHAR(100) NOT NULL DEFAULT 'Cliente';

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS datos_adicionales JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS notas TEXT;
