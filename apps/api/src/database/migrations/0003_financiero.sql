CREATE TYPE "public"."yappy_modo" AS ENUM('manual', 'comercial');--> statement-breakpoint
CREATE TABLE "yappy_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"modo" "yappy_modo" DEFAULT 'manual' NOT NULL,
	"numero_personal" varchar(30),
	"merchant_id" varchar(255),
	"secret_key_cifrada" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "yappy_config_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
ALTER TABLE "transacciones" ADD COLUMN "yappy_order_id" varchar(15);--> statement-breakpoint
ALTER TABLE "transacciones" ADD COLUMN "confirmado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "yappy_config" ADD CONSTRAINT "yappy_config_tenant_id_barberias_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."barberias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_confirmado_por_id_usuarios_id_fk" FOREIGN KEY ("confirmado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Habilitar RLS para yappy_config
ALTER TABLE yappy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE yappy_config FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Política de Aislamiento para yappy_config
CREATE POLICY tenant_isolation_yappy_config ON yappy_config
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());