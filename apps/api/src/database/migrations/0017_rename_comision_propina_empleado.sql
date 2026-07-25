-- ============================================================================
-- MIGRACIÓN 0017: Rename transacciones.comision_barbero/propina_barbero -> empleado
-- ============================================================================
-- Decisión tomada en Fase 2.4 (ver docs/plan.md §2.4): estas columnas quedaron
-- deliberadamente excluidas del rename barbero->empleado (Fase 2, Milestone A)
-- por ser parte de un libro fiscal append-only — se revisaron aparte y ahora
-- se confirma que son puramente internas (sin conexión con el módulo DGI ni
-- ningún contrato externo), así que el rename es de bajo riesgo. Solo cambia
-- el nombre de la columna — los datos existentes no se tocan.
--
-- Nota: RENAME COLUMN no es "IF EXISTS"-safe hacia atrás de forma trivial;
-- se envuelve en un DO block para que sea seguro re-correr esta migración.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacciones' AND column_name = 'comision_barbero'
  ) THEN
    ALTER TABLE transacciones RENAME COLUMN comision_barbero TO comision_empleado;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacciones' AND column_name = 'propina_barbero'
  ) THEN
    ALTER TABLE transacciones RENAME COLUMN propina_barbero TO propina_empleado;
  END IF;
END $$;
