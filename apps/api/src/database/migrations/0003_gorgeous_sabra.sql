ALTER TABLE "barberias" ADD COLUMN "kill_switch_activo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "ultimo_mensaje_recibido_at" timestamp with time zone;