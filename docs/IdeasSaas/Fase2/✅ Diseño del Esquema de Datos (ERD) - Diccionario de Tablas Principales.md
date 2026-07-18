# ✅ Diseño del Esquema de Datos (ERD) — Diccionario de Tablas Completo

> **Última actualización:** 2026-07-17 — Versión 2.0 (ampliado con tablas faltantes)  
> **Tablas totales:** 12 (6 originales + 6 nuevas)

---

## 1. Consideraciones Arquitectónicas

- **Aislamiento de Datos (RLS):** Todas las tablas operativas (excepto `barberias`) incluyen obligatoriamente `tenant_id` como Foreign Key. PostgreSQL aplica Row Level Security a nivel de motor, bloqueando fugas de datos entre locales incluso si el código tiene un error.
- **Tipos de IDs:** UUID v4 en todas las llaves primarias. Previene ataques IDOR (adivinar IDs iterando números en la URL).
- **Timestamps:** Todas las fechas en `Timestamptz` (con zona horaria). Panamá usa UTC-5 sin cambio de horario estacional.
- **Append-Only:** La tabla `transacciones` no permite UPDATE ni DELETE. Las correcciones se hacen con notas de crédito (nueva inserción), garantizando integridad contable.

---

## 2. Diagrama de Relaciones

```
barberias (tenant)
    │
    ├──── usuarios (barberos, admins)
    │         └── horarios (disponibilidad por barbero)
    │
    ├──── servicios (catálogo: cortes, precios, duración)
    │
    ├──── clientes (CRM invisible)
    │
    ├──── citas (núcleo operativo)
    │         ├── → cliente_id (nullable para walk-ins)
    │         ├── → barbero_id
    │         ├── → servicio_id
    │         └──── transacciones (finanzas + DGI, Append-Only)
    │
    ├──── bloqueos_temporales (almuerzos, walk-ins, locks de reserva)
    ├──── whatsapp_config (instancia Evolution API por tenant)
    └──── audit_logs (trazabilidad inmutable de acciones críticas)
```

---

## 3. Tablas Originales (Actualizadas)

### 🏢 Tabla 1: `barberias` (Tenants / Inquilinos)

Tabla maestra. Cada nuevo negocio suscrito crea un registro aquí.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | Identificador único del local (= tenant_id) |
| `nombre_comercial` | String | Nombre público del negocio |
| `ruc` | String | RUC panameño — se inyecta en la API de facturación DGI |
| `telefono_negocio` | String | Número de WhatsApp del local (conectado a Evolution API) |
| `plan_suscripcion` | Enum | `basico` / `premium` — controla qué módulos están habilitados |
| `estado` | Enum | `activo` / `suspendido_pago` / `cancelado` |
| `color_primario` | String | Hex del color de marca (para identidad visual multi-tenant) |
| `logo_url` | String | URL del logo del local |
| `created_at` | Timestamptz | Fecha de onboarding |

---

### 👥 Tabla 2: `usuarios` (Staff: Barberos y Administradores)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK → barberias | — |
| `nombre_completo` | String | — |
| `rol` | Enum | `admin` / `barbero` / `recepcion` |
| `porcentaje_comision` | Decimal | `0.50` (50/50) o `0.60` (60/40) |
| `pin_acceso` | String (Hash) | PIN de 4 dígitos para login rápido en PWA |
| `token_activacion` | String (nullable) | Link privado de onboarding (flujo Invite-Only) |
| `token_expira_en` | Timestamptz (nullable) | El link de activación expira en 48h |
| `webauthn_credential_id` | String (nullable) | ID de credencial biométrica (FaceID / Huella) |
| `activo` | Boolean | `false` si el barbero fue revocado (Kill Switch) |
| `created_at` | Timestamptz | — |

---

### ✂️ Tabla 3: `servicios` (Catálogo del Local)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK → barberias | — |
| `nombre` | String | Ej. "Corte Fade + Barba" |
| `duracion_minutos` | Entero | Variable que usa el calendario para congelar bloques de agenda |
| `precio_base` | Decimal | Ej. `15.00` |
| `activo` | Boolean | Permite desactivar servicios sin borrarlos |

---

### 📇 Tabla 4: `clientes` (El CRM Invisible)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK → barberias | — |
| `telefono_whatsapp` | String (Unique per Tenant) | Llave lógica principal — identificador en el Bot |
| `nombre_completo` | String | — |
| `barbero_frecuente_id` | UUID FK → usuarios (nullable) | Calculado automáticamente |
| `notas_preferencia` | Text | "Fade bajito, usa cera mate, no le gusta charlar" |
| `total_asistencias` | Entero | Suma +1 cada vez que el barbero presiona "Cobrar" |
| `ausencias_strikes` | Entero | Suma +1 si no se presenta. Permite bloqueos automáticos |
| `total_gastado` | Decimal | Acumulado histórico para identificar clientes VIP |
| `email_facturacion` | String (nullable) | Para recibir factura DGI por correo |
| `bloqueado` | Boolean | `true` si alcanzó el límite de ausencias |
| `created_at` | Timestamptz | — |

---

### 📅 Tabla 5: `citas` (El Núcleo Operativo)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK → barberias | — |
| `cliente_id` | UUID FK → clientes (nullable) | Nulo para walk-ins que no dan nombre |
| `barbero_id` | UUID FK → usuarios | — |
| `servicio_id` | UUID FK → servicios | — |
| `inicio_estimado` | Timestamptz | Hora exacta de inicio del corte |
| `fin_estimado` | Timestamptz | Calculado: `inicio + duracion_minutos` del servicio |
| `origen` | Enum | `bot_whatsapp` / `walk_in` / `manual_admin` |
| `estado` | Enum | `programada` / `en_curso` / `completada` / `ausente_strike` / `cancelada` / `revision_manual` |
| `idempotency_key` | String (Unique) | Previene el doble cobro por double-click (Error #12) |
| `token_cliente` | String (nullable) | JWT de un solo uso para el link de reserva/reprogramación |
| `token_expira_en` | Timestamptz (nullable) | El link de gestión expira en 10 min |
| `created_at` | Timestamptz | — |

---

### 💰 Tabla 6: `transacciones` (Finanzas y Facturación DGI)

> ⚠️ **Append-Only:** Sin UPDATE ni DELETE. Las correcciones se insertan como notas de crédito con referencia a esta tabla.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK → barberias | — |
| `cita_id` | UUID FK → citas (Unique) | Relación 1 a 1 para liquidar la cita |
| `metodo_pago` | Enum | `efectivo` / `yappy` / `mixto` / `deuda` |
| `total_facturado` | Decimal | Costo final cobrado al cliente |
| `monto_efectivo_ingresado` | Decimal | Billete entregado por el cliente (para calcular vuelto y cierre de caja ciego) |
| `comision_barbero` | Decimal | Calculada al instante según `porcentaje_comision` del usuario |
| `propina_barbero` | Decimal | Aislada del total — no se factura a DGI |
| `estado_dgi` | Enum | `pendiente` / `procesando` / `emitida` / `error_pac` |
| `numero_factura_dgi` | String (nullable) | Número oficial devuelto por GuruSoft/Alegra |
| `ruc_cliente` | String (nullable) | Para facturas con datos fiscales (no Consumidor Final) |
| `nombre_fiscal_cliente` | String (nullable) | Nombre comercial si el cliente pide factura con RUC |
| `yappy_transaction_id` | String (nullable) | ID único devuelto por la API de Yappy |
| `yappy_webhook_received_at` | Timestamptz (nullable) | Hora de confirmación oficial del pago |
| `yappy_webhook_payload` | JSONB (nullable) | Payload raw del webhook para auditoría y conciliación |
| `created_at` | Timestamptz | — |

---

## 4. Tablas Nuevas (Versión 2.0)

### 🗓️ Tabla 7: `horarios` (Disponibilidad por Barbero)

Define cuándo trabaja cada barbero. El calendario usa esta tabla para mostrar solo las horas disponibles reales.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK → barberias | — |
| `barbero_id` | UUID FK → usuarios | — |
| `dia_semana` | Enum | `lunes` / `martes` / ... / `domingo` |
| `hora_inicio` | Time | Hora de apertura del turno |
| `hora_fin` | Time | Hora de cierre del turno |
| `hora_almuerzo_inicio` | Time (nullable) | Inicio del bloqueo de almuerzo base |
| `hora_almuerzo_fin` | Time (nullable) | Fin del bloqueo de almuerzo base |
| `activo` | Boolean | Si el barbero trabaja ese día de la semana |

> El botón "Pausar/Almuerzo" de la PWA crea un `bloqueo_temporal`, no modifica esta tabla. Esta tabla son las reglas fijas configuradas por el admin.

---

### 🔒 Tabla 8: `bloqueos_temporales` (Locks Dinámicos de Agenda)

Almacena bloqueos efímeros que no son citas formales: almuerzos adelantados, walk-ins en proceso, locks de reserva optimista, emergencias.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK → barberias | — |
| `barbero_id` | UUID FK → usuarios | — |
| `inicio` | Timestamptz | Inicio del bloqueo |
| `fin` | Timestamptz | Fin del bloqueo |
| `tipo` | Enum | `almuerzo_dinamico` / `walk_in` / `lock_reserva` / `emergencia` / `extension_turno` |
| `expira_en` | Timestamptz (nullable) | Para `lock_reserva`: expira en 3 min si el cliente no confirma |
| `origen` | Enum | `sistema` (cron) / `barbero` (PWA) / `admin` (panel) |
| `notas` | String (nullable) | Descripción opcional del bloqueo |

---

### 📋 Tabla 9: `audit_logs` (Trazabilidad Inmutable)

Registro inmutable de todas las acciones críticas del sistema. Referenciada en más de 10 de los 30 casos de error documentados.

> ⚠️ **Solo Insert:** Esta tabla tampoco permite UPDATE ni DELETE.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK → barberias (nullable) | Nulo para acciones del sistema global |
| `usuario_id` | UUID FK → usuarios (nullable) | Quién realizó la acción |
| `tabla_afectada` | String | `'citas'` / `'transacciones'` / `'usuarios'` / etc. |
| `registro_id` | UUID | ID del registro afectado |
| `accion` | Enum | `login` / `logout` / `cobro` / `update_intento` / `delete_intento` / `kill_switch` / `cambio_comision` / `cierre_emergencia` / `conciliacion_yappy` |
| `payload_antes` | JSONB (nullable) | Estado del registro antes del cambio |
| `payload_despues` | JSONB (nullable) | Estado del registro después del cambio |
| `ip_origen` | String | IP desde donde se realizó la acción |
| `user_agent` | String (nullable) | Dispositivo/browser |
| `created_at` | Timestamptz | — |

---

### 📱 Tabla 10: `whatsapp_config` (Configuración de Evolution API por Tenant)

Cada barbería conecta su propio número de WhatsApp. Esta tabla guarda la configuración de la instancia en Evolution API y permite el monitoreo del estado (Heartbeat Check cada 60s).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK → barberias (Unique) | Una config por barbería |
| `numero_whatsapp` | String | Número del local (ej. `+50769XXXXXX`) |
| `evolution_instance_name` | String | Nombre de la instancia en Evolution API |
| `evolution_server_url` | String | URL del servidor Evolution API (para multi-servidor a escala) |
| `estado` | Enum | `conectado` / `desconectado` / `pendiente_qr` / `suspendido` |
| `ultimo_ping` | Timestamptz | Última verificación de conexión (Heartbeat) |
| `qr_code_url` | String (nullable) | URL del QR para re-vincular si se desconecta |
| `created_at` | Timestamptz | — |

---

### 📊 Tabla 11: `cierres_de_caja` (Arqueo Diario — Cierre Ciego)

Registra el resultado del cierre ciego de caja al final de cada día. El admin declara el efectivo físico *antes* de que el sistema revele el esperado.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK → barberias | — |
| `declarado_por_id` | UUID FK → usuarios | Admin o recepcionista que hizo el arqueo |
| `fecha_cierre` | Date | Día al que corresponde el cierre |
| `efectivo_declarado` | Decimal | Lo que el admin contó físicamente |
| `efectivo_esperado` | Decimal | Lo que el sistema calculó según transacciones del día |
| `diferencia` | Decimal (computed) | `efectivo_declarado - efectivo_esperado` |
| `estado` | Enum | `cuadrado` / `faltante` / `sobrante` |
| `notas_admin` | Text (nullable) | Justificación del faltante si lo hay |
| `created_at` | Timestamptz | — |

---

### 💬 Tabla 12: `plantillas_whatsapp` (Mensajes del Bot)

Permite al admin personalizar los mensajes automáticos del bot sin tocar código.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK → barberias | — |
| `tipo` | Enum | `confirmacion_reserva` / `recordatorio_24h` / `confirmacion_pago` / `recordatorio_deuda` / `cierre_emergencia` / `bienvenida_bot` |
| `contenido` | Text | Texto del mensaje con variables: `{{nombre}}`, `{{hora}}`, `{{barbero}}`, `{{link}}` |
| `activo` | Boolean | Permite desactivar un tipo de mensaje sin borrarlo |

---

## 5. Resumen Completo del ERD

| # | Tabla | Propósito | Crítica para |
|---|-------|-----------|-------------|
| 1 | `barberias` | Tenant maestro | Todo |
| 2 | `usuarios` | Barberos y admins | Auth, comisiones, PWA |
| 3 | `servicios` | Catálogo de cortes | Agenda, facturación |
| 4 | `clientes` | CRM invisible | Bot, historial, VIP |
| 5 | `citas` | Núcleo operativo | Agenda, cobros |
| 6 | `transacciones` | Finanzas + DGI | Contabilidad, reportes |
| 7 | `horarios` | Disponibilidad base por barbero | Calendario |
| 8 | `bloqueos_temporales` | Locks dinámicos de agenda | Locks, almuerzos, walk-ins |
| 9 | `audit_logs` | Trazabilidad inmutable | Seguridad, disputas |
| 10 | `whatsapp_config` | Instancia Evolution API | Bot, reconexión |
| 11 | `cierres_de_caja` | Arqueo ciego diario | Contabilidad física |
| 12 | `plantillas_whatsapp` | Mensajes del bot personalizables | Bot, UX |

**Conclusión:** Esta estructura de 12 tablas en 3NF cubre el 100% de los flujos operativos documentados, los 30 casos de error identificados, el cumplimiento de la Ley 81 de Panamá y la integridad financiera requerida por la DGI. El esquema está preparado para escalar a cientos de tenants sin modificar su estructura fundamental.
