import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
  integer,
  jsonb,
  date,
  time,
  unique,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const planSuscripcionEnum = pgEnum('plan_suscripcion', ['basico', 'premium']);
export const estadoBarberiaEnum = pgEnum('estado_barberia', ['activo', 'suspendido_pago', 'cancelado']);
export const rolUsuarioEnum = pgEnum('rol_usuario', ['admin', 'barbero', 'recepcion']);
export const diaSemanaEnum = pgEnum('dia_semana', [
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
]);
export const origenCitaEnum = pgEnum('origen_cita', ['bot_whatsapp', 'walk_in', 'manual_admin']);
export const estadoCitaEnum = pgEnum('estado_cita', [
  'programada', 'en_curso', 'completada', 'ausente_strike', 'cancelada', 'revision_manual',
]);
export const metodoPagoEnum = pgEnum('metodo_pago', ['efectivo', 'yappy', 'mixto', 'deuda']);
export const estadoDgiEnum = pgEnum('estado_dgi', ['pendiente', 'procesando', 'emitida', 'error_pac']);
export const tipoBloqueoEnum = pgEnum('tipo_bloqueo', [
  'almuerzo_dinamico', 'walk_in', 'lock_reserva', 'emergencia', 'extension_turno',
]);
export const origenBloqueoEnum = pgEnum('origen_bloqueo', ['sistema', 'barbero', 'admin']);
export const accionAuditEnum = pgEnum('accion_audit', [
  'login', 'logout', 'cobro', 'update_intento', 'delete_intento',
  'kill_switch', 'cambio_comision', 'cierre_emergencia', 'conciliacion_yappy',
]);
export const estadoWhatsappEnum = pgEnum('estado_whatsapp', [
  'conectado', 'desconectado', 'pendiente_qr', 'suspendido',
]);
export const estadoCierreEnum = pgEnum('estado_cierre', ['cuadrado', 'faltante', 'sobrante']);
export const tipoPlantillaEnum = pgEnum('tipo_plantilla', [
  'confirmacion_reserva', 'recordatorio_24h', 'confirmacion_pago',
  'recordatorio_deuda', 'cierre_emergencia', 'bienvenida_bot',
]);
export const yappyModoEnum = pgEnum('yappy_modo', ['manual', 'comercial']);
export const tipoItemEnum = pgEnum('tipo_item', ['servicio', 'producto']);

// ============================================================================
// TABLA 1: barberias (tenant maestro — NO lleva tenant_id, ES el tenant)
// ============================================================================

export const barberias = pgTable('barberias', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombreComercial: varchar('nombre_comercial', { length: 255 }).notNull(),
  ruc: varchar('ruc', { length: 50 }),
  telefonoNegocio: varchar('telefono_negocio', { length: 30 }),
  planSuscripcion: planSuscripcionEnum('plan_suscripcion').notNull().default('basico'),
  estado: estadoBarberiaEnum('estado').notNull().default('activo'),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  killSwitchActivo: boolean('kill_switch_activo').notNull().default(false),
  colorPrimario: varchar('color_primario', { length: 7 }),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// TABLA 2: usuarios (barberos y admins)
// ============================================================================

export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => barberias.id, { onDelete: 'cascade' }),
  nombreCompleto: varchar('nombre_completo', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  password: varchar('password', { length: 255 }),
  rol: rolUsuarioEnum('rol').notNull(),
  porcentajeComision: decimal('porcentaje_comision', { precision: 4, scale: 2 }),
  porcentajeComisionProducto: decimal('porcentaje_comision_producto', { precision: 4, scale: 2 }),
  pinAcceso: varchar('pin_acceso', { length: 255 }), // hash (nullable para admin)
  tokenActivacion: varchar('token_activacion', { length: 255 }),
  tokenExpiraEn: timestamp('token_expira_en', { withTimezone: true }),
  webauthnCredentialId: text('webauthn_credential_id'),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// TABLA 3: servicios
// ============================================================================

export const servicios = pgTable('servicios', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => barberias.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  duracionMinutos: integer('duracion_minutos').notNull(),
  precioBase: decimal('precio_base', { precision: 10, scale: 2 }).notNull(),
  activo: boolean('activo').notNull().default(true),
});

// ============================================================================
// TABLA 3.5: productos (catálogo e inventario retail)
// ============================================================================

export const productos = pgTable('productos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => barberias.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  descripcion: text('descripcion'),
  precioVenta: decimal('precio_venta', { precision: 10, scale: 2 }).notNull(),
  costoCompra: decimal('costo_compra', { precision: 10, scale: 2 }).notNull(),
  stockActual: integer('stock_actual').notNull().default(0),
  stockMinimo: integer('stock_minimo').notNull().default(2),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// TABLA 4: clientes
// ============================================================================

export const clientes = pgTable('clientes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => barberias.id, { onDelete: 'cascade' }),
  telefonoWhatsapp: varchar('telefono_whatsapp', { length: 30 }).notNull(),
  nombreCompleto: varchar('nombre_completo', { length: 255 }),
  barberoFrecuenteId: uuid('barbero_frecuente_id').references(() => usuarios.id),
  notasPreferencia: text('notas_preferencia'),
  totalAsistencias: integer('total_asistencias').notNull().default(0),
  ausenciasStrikes: integer('ausencias_strikes').notNull().default(0),
  totalGastado: decimal('total_gastado', { precision: 12, scale: 2 }).notNull().default('0'),
  emailFacturacion: varchar('email_facturacion', { length: 255 }),
  bloqueado: boolean('bloqueado').notNull().default(false),
  ultimoMensajeRecibidoAt: timestamp('ultimo_mensaje_recibido_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  telefonoPorTenantUnico: unique().on(table.tenantId, table.telefonoWhatsapp),
}));

// ============================================================================
// TABLA 5: citas (núcleo operativo)
// ============================================================================

export const citas = pgTable('citas', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => barberias.id, { onDelete: 'cascade' }),
  clienteId: uuid('cliente_id').references(() => clientes.id),
  barberoId: uuid('barbero_id').notNull().references(() => usuarios.id),
  servicioId: uuid('servicio_id').notNull().references(() => servicios.id),
  inicioEstimado: timestamp('inicio_estimado', { withTimezone: true }).notNull(),
  finEstimado: timestamp('fin_estimado', { withTimezone: true }).notNull(),
  inicioReal: timestamp('inicio_real', { withTimezone: true }),
  finReal: timestamp('fin_real', { withTimezone: true }),
  origen: origenCitaEnum('origen').notNull(),
  estado: estadoCitaEnum('estado').notNull().default('programada'),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
  tokenCliente: varchar('token_cliente', { length: 255 }),
  tokenExpiraEn: timestamp('token_expira_en', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// TABLA 6: transacciones (append-only — finanzas + DGI)
// ============================================================================

export const transacciones = pgTable('transacciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => barberias.id, { onDelete: 'cascade' }),
  citaId: uuid('cita_id').references(() => citas.id), // NULLABLE para ventas directas de mostrador
  idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
  metodoPago: metodoPagoEnum('metodo_pago').notNull(),
  totalFacturado: decimal('total_facturado', { precision: 10, scale: 2 }).notNull(),
  montoEfectivoIngresado: decimal('monto_efectivo_ingresado', { precision: 10, scale: 2 }),
  comisionBarbero: decimal('comision_barbero', { precision: 10, scale: 2 }).notNull(),
  propinaBarbero: decimal('propina_barbero', { precision: 10, scale: 2 }).notNull().default('0'),
  estadoDgi: estadoDgiEnum('estado_dgi').notNull().default('pendiente'),
  numeroFacturaDgi: varchar('numero_factura_dgi', { length: 100 }),
  rucCliente: varchar('ruc_cliente', { length: 50 }),
  nombreFiscalCliente: varchar('nombre_fiscal_cliente', { length: 255 }),
  yappyOrderId: varchar('yappy_order_id', { length: 15 }),
  yappyTransactionId: varchar('yappy_transaction_id', { length: 255 }),
  yappyWebhookReceivedAt: timestamp('yappy_webhook_received_at', { withTimezone: true }),
  yappyWebhookPayload: jsonb('yappy_webhook_payload'),
  confirmadoPorId: uuid('confirmado_por_id').references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// TABLA 6.5: detalles_transaccion (líneas de venta itemizadas)
// ============================================================================

export const detallesTransaccion = pgTable('detalles_transaccion', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => barberias.id, { onDelete: 'cascade' }),
  transaccionId: uuid('transaccion_id').notNull().references(() => transacciones.id, { onDelete: 'cascade' }),
  tipoItem: tipoItemEnum('tipo_item').notNull(),
  servicioId: uuid('servicio_id').references(() => servicios.id),
  productoId: uuid('producto_id').references(() => productos.id),
  cantidad: integer('cantidad').notNull().default(1),
  precioUnitario: decimal('precio_unitario', { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  comisionAplicada: decimal('comision_aplicada', { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// TABLA 7: horarios (disponibilidad base por barbero)
// ============================================================================

export const horarios = pgTable('horarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => barberias.id, { onDelete: 'cascade' }),
  barberoId: uuid('barbero_id').notNull().references(() => usuarios.id),
  diaSemana: diaSemanaEnum('dia_semana').notNull(),
  horaInicio: time('hora_inicio').notNull(),
  horaFin: time('hora_fin').notNull(),
  horaAlmuerzoInicio: time('hora_almuerzo_inicio'),
  horaAlmuerzoFin: time('hora_almuerzo_fin'),
  activo: boolean('activo').notNull().default(true),
});

// ============================================================================
// TABLA 8: bloqueos_temporales (locks dinámicos de agenda)
// ============================================================================

export const bloqueosTemporales = pgTable('bloqueos_temporales', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => barberias.id, { onDelete: 'cascade' }),
  barberoId: uuid('barbero_id').notNull().references(() => usuarios.id),
  inicio: timestamp('inicio', { withTimezone: true }).notNull(),
  fin: timestamp('fin', { withTimezone: true }).notNull(),
  tipo: tipoBloqueoEnum('tipo').notNull(),
  expiraEn: timestamp('expira_en', { withTimezone: true }),
  origen: origenBloqueoEnum('origen').notNull(),
  notas: text('notas'),
});

// ============================================================================
// TABLA 9: audit_logs (trazabilidad inmutable — insert-only)
// ============================================================================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => barberias.id), // nullable: acciones globales del sistema
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  tablaAfectada: varchar('tabla_afectada', { length: 100 }).notNull(),
  registroId: uuid('registro_id').notNull(),
  accion: accionAuditEnum('accion').notNull(),
  payloadAntes: jsonb('payload_antes'),
  payloadDespues: jsonb('payload_despues'),
  ipOrigen: varchar('ip_origen', { length: 45 }).notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// TABLA 10: whatsapp_config (instancia Evolution API por tenant)
// ============================================================================

export const whatsappConfig = pgTable('whatsapp_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().unique().references(() => barberias.id, { onDelete: 'cascade' }),
  numeroWhatsapp: varchar('numero_whatsapp', { length: 30 }).notNull(),
  evolutionInstanceName: varchar('evolution_instance_name', { length: 255 }).notNull(),
  evolutionServerUrl: text('evolution_server_url').notNull(),
  estado: estadoWhatsappEnum('estado').notNull().default('pendiente_qr'),
  ultimoPing: timestamp('ultimo_ping', { withTimezone: true }),
  qrCodeUrl: text('qr_code_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// TABLA 11: cierres_de_caja (arqueo diario — cierre ciego)
// ============================================================================

export const cierresDeCaja = pgTable('cierres_de_caja', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => barberias.id, { onDelete: 'cascade' }),
  declaradoPorId: uuid('declarado_por_id').notNull().references(() => usuarios.id),
  fechaCierre: date('fecha_cierre').notNull(),
  efectivoDeclarado: decimal('efectivo_declarado', { precision: 10, scale: 2 }).notNull(),
  efectivoEsperado: decimal('efectivo_esperado', { precision: 10, scale: 2 }).notNull(),
  // `diferencia` se genera en Postgres como columna calculada — ver migración SQL.
  estado: estadoCierreEnum('estado').notNull(),
  notasAdmin: text('notas_admin'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// TABLA 12: plantillas_whatsapp
// ============================================================================

export const plantillasWhatsapp = pgTable('plantillas_whatsapp', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => barberias.id, { onDelete: 'cascade' }),
  tipo: tipoPlantillaEnum('tipo').notNull(),
  contenido: text('contenido').notNull(),
  activo: boolean('activo').notNull().default(true),
});

// ============================================================================
// TABLA 13: yappy_config
// ============================================================================

export const yappyConfig = pgTable('yappy_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().unique().references(() => barberias.id, { onDelete: 'cascade' }),
  modo: yappyModoEnum('modo').notNull().default('manual'),
  numeroPersonal: varchar('numero_personal', { length: 30 }),
  merchantId: varchar('merchant_id', { length: 255 }),
  secretKeyCifrada: text('secret_key_cifrada'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// RELATIONS (para queries anidadas con db.query.*)
// ============================================================================

export const barberiasRelations = relations(barberias, ({ many, one }) => ({
  usuarios: many(usuarios),
  servicios: many(servicios),
  productos: many(productos),
  clientes: many(clientes),
  citas: many(citas),
  whatsappConfig: one(whatsappConfig),
  yappyConfig: one(yappyConfig),
}));

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  barberia: one(barberias, { fields: [usuarios.tenantId], references: [barberias.id] }),
  horarios: many(horarios),
  citasComoBarbero: many(citas),
}));

export const productosRelations = relations(productos, ({ one, many }) => ({
  barberia: one(barberias, { fields: [productos.tenantId], references: [barberias.id] }),
  detalles: many(detallesTransaccion),
}));

export const clientesRelations = relations(clientes, ({ one, many }) => ({
  barberia: one(barberias, { fields: [clientes.tenantId], references: [barberias.id] }),
  barberoFrecuente: one(usuarios, { fields: [clientes.barberoFrecuenteId], references: [usuarios.id] }),
  citas: many(citas),
}));

export const citasRelations = relations(citas, ({ one }) => ({
  barberia: one(barberias, { fields: [citas.tenantId], references: [barberias.id] }),
  cliente: one(clientes, { fields: [citas.clienteId], references: [clientes.id] }),
  barbero: one(usuarios, { fields: [citas.barberoId], references: [usuarios.id] }),
  servicio: one(servicios, { fields: [citas.servicioId], references: [servicios.id] }),
  transaccion: one(transacciones, { fields: [citas.id], references: [transacciones.citaId] }),
}));

export const transaccionesRelations = relations(transacciones, ({ one, many }) => ({
  barberia: one(barberias, { fields: [transacciones.tenantId], references: [barberias.id] }),
  cita: one(citas, { fields: [transacciones.citaId], references: [citas.id] }),
  detalles: many(detallesTransaccion),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  barberia: one(barberias, { fields: [auditLogs.tenantId], references: [barberias.id] }),
  usuario: one(usuarios, { fields: [auditLogs.usuarioId], references: [usuarios.id] }),
}));

export const detallesTransaccionRelations = relations(detallesTransaccion, ({ one }) => ({
  barberia: one(barberias, { fields: [detallesTransaccion.tenantId], references: [barberias.id] }),
  transaccion: one(transacciones, { fields: [detallesTransaccion.transaccionId], references: [transacciones.id] }),
  servicio: one(servicios, { fields: [detallesTransaccion.servicioId], references: [servicios.id] }),
  producto: one(productos, { fields: [detallesTransaccion.productoId], references: [productos.id] }),
}));
