-- ============================================================================
-- MIGRACIÓN 0015: Templates por vertical — widgets destacados configurables
-- ============================================================================
-- Ver docs/02-arquitectura-y-db/Plan_Multi_Industria_Fase4_CombosGruposTemplates.md
-- §1. Mismo principio que config_campos_personalizados (Fase 2.1): plantilla por
-- defecto según industria, editable por tenant, sin requerir deploy de código para
-- un vertical nuevo. Idempotente, seguro de re-correr.

ALTER TABLE barberias
  ADD COLUMN IF NOT EXISTS config_widgets_destacados JSONB NOT NULL DEFAULT '[]'::jsonb;
