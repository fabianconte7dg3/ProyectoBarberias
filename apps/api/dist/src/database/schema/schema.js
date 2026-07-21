"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transaccionesRelations = exports.citasRelations = exports.clientesRelations = exports.usuariosRelations = exports.barberiasRelations = exports.yappyConfig = exports.plantillasWhatsapp = exports.cierresDeCaja = exports.whatsappConfig = exports.auditLogs = exports.bloqueosTemporales = exports.horarios = exports.transacciones = exports.citas = exports.clientes = exports.servicios = exports.usuarios = exports.barberias = exports.yappyModoEnum = exports.tipoPlantillaEnum = exports.estadoCierreEnum = exports.estadoWhatsappEnum = exports.accionAuditEnum = exports.origenBloqueoEnum = exports.tipoBloqueoEnum = exports.estadoDgiEnum = exports.metodoPagoEnum = exports.estadoCitaEnum = exports.origenCitaEnum = exports.diaSemanaEnum = exports.rolUsuarioEnum = exports.estadoBarberiaEnum = exports.planSuscripcionEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.planSuscripcionEnum = (0, pg_core_1.pgEnum)('plan_suscripcion', ['basico', 'premium']);
exports.estadoBarberiaEnum = (0, pg_core_1.pgEnum)('estado_barberia', ['activo', 'suspendido_pago', 'cancelado']);
exports.rolUsuarioEnum = (0, pg_core_1.pgEnum)('rol_usuario', ['admin', 'barbero', 'recepcion']);
exports.diaSemanaEnum = (0, pg_core_1.pgEnum)('dia_semana', [
    'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
]);
exports.origenCitaEnum = (0, pg_core_1.pgEnum)('origen_cita', ['bot_whatsapp', 'walk_in', 'manual_admin']);
exports.estadoCitaEnum = (0, pg_core_1.pgEnum)('estado_cita', [
    'programada', 'en_curso', 'completada', 'ausente_strike', 'cancelada', 'revision_manual',
]);
exports.metodoPagoEnum = (0, pg_core_1.pgEnum)('metodo_pago', ['efectivo', 'yappy', 'mixto', 'deuda']);
exports.estadoDgiEnum = (0, pg_core_1.pgEnum)('estado_dgi', ['pendiente', 'procesando', 'emitida', 'error_pac']);
exports.tipoBloqueoEnum = (0, pg_core_1.pgEnum)('tipo_bloqueo', [
    'almuerzo_dinamico', 'walk_in', 'lock_reserva', 'emergencia', 'extension_turno',
]);
exports.origenBloqueoEnum = (0, pg_core_1.pgEnum)('origen_bloqueo', ['sistema', 'barbero', 'admin']);
exports.accionAuditEnum = (0, pg_core_1.pgEnum)('accion_audit', [
    'login', 'logout', 'cobro', 'update_intento', 'delete_intento',
    'kill_switch', 'cambio_comision', 'cierre_emergencia', 'conciliacion_yappy',
]);
exports.estadoWhatsappEnum = (0, pg_core_1.pgEnum)('estado_whatsapp', [
    'conectado', 'desconectado', 'pendiente_qr', 'suspendido',
]);
exports.estadoCierreEnum = (0, pg_core_1.pgEnum)('estado_cierre', ['cuadrado', 'faltante', 'sobrante']);
exports.tipoPlantillaEnum = (0, pg_core_1.pgEnum)('tipo_plantilla', [
    'confirmacion_reserva', 'recordatorio_24h', 'confirmacion_pago',
    'recordatorio_deuda', 'cierre_emergencia', 'bienvenida_bot',
]);
exports.yappyModoEnum = (0, pg_core_1.pgEnum)('yappy_modo', ['manual', 'comercial']);
exports.barberias = (0, pg_core_1.pgTable)('barberias', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    nombreComercial: (0, pg_core_1.varchar)('nombre_comercial', { length: 255 }).notNull(),
    ruc: (0, pg_core_1.varchar)('ruc', { length: 50 }),
    telefonoNegocio: (0, pg_core_1.varchar)('telefono_negocio', { length: 30 }),
    planSuscripcion: (0, exports.planSuscripcionEnum)('plan_suscripcion').notNull().default('basico'),
    estado: (0, exports.estadoBarberiaEnum)('estado').notNull().default('activo'),
    slug: (0, pg_core_1.varchar)('slug', { length: 255 }).notNull().unique(),
    killSwitchActivo: (0, pg_core_1.boolean)('kill_switch_activo').notNull().default(false),
    colorPrimario: (0, pg_core_1.varchar)('color_primario', { length: 7 }),
    logoUrl: (0, pg_core_1.text)('logo_url'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
exports.usuarios = (0, pg_core_1.pgTable)('usuarios', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull().references(() => exports.barberias.id, { onDelete: 'cascade' }),
    nombreCompleto: (0, pg_core_1.varchar)('nombre_completo', { length: 255 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).unique(),
    password: (0, pg_core_1.varchar)('password', { length: 255 }),
    rol: (0, exports.rolUsuarioEnum)('rol').notNull(),
    porcentajeComision: (0, pg_core_1.decimal)('porcentaje_comision', { precision: 4, scale: 2 }),
    pinAcceso: (0, pg_core_1.varchar)('pin_acceso', { length: 255 }),
    tokenActivacion: (0, pg_core_1.varchar)('token_activacion', { length: 255 }),
    tokenExpiraEn: (0, pg_core_1.timestamp)('token_expira_en', { withTimezone: true }),
    webauthnCredentialId: (0, pg_core_1.text)('webauthn_credential_id'),
    activo: (0, pg_core_1.boolean)('activo').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
exports.servicios = (0, pg_core_1.pgTable)('servicios', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull().references(() => exports.barberias.id, { onDelete: 'cascade' }),
    nombre: (0, pg_core_1.varchar)('nombre', { length: 255 }).notNull(),
    duracionMinutos: (0, pg_core_1.integer)('duracion_minutos').notNull(),
    precioBase: (0, pg_core_1.decimal)('precio_base', { precision: 10, scale: 2 }).notNull(),
    activo: (0, pg_core_1.boolean)('activo').notNull().default(true),
});
exports.clientes = (0, pg_core_1.pgTable)('clientes', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull().references(() => exports.barberias.id, { onDelete: 'cascade' }),
    telefonoWhatsapp: (0, pg_core_1.varchar)('telefono_whatsapp', { length: 30 }).notNull(),
    nombreCompleto: (0, pg_core_1.varchar)('nombre_completo', { length: 255 }),
    barberoFrecuenteId: (0, pg_core_1.uuid)('barbero_frecuente_id').references(() => exports.usuarios.id),
    notasPreferencia: (0, pg_core_1.text)('notas_preferencia'),
    totalAsistencias: (0, pg_core_1.integer)('total_asistencias').notNull().default(0),
    ausenciasStrikes: (0, pg_core_1.integer)('ausencias_strikes').notNull().default(0),
    totalGastado: (0, pg_core_1.decimal)('total_gastado', { precision: 12, scale: 2 }).notNull().default('0'),
    emailFacturacion: (0, pg_core_1.varchar)('email_facturacion', { length: 255 }),
    bloqueado: (0, pg_core_1.boolean)('bloqueado').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    telefonoPorTenantUnico: (0, pg_core_1.unique)().on(table.tenantId, table.telefonoWhatsapp),
}));
exports.citas = (0, pg_core_1.pgTable)('citas', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull().references(() => exports.barberias.id, { onDelete: 'cascade' }),
    clienteId: (0, pg_core_1.uuid)('cliente_id').references(() => exports.clientes.id),
    barberoId: (0, pg_core_1.uuid)('barbero_id').notNull().references(() => exports.usuarios.id),
    servicioId: (0, pg_core_1.uuid)('servicio_id').notNull().references(() => exports.servicios.id),
    inicioEstimado: (0, pg_core_1.timestamp)('inicio_estimado', { withTimezone: true }).notNull(),
    finEstimado: (0, pg_core_1.timestamp)('fin_estimado', { withTimezone: true }).notNull(),
    inicioReal: (0, pg_core_1.timestamp)('inicio_real', { withTimezone: true }),
    finReal: (0, pg_core_1.timestamp)('fin_real', { withTimezone: true }),
    origen: (0, exports.origenCitaEnum)('origen').notNull(),
    estado: (0, exports.estadoCitaEnum)('estado').notNull().default('programada'),
    idempotencyKey: (0, pg_core_1.varchar)('idempotency_key', { length: 255 }).notNull().unique(),
    tokenCliente: (0, pg_core_1.varchar)('token_cliente', { length: 255 }),
    tokenExpiraEn: (0, pg_core_1.timestamp)('token_expira_en', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
exports.transacciones = (0, pg_core_1.pgTable)('transacciones', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull().references(() => exports.barberias.id, { onDelete: 'cascade' }),
    citaId: (0, pg_core_1.uuid)('cita_id').notNull().unique().references(() => exports.citas.id),
    metodoPago: (0, exports.metodoPagoEnum)('metodo_pago').notNull(),
    totalFacturado: (0, pg_core_1.decimal)('total_facturado', { precision: 10, scale: 2 }).notNull(),
    montoEfectivoIngresado: (0, pg_core_1.decimal)('monto_efectivo_ingresado', { precision: 10, scale: 2 }),
    comisionBarbero: (0, pg_core_1.decimal)('comision_barbero', { precision: 10, scale: 2 }).notNull(),
    propinaBarbero: (0, pg_core_1.decimal)('propina_barbero', { precision: 10, scale: 2 }).notNull().default('0'),
    estadoDgi: (0, exports.estadoDgiEnum)('estado_dgi').notNull().default('pendiente'),
    numeroFacturaDgi: (0, pg_core_1.varchar)('numero_factura_dgi', { length: 100 }),
    rucCliente: (0, pg_core_1.varchar)('ruc_cliente', { length: 50 }),
    nombreFiscalCliente: (0, pg_core_1.varchar)('nombre_fiscal_cliente', { length: 255 }),
    yappyOrderId: (0, pg_core_1.varchar)('yappy_order_id', { length: 15 }),
    yappyTransactionId: (0, pg_core_1.varchar)('yappy_transaction_id', { length: 255 }),
    yappyWebhookReceivedAt: (0, pg_core_1.timestamp)('yappy_webhook_received_at', { withTimezone: true }),
    yappyWebhookPayload: (0, pg_core_1.jsonb)('yappy_webhook_payload'),
    confirmadoPorId: (0, pg_core_1.uuid)('confirmado_por_id').references(() => exports.usuarios.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
exports.horarios = (0, pg_core_1.pgTable)('horarios', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull().references(() => exports.barberias.id, { onDelete: 'cascade' }),
    barberoId: (0, pg_core_1.uuid)('barbero_id').notNull().references(() => exports.usuarios.id),
    diaSemana: (0, exports.diaSemanaEnum)('dia_semana').notNull(),
    horaInicio: (0, pg_core_1.time)('hora_inicio').notNull(),
    horaFin: (0, pg_core_1.time)('hora_fin').notNull(),
    horaAlmuerzoInicio: (0, pg_core_1.time)('hora_almuerzo_inicio'),
    horaAlmuerzoFin: (0, pg_core_1.time)('hora_almuerzo_fin'),
    activo: (0, pg_core_1.boolean)('activo').notNull().default(true),
});
exports.bloqueosTemporales = (0, pg_core_1.pgTable)('bloqueos_temporales', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull().references(() => exports.barberias.id, { onDelete: 'cascade' }),
    barberoId: (0, pg_core_1.uuid)('barbero_id').notNull().references(() => exports.usuarios.id),
    inicio: (0, pg_core_1.timestamp)('inicio', { withTimezone: true }).notNull(),
    fin: (0, pg_core_1.timestamp)('fin', { withTimezone: true }).notNull(),
    tipo: (0, exports.tipoBloqueoEnum)('tipo').notNull(),
    expiraEn: (0, pg_core_1.timestamp)('expira_en', { withTimezone: true }),
    origen: (0, exports.origenBloqueoEnum)('origen').notNull(),
    notas: (0, pg_core_1.text)('notas'),
});
exports.auditLogs = (0, pg_core_1.pgTable)('audit_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').references(() => exports.barberias.id),
    usuarioId: (0, pg_core_1.uuid)('usuario_id').references(() => exports.usuarios.id),
    tablaAfectada: (0, pg_core_1.varchar)('tabla_afectada', { length: 100 }).notNull(),
    registroId: (0, pg_core_1.uuid)('registro_id').notNull(),
    accion: (0, exports.accionAuditEnum)('accion').notNull(),
    payloadAntes: (0, pg_core_1.jsonb)('payload_antes'),
    payloadDespues: (0, pg_core_1.jsonb)('payload_despues'),
    ipOrigen: (0, pg_core_1.varchar)('ip_origen', { length: 45 }).notNull(),
    userAgent: (0, pg_core_1.text)('user_agent'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
exports.whatsappConfig = (0, pg_core_1.pgTable)('whatsapp_config', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull().unique().references(() => exports.barberias.id, { onDelete: 'cascade' }),
    numeroWhatsapp: (0, pg_core_1.varchar)('numero_whatsapp', { length: 30 }).notNull(),
    evolutionInstanceName: (0, pg_core_1.varchar)('evolution_instance_name', { length: 255 }).notNull(),
    evolutionServerUrl: (0, pg_core_1.text)('evolution_server_url').notNull(),
    estado: (0, exports.estadoWhatsappEnum)('estado').notNull().default('pendiente_qr'),
    ultimoPing: (0, pg_core_1.timestamp)('ultimo_ping', { withTimezone: true }),
    qrCodeUrl: (0, pg_core_1.text)('qr_code_url'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
exports.cierresDeCaja = (0, pg_core_1.pgTable)('cierres_de_caja', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull().references(() => exports.barberias.id, { onDelete: 'cascade' }),
    declaradoPorId: (0, pg_core_1.uuid)('declarado_por_id').notNull().references(() => exports.usuarios.id),
    fechaCierre: (0, pg_core_1.date)('fecha_cierre').notNull(),
    efectivoDeclarado: (0, pg_core_1.decimal)('efectivo_declarado', { precision: 10, scale: 2 }).notNull(),
    efectivoEsperado: (0, pg_core_1.decimal)('efectivo_esperado', { precision: 10, scale: 2 }).notNull(),
    estado: (0, exports.estadoCierreEnum)('estado').notNull(),
    notasAdmin: (0, pg_core_1.text)('notas_admin'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
exports.plantillasWhatsapp = (0, pg_core_1.pgTable)('plantillas_whatsapp', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull().references(() => exports.barberias.id, { onDelete: 'cascade' }),
    tipo: (0, exports.tipoPlantillaEnum)('tipo').notNull(),
    contenido: (0, pg_core_1.text)('contenido').notNull(),
    activo: (0, pg_core_1.boolean)('activo').notNull().default(true),
});
exports.yappyConfig = (0, pg_core_1.pgTable)('yappy_config', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull().unique().references(() => exports.barberias.id, { onDelete: 'cascade' }),
    modo: (0, exports.yappyModoEnum)('modo').notNull().default('manual'),
    numeroPersonal: (0, pg_core_1.varchar)('numero_personal', { length: 30 }),
    merchantId: (0, pg_core_1.varchar)('merchant_id', { length: 255 }),
    secretKeyCifrada: (0, pg_core_1.text)('secret_key_cifrada'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
exports.barberiasRelations = (0, drizzle_orm_1.relations)(exports.barberias, ({ many, one }) => ({
    usuarios: many(exports.usuarios),
    servicios: many(exports.servicios),
    clientes: many(exports.clientes),
    citas: many(exports.citas),
    whatsappConfig: one(exports.whatsappConfig),
    yappyConfig: one(exports.yappyConfig),
}));
exports.usuariosRelations = (0, drizzle_orm_1.relations)(exports.usuarios, ({ one, many }) => ({
    barberia: one(exports.barberias, { fields: [exports.usuarios.tenantId], references: [exports.barberias.id] }),
    horarios: many(exports.horarios),
    citasComoBarbero: many(exports.citas),
}));
exports.clientesRelations = (0, drizzle_orm_1.relations)(exports.clientes, ({ one, many }) => ({
    barberia: one(exports.barberias, { fields: [exports.clientes.tenantId], references: [exports.barberias.id] }),
    barberoFrecuente: one(exports.usuarios, { fields: [exports.clientes.barberoFrecuenteId], references: [exports.usuarios.id] }),
    citas: many(exports.citas),
}));
exports.citasRelations = (0, drizzle_orm_1.relations)(exports.citas, ({ one }) => ({
    barberia: one(exports.barberias, { fields: [exports.citas.tenantId], references: [exports.barberias.id] }),
    cliente: one(exports.clientes, { fields: [exports.citas.clienteId], references: [exports.clientes.id] }),
    barbero: one(exports.usuarios, { fields: [exports.citas.barberoId], references: [exports.usuarios.id] }),
    servicio: one(exports.servicios, { fields: [exports.citas.servicioId], references: [exports.servicios.id] }),
    transaccion: one(exports.transacciones, { fields: [exports.citas.id], references: [exports.transacciones.citaId] }),
}));
exports.transaccionesRelations = (0, drizzle_orm_1.relations)(exports.transacciones, ({ one }) => ({
    barberia: one(exports.barberias, { fields: [exports.transacciones.tenantId], references: [exports.barberias.id] }),
    cita: one(exports.citas, { fields: [exports.transacciones.citaId], references: [exports.citas.id] }),
}));
//# sourceMappingURL=schema.js.map