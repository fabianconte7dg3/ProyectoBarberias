CREATE TYPE "public"."accion_audit" AS ENUM('login', 'logout', 'cobro', 'update_intento', 'delete_intento', 'kill_switch', 'cambio_comision', 'cierre_emergencia', 'conciliacion_yappy');--> statement-breakpoint
CREATE TYPE "public"."dia_semana" AS ENUM('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');--> statement-breakpoint
CREATE TYPE "public"."estado_barberia" AS ENUM('activo', 'suspendido_pago', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."estado_cierre" AS ENUM('cuadrado', 'faltante', 'sobrante');--> statement-breakpoint
CREATE TYPE "public"."estado_cita" AS ENUM('programada', 'en_curso', 'completada', 'ausente_strike', 'cancelada', 'revision_manual');--> statement-breakpoint
CREATE TYPE "public"."estado_dgi" AS ENUM('pendiente', 'procesando', 'emitida', 'error_pac');--> statement-breakpoint
CREATE TYPE "public"."estado_whatsapp" AS ENUM('conectado', 'desconectado', 'pendiente_qr', 'suspendido');--> statement-breakpoint
CREATE TYPE "public"."metodo_pago" AS ENUM('efectivo', 'yappy', 'mixto', 'deuda');--> statement-breakpoint
CREATE TYPE "public"."origen_bloqueo" AS ENUM('sistema', 'barbero', 'admin');--> statement-breakpoint
CREATE TYPE "public"."origen_cita" AS ENUM('bot_whatsapp', 'walk_in', 'manual_admin');--> statement-breakpoint
CREATE TYPE "public"."plan_suscripcion" AS ENUM('basico', 'premium');--> statement-breakpoint
CREATE TYPE "public"."rol_usuario" AS ENUM('admin', 'barbero', 'recepcion');--> statement-breakpoint
CREATE TYPE "public"."tipo_bloqueo" AS ENUM('almuerzo_dinamico', 'walk_in', 'lock_reserva', 'emergencia', 'extension_turno');--> statement-breakpoint
CREATE TYPE "public"."tipo_plantilla" AS ENUM('confirmacion_reserva', 'recordatorio_24h', 'confirmacion_pago', 'recordatorio_deuda', 'cierre_emergencia', 'bienvenida_bot');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"usuario_id" uuid,
	"tabla_afectada" varchar(100) NOT NULL,
	"registro_id" uuid NOT NULL,
	"accion" "accion_audit" NOT NULL,
	"payload_antes" jsonb,
	"payload_despues" jsonb,
	"ip_origen" varchar(45) NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "barberias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre_comercial" varchar(255) NOT NULL,
	"ruc" varchar(50),
	"telefono_negocio" varchar(30),
	"plan_suscripcion" "plan_suscripcion" DEFAULT 'basico' NOT NULL,
	"estado" "estado_barberia" DEFAULT 'activo' NOT NULL,
	"slug" varchar(255) NOT NULL,
	"color_primario" varchar(7),
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "barberias_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bloqueos_temporales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"barbero_id" uuid NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fin" timestamp with time zone NOT NULL,
	"tipo" "tipo_bloqueo" NOT NULL,
	"expira_en" timestamp with time zone,
	"origen" "origen_bloqueo" NOT NULL,
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "cierres_de_caja" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"declarado_por_id" uuid NOT NULL,
	"fecha_cierre" date NOT NULL,
	"efectivo_declarado" numeric(10, 2) NOT NULL,
	"efectivo_esperado" numeric(10, 2) NOT NULL,
	"estado" "estado_cierre" NOT NULL,
	"notas_admin" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "citas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cliente_id" uuid,
	"barbero_id" uuid NOT NULL,
	"servicio_id" uuid NOT NULL,
	"inicio_estimado" timestamp with time zone NOT NULL,
	"fin_estimado" timestamp with time zone NOT NULL,
	"origen" "origen_cita" NOT NULL,
	"estado" "estado_cita" DEFAULT 'programada' NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"token_cliente" varchar(255),
	"token_expira_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "citas_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"telefono_whatsapp" varchar(30) NOT NULL,
	"nombre_completo" varchar(255),
	"barbero_frecuente_id" uuid,
	"notas_preferencia" text,
	"total_asistencias" integer DEFAULT 0 NOT NULL,
	"ausencias_strikes" integer DEFAULT 0 NOT NULL,
	"total_gastado" numeric(12, 2) DEFAULT '0' NOT NULL,
	"email_facturacion" varchar(255),
	"bloqueado" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clientes_tenant_id_telefono_whatsapp_unique" UNIQUE("tenant_id","telefono_whatsapp")
);
--> statement-breakpoint
CREATE TABLE "horarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"barbero_id" uuid NOT NULL,
	"dia_semana" "dia_semana" NOT NULL,
	"hora_inicio" time NOT NULL,
	"hora_fin" time NOT NULL,
	"hora_almuerzo_inicio" time,
	"hora_almuerzo_fin" time,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plantillas_whatsapp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipo" "tipo_plantilla" NOT NULL,
	"contenido" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servicios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"duracion_minutos" integer NOT NULL,
	"precio_base" numeric(10, 2) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transacciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cita_id" uuid NOT NULL,
	"metodo_pago" "metodo_pago" NOT NULL,
	"total_facturado" numeric(10, 2) NOT NULL,
	"monto_efectivo_ingresado" numeric(10, 2),
	"comision_barbero" numeric(10, 2) NOT NULL,
	"propina_barbero" numeric(10, 2) DEFAULT '0' NOT NULL,
	"estado_dgi" "estado_dgi" DEFAULT 'pendiente' NOT NULL,
	"numero_factura_dgi" varchar(100),
	"ruc_cliente" varchar(50),
	"nombre_fiscal_cliente" varchar(255),
	"yappy_transaction_id" varchar(255),
	"yappy_webhook_received_at" timestamp with time zone,
	"yappy_webhook_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transacciones_cita_id_unique" UNIQUE("cita_id")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre_completo" varchar(255) NOT NULL,
	"email" varchar(255),
	"password" varchar(255),
	"rol" "rol_usuario" NOT NULL,
	"porcentaje_comision" numeric(4, 2),
	"pin_acceso" varchar(255),
	"token_activacion" varchar(255),
	"token_expira_en" timestamp with time zone,
	"webauthn_credential_id" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"numero_whatsapp" varchar(30) NOT NULL,
	"evolution_instance_name" varchar(255) NOT NULL,
	"evolution_server_url" text NOT NULL,
	"estado" "estado_whatsapp" DEFAULT 'pendiente_qr' NOT NULL,
	"ultimo_ping" timestamp with time zone,
	"qr_code_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_config_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_barberias_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."barberias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloqueos_temporales" ADD CONSTRAINT "bloqueos_temporales_tenant_id_barberias_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."barberias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloqueos_temporales" ADD CONSTRAINT "bloqueos_temporales_barbero_id_usuarios_id_fk" FOREIGN KEY ("barbero_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cierres_de_caja" ADD CONSTRAINT "cierres_de_caja_tenant_id_barberias_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."barberias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cierres_de_caja" ADD CONSTRAINT "cierres_de_caja_declarado_por_id_usuarios_id_fk" FOREIGN KEY ("declarado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citas" ADD CONSTRAINT "citas_tenant_id_barberias_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."barberias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citas" ADD CONSTRAINT "citas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citas" ADD CONSTRAINT "citas_barbero_id_usuarios_id_fk" FOREIGN KEY ("barbero_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citas" ADD CONSTRAINT "citas_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_tenant_id_barberias_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."barberias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_barbero_frecuente_id_usuarios_id_fk" FOREIGN KEY ("barbero_frecuente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horarios" ADD CONSTRAINT "horarios_tenant_id_barberias_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."barberias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horarios" ADD CONSTRAINT "horarios_barbero_id_usuarios_id_fk" FOREIGN KEY ("barbero_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantillas_whatsapp" ADD CONSTRAINT "plantillas_whatsapp_tenant_id_barberias_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."barberias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_tenant_id_barberias_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."barberias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_tenant_id_barberias_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."barberias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_cita_id_citas_id_fk" FOREIGN KEY ("cita_id") REFERENCES "public"."citas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenant_id_barberias_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."barberias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_config" ADD CONSTRAINT "whatsapp_config_tenant_id_barberias_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."barberias"("id") ON DELETE cascade ON UPDATE no action;