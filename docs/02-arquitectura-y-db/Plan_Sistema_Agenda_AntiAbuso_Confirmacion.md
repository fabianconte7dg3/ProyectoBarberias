# Sistema de Agenda — Anti-abuso, Confirmación y Migración de Clientes (Diseño, aprobado — no implementado)

> **Fecha:** 2026-07-24
> **Estado:** ✅ Diseño acordado con el usuario vía entrevista (2 rondas, ver sección 7) · 🔲 Sin implementar
> **Alcance:** requerimientos de negocio sobre el sistema de agenda, verificados contra el código real
> antes de diseñar nada — varios ya existen parcial o totalmente, otros son gaps reales, y uno es un
> hallazgo de un mensaje que promete una función que el backend no cumple hoy.

## 0. Qué ya existe (verificado en código, no asumido)

| Requerimiento pedido | Estado real |
|---|---|
| Calendario que muestre horarios ocupados | ✅ `GET /horarios/disponibilidad` (público) ya existe, usado por portal web y bot de WhatsApp |
| Evitar doble reserva del mismo slot | ✅ `bloqueosTemporales` (lock de 3 min) + `EXCLUDE` constraint en Postgres |
| Importación masiva de clientes (CSV/Excel) | ✅ `POST /importaciones/clientes` (admin), con parser dedicado |
| Carga manual de cliente uno por uno | ✅ CRUD normal (`POST /clientes`) ya existe |
| Campo para bloquear cliente | 🟡 Existe el campo (`clientes.bloqueado`) pero **nada lo verifica** al reservar — el toggle del admin hoy no tiene efecto real |
| Contador de inasistencias | 🟡 Existe (`ausenciasStrikes`, se incrementa automáticamente) pero sin fechas ni umbral de acción |
| Confirmación de cita por WhatsApp | 🔴 **El mensaje ya le pide al cliente "responde 1 para Confirmar"**, pero el webhook que procesa la respuesta no está conectado a esa cita — interpreta cualquier "1" como "quiero agendar una cita nueva". Es una promesa rota, no solo una función faltante. |
| Actualización del calendario sin recargar | 🔴 No existe — hoy es fetch-on-load |
| "1 cita activa por teléfono" | 🔴 No existe |
| Nombre/motivo obligatorios al reservar | 🟡 Teléfono obligatorio, nombre opcional, motivo no existe como campo |

## 1. Calendario en tiempo real (push, no solo fetch-on-load)

**Decisión:** sí se necesita actualización automática sin recargar.

- Nuevo: endpoint `GET /horarios/disponibilidad/stream` con **Server-Sent Events** (`@Sse()` de NestJS),
  no WebSockets — la comunicación es unidireccional (servidor → cliente), SSE es más simple y no agrega
  una dependencia nueva tipo Socket.IO.
- `citas.service.ts` y `horarios.service.ts` emiten un evento interno (`@nestjs/event-emitter`,
  `EventEmitter2`) cada vez que se crea/cancela una cita o un bloqueo temporal, con `{ tenantId,
  empleadoId, fecha }`. El endpoint SSE filtra y reenvía solo los eventos del `empleadoId`+`fecha` que
  el cliente está mirando.
- Frontend (`TimeSlotGrid`): abre un `EventSource` además del fetch inicial; al recibir un evento,
  vuelve a pedir la disponibilidad de ese slot (o la actualiza optimistamente).
- **Límite conocido, documentado a propósito:** esta implementación usa un `EventEmitter2` en memoria del
  proceso de Node — funciona perfecto con un solo servidor de `apps/api` (que es lo que hay hoy). Si en
  el futuro el backend se escala horizontalmente (2+ instancias detrás de un load balancer, Fase 5 del
  roadmap de producción), los eventos de una instancia no llegarían a clientes conectados a otra — en ese
  momento habría que enrutar los eventos vía Redis pub/sub (ya hay `ioredis` en el proyecto para BullMQ,
  es una extensión natural, no una tecnología nueva). No bloquea implementar esto ahora, pero hay que
  recordarlo si se escala.

## 2. Confirmación obligatoria (WhatsApp + link web de respaldo)

**Decisión:** ambos canales — WhatsApp como principal, un link web como respaldo si el cliente no
confirma por ahí.

### Diseño

- `schema.ts`: `citas.confirmada` (boolean, default `false`) — **no** se modela como un valor nuevo de
  `estado_cita`, para no interferir con la máquina de estados existente (`programada` → `completada`/
  `cancelada`/`ausente_strike`). Es un flag independiente.
- `citas.confirmacionSolicitadaEn` (timestamptz, nullable) — cuándo se envió el pedido de confirmación,
  para no reenviar duplicado si el job corre dos veces.
- `barberias.horasAntesConfirmacion` (integer, default `4`) — configurable por tenant, mismo patrón que
  otras columnas de configuración ya agregadas (terminología, campos personalizados). Un valor por
  defecto razonable, editable si un negocio prefiere una ventana distinta.
- **Nuevo job BullMQ** `solicitar_confirmacion`, encolado al crear la cita con `delay = inicioEstimado -
  horasAntesConfirmacion` (mismo patrón que `recordatorio_24h`/`cancelacion_retraso` ya existentes en
  `citas.service.ts:crearCita`). Envía WhatsApp con el link de confirmación, reutilizando el mecanismo de
  token que **ya existe** en `citas` (`tokenCliente`/`tokenExpiraEn`, hoy usado para cancelar) — el mismo
  patrón sirve para confirmar, sin inventar un sistema de tokens nuevo.
- **Nuevo endpoint público** `POST /citas/publica/:id/confirmar?token=...` — valida el token, setea
  `confirmada = true`.
- **Nuevo job** `liberar_si_no_confirmo`, encolado con un pequeño margen después del deadline de
  confirmación. Si `confirmada` sigue en `false`, cancela la cita (`estado = 'cancelada'`) liberando el
  slot — mismo patrón que `cancelacion_retraso` ya existente.
- **Caso borde resuelto por diseño (sin necesidad de preguntar):** si el cliente reserva con **menos**
  tiempo de anticipación que `horasAntesConfirmacion` (ej. reserva a la 1pm para las 2pm con una ventana
  de 4h), no tiene sentido pedir confirmación — no habría tiempo de esperar respuesta. Regla: si
  `inicioEstimado - now() < horasAntesConfirmacion`, la cita se crea con `confirmada = true` directamente
  (auto-confirmada), sin encolar los jobs de confirmación/liberación.
- **Corrección obligatoria en el webhook existente** (`whatsapp.controller.ts`): hoy cualquier "1"
  entrante se trata como "quiero agendar" sin importar el contexto. Hay que distinguir "el cliente está
  respondiendo al menú general" de "el cliente está respondiendo a un pedido de confirmación de una cita
  específica" — la forma más simple es que el mensaje de confirmación incluya el link (no solo pida
  responder "1"), y que el texto del recordatorio dejar de prometer una función de respuesta numérica que
  hoy no existe conectada a la cita.

## 3. Auto-bloqueo de clientes — solo alertar, no bloquear automático

**Decisión:** el sistema nunca bloquea solo. Se mantiene 100% como decisión manual del admin, pero se le
muestra una alerta cuando corresponde.

### Diseño

- **Cerrar el gap de enforcement que ya existe** (esto no fue parte de la pregunta, pero es necesario de
  todas formas): si un admin ya marcó `cliente.bloqueado = true` manualmente (el campo/toggle ya existe
  hoy), la reserva pública debe **respetarlo** — hoy no lo hace. `crearCitaPublica` valida
  `cliente.bloqueado` antes de crear la cita y rechaza con un mensaje claro si es `true`. Sin esto, el
  toggle del admin sigue siendo decorativo.
- **Alerta, no bloqueo automático:** cuando el staff crea una cita manual o abre la ficha de un cliente
  con historial de inasistencias relevante, se muestra un badge/alerta (ej. "⚠️ 4 inasistencias
  registradas") — dato ya disponible una vez exista la tabla `inasistencias` (sección 5). No hay lógica
  de umbral automática que backend decida por el negocio.

## 4. "1 cita activa por teléfono"

**Decisión:** solo bloquea 2+ reservas **sin confirmar** a la vez — no todas las citas futuras.

### Diseño

- En `crearCitaPublica` (solo la vía pública — el staff creando citas manuales no está sujeto a esta
  regla, porque ya tiene contexto real del cliente frente a él): antes de crear, verificar si existe una
  cita con `estado = 'programada' AND confirmada = false` para el mismo `clienteId`/`telefonoWhatsapp`.
  Si existe, rechazar con `409 ConflictException` y un mensaje claro ("ya tienes una reserva pendiente de
  confirmar; confírmala o espera a que se libere para agendar otra").
- Se apoya directamente en el campo `confirmada` de la sección 2 — una vez que una cita se confirma, deja
  de contar para esta regla, permitiendo que el cliente agende otra (ej. su próximo corte recurrente).

## 5. Historial de inasistencias con fechas

**Decisión:** fechas específicas, no solo el contador.

```sql
CREATE TABLE inasistencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES barberias(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  cita_id UUID NOT NULL REFERENCES citas(id),
  fecha TIMESTAMPTZ NOT NULL, -- inicioEstimado de la cita a la que faltó
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- Se inserta una fila en los mismos dos puntos donde hoy se incrementa `ausenciasStrikes`
  (`citas.service.ts:cambiarEstado` y `citas.processor.ts:handleCancelacionRetraso`) — **el contador se
  mantiene** (consultas simples más rápidas), respaldado ahora por el detalle real.
- Nuevo endpoint de reportes: fechas de inasistencia por cliente, no solo el total.

## 6. Campos obligatorios al reservar

**Decisión:** nombre obligatorio para todos los verticales; motivo obligatorio solo en clínica/veterinaria.

- `CreateClienteDto.nombreCompleto`: pasa de `@IsOptional()` a requerido.
- `citas.notas` (ya existe desde la Fase 1) se usa como "motivo". Validación **a nivel de aplicación**,
  no del DTO (el DTO no conoce la industria del tenant sin una consulta extra): en
  `crearCita`/`crearCitaPublica`, si `tenant.industria` es `veterinaria` o `clinica_medica` y no viene
  `notas`, se rechaza con `400 BadRequestException`. Barbería/salón no lo exigen — el servicio elegido ya
  es el "motivo".

## 7. Migración de historial de citas pasadas

**Decisión:** también cargar visitas/citas pasadas, no solo datos de contacto.

- Extender `POST /importaciones/:tipo` (ya existe) con un nuevo `tipo = 'citas_historicas'` — filas con
  cliente (matcheado por teléfono), servicio, fecha, y estado (normalmente `completada`, son visitas ya
  ocurridas).
- **Importante:** estas citas importadas **no deben encolar los jobs normales** (`recordatorio_24h`,
  `solicitar_confirmacion`, etc.) porque son fechas pasadas — el processor de importación las inserta
  directamente en `citas` sin pasar por `citasService.crearCita()` (que sí encola jobs), o se agrega un
  flag `esHistorica` que el servicio respeta para saltarse el encolado.
- A definir en implementación: si las citas históricas importadas deben sumar a
  `clientes.totalAsistencias`/`totalGastado` — probablemente sí, para que el negocio vea reflejado
  "cliente frecuente desde hace 2 años" en reportes desde el primer día.

## 8. Registro de la entrevista (2 rondas)

**Ronda 1:**
1. *¿Calendario en tiempo real literal o basta con que sea correcto al cargar?* → "Necesito actualización automática sin recargar".
2. *¿Confirmación solo WhatsApp o también link web?* → "Ambos: WhatsApp con link de respaldo".
3. *¿Umbral de auto-bloqueo y quién puede saltárselo?* → "No bloquear automáticamente, solo alertar al staff".
4. *¿"1 cita activa" bloquea todas las futuras o solo sin confirmar?* → "Solo bloquea 2+ sin confirmar a la vez".

**Ronda 2:**
5. *¿Nombre/motivo obligatorios para todos los verticales o depende?* → "Motivo obligatorio solo en clínica/veterinaria".
6. *¿Contador de inasistencias alcanza o se necesitan fechas?* → "Fechas de cada inasistencia".
7. *¿Importación solo de contacto o también historial de citas pasadas?* → "También cargar visitas/citas pasadas".

## 9. Siguiente paso

Diseño aprobado, **no implementado**. Ver [`plan.md`](../plan.md), Fase 2 §2.3, para las tareas chicas
ejecutables. El endpoint SSE (sección 1) es la pieza de mayor riesgo técnico nuevo — es la única que
introduce un mecanismo de comunicación que no existe hoy en el proyecto (todo lo demás es REST +
BullMQ, patrones ya usados).
