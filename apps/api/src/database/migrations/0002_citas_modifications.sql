ALTER TABLE "citas" ADD COLUMN "inicio_real" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "citas" ADD COLUMN "fin_real" timestamp with time zone;--> statement-breakpoint

CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint

ALTER TABLE citas ADD CONSTRAINT no_solapamiento_barbero
  EXCLUDE USING gist (
    barbero_id WITH =,
    tstzrange(inicio_estimado, fin_estimado) WITH &&
  )
  WHERE (estado NOT IN ('cancelada', 'ausente_strike'));--> statement-breakpoint

ALTER TABLE bloqueos_temporales ADD CONSTRAINT no_solapamiento_bloqueo
  EXCLUDE USING gist (
    barbero_id WITH =,
    tstzrange(inicio, fin) WITH &&
  )
  WHERE (tipo = 'lock_reserva');