# Plan de Desarrollo — Volumetrix

> Tareas chicas, tachables una por una. Formato: `[ ]` pendiente, `[x]` hecho. Cuando una fase completa,
> mover el resumen a `docs/04-hitos-y-changelogs/walkthrough.md` y dejar aquí solo el enlace, para que
> este archivo no crezca sin límite.

## Fase 0 — Fundamentos Multi-Industria e Higiene de Repo ✅ Completo

Ya ejecutado y verificado en sesiones anteriores. Detalle completo en cada doc enlazado.

- [x] Esquema: `industria` + `terminologia_empleado/servicio/cliente` en `barberias` —
      [`Plan_Multi_Industria_Schema.md`](./02-arquitectura-y-db/Plan_Multi_Industria_Schema.md)
- [x] Esquema: `datos_adicionales` (jsonb) en `clientes`, `notas` en `citas`
- [x] Rename completo `barbero → empleado` en backend/DB/frontend (51 archivos) —
      [`Plan_Multi_Industria_Fase2_Rename.md`](./02-arquitectura-y-db/Plan_Multi_Industria_Fase2_Rename.md)
- [x] Terminología dinámica real en Portal de Reserva + Panel de Administración —
      [`Plan_Multi_Industria_Fase2D_TerminologiaDinamica.md`](./02-arquitectura-y-db/Plan_Multi_Industria_Fase2D_TerminologiaDinamica.md)
- [x] Fix: sesión de admin/staff se cerraba sola por carrera de hidratación de Zustand
- [x] `node_modules`/`dist`/`.env` sacados del control de versiones (47.890 → 329 archivos trackeados) —
      [`Auditoria_Metodologia_Desarrollo_IA.md`](./01-vision-y-plan/Auditoria_Metodologia_Desarrollo_IA.md)
- [x] Convención de segundo revisor + reglas de commits documentadas en `.agents/AGENTS.md`
- [x] 56 vulnerabilidades de dependencias remediadas (39→0 backend, 17→6 residuales de bajo riesgo) —
      [`Auditoria_Stack_Tecnologico.md`](./02-arquitectura-y-db/Auditoria_Stack_Tecnologico.md)
- [x] Reorganización de `docs/`: documentos de ideación temprana y roadmaps duplicados archivados,
      referencias obsoletas corregidas (ERD de 12→19 tablas, instrucciones de `drizzle-kit` que
      contradecían la política del proyecto, etc.) — ver el propio historial de commits de esta fecha

## Fase 1 — Rebrand: BarberOS → Volumetrix ✅ Completo

Ejecutado y verificado el 2026-07-25. Detalle completo (decisiones resueltas, qué se cambió, qué se
excluyó a propósito, verificación) en
[`Plan_Rebrand_Fase1_BarberOS_a_Volumetrix.md`](./02-arquitectura-y-db/Plan_Rebrand_Fase1_BarberOS_a_Volumetrix.md).

- [x] Infra: contenedores Docker y base de datos renombrados (`barberos`→`volumetrix`), sin pérdida de
      datos (backup previo + `ALTER DATABASE`, verificado con conteo de filas antes/después)
- [x] Backend: `estadoBarberiaEnum`→`estadoTenantEnum`, literales `"BarberOS"` reemplazados, mensajes
      genéricos `"Barbería no encontrada"`→`"Negocio no encontrado"`
- [x] Frontend: ruta `/admin/barberos`→`/admin/empleados` con redirect 308 permanente, 2 componentes de
      SuperAdmin renombrados, 6 literales `"BarberOS"` reemplazados
- [x] Documentación viva actualizada (`CLAUDE.md`, `README_Arquitectura_Datos.md`,
      `Credenciales_QA_Local.md`) con los nuevos nombres de contenedor/DB
- [x] Verificado en navegador real: login admin QA → `/admin/empleados` carga con datos reales, login
      SuperAdmin muestra "Volumetrix SaaS Platform", redirect 308 confirmado por `curl -I`

## Fase 2 — Multi-Industria Funcional 🔶 En progreso (2.1-2.3 completos, 2.4 pendiente)

> **Diseño acordado con el usuario (2026-07-24, vía entrevista) — ver
> [`Plan_Multi_Industria_Fase3_DatosPorVertical.md`](./02-arquitectura-y-db/Plan_Multi_Industria_Fase3_DatosPorVertical.md)
> para el detalle completo y el porqué de cada decisión.**

### 2.1 Modelo de datos por vertical (mascotas/pacientes + historial clínico) ✅ Completo

Ejecutado y verificado el 2026-07-25 (tenant `qa-test` conmutado a `industria='veterinaria'`, smoke test
end-to-end en navegador real: cliente → paciente "Firulais" con campos dinámicos → cita con `pacienteId`
→ cobro con nota clínica → confirmado en DB). Detalle completo del diseño en
[`Plan_Multi_Industria_Fase3_DatosPorVertical.md`](./02-arquitectura-y-db/Plan_Multi_Industria_Fase3_DatosPorVertical.md)
(estado actualizado a implementado, con las notas de la sección siguiente).

- [x] `schema.ts`: nueva tabla `pacientes` (`tenantId`, `clienteId`, `nombre`, `camposPersonalizados`
      jsonb, `activo`)
- [x] `schema.ts`: `citas.pacienteId` (UUID, nullable, FK a `pacientes`)
- [x] `schema.ts`: nueva tabla `notas_clinicas` (`citaId`, `pacienteId`, `empleadoId`, `diagnostico`,
      `tratamiento`, `proximaRevisionEn`, `createdAt`)
- [x] `schema.ts`: `barberias.configCamposPersonalizados` (jsonb, default `[]`)
- [x] Migración SQL idempotente `0012_pacientes_y_notas_clinicas.sql` (2 tablas nuevas + 2 columnas,
      políticas RLS estándar por `tenant_id` en las tablas nuevas; `GRANT` append-only en
      `notas_clinicas`, sin `UPDATE`/`DELETE` — un historial clínico no se edita en silencio)
- [x] Backend: `PacientesModule` (CRUD básico, scoped a `clienteId`)
- [x] Backend: `NotasClinicasModule` con `findFullByCita()` (solo autor, 403 para cualquier otro) y
      `findMetadataByPaciente()` (admin, agregado por paciente en vez de por cita — desviación deliberada
      del diseño original `findMetadataByCita()`, para que la vista de historial del admin muestre todas
      las notas de un paciente de una vez; sigue exponiendo únicamente
      `id/citaId/empleadoId/empleadoNombre/proximaRevisionEn/createdAt`, nunca `diagnostico`/`tratamiento`)
- [x] Backend: plantillas de `configCamposPersonalizados` por defecto según `industria`, aplicadas al
      crear un tenant desde SuperAdmin (`crearTenantManual`)
- [x] Frontend: formulario de paciente (mascota) dentro del flujo de cliente, renderizado dinámicamente
      desde `configCamposPersonalizados` — solo visible cuando el tenant tiene `industria` que lo requiere
- [x] Frontend: captura de nota clínica al cerrar una cita (solo visible/editable por el empleado
      asignado a esa cita)
- [x] Frontend: vista de admin con metadata de notas clínicas (sin contenido) para auditoría/reportes
- [x] Gap encontrado durante la verificación (no listado originalmente): `QuickWalkInModal.tsx` era el
      único camino de creación de citas desde el panel de admin y no tenía selector de paciente —
      cerrado con búsqueda de cliente/pacientes por teléfono (`onBlur`) + `<select>` condicional
- [x] Bug encontrado durante la verificación: `` `/clientes?q=${telefono}` `` sin `encodeURIComponent` —
      un teléfono con `+` (formato usado en toda la app) se decodifica como espacio en el query string del
      lado del servidor, así que la búsqueda de cliente existente fallaba en silencio. Corregido en los 2
      sitios de `QuickWalkInModal.tsx` que tenían el mismo patrón

### 2.2 Combos, citas grupales y templates por vertical ✅ Completo

Ejecutado y verificado el 2026-07-25 (tenant `qa-test` conmutado a veterinaria, smoke test end-to-end en
navegador real: combo de 2 servicios → cita grupal con 2 empleados distintos → cobro conjunto → comisión
verificada línea por línea en DB y en los reportes de "Mi Desempeño"/dashboard). Detalle completo,
decisiones tomadas y desviaciones en
[`Plan_Multi_Industria_Fase4_CombosGruposTemplates.md`](./02-arquitectura-y-db/Plan_Multi_Industria_Fase4_CombosGruposTemplates.md)
(estado actualizado a implementado, con la sección de implementación al final).

**Combos de servicios:**
- [x] `schema.ts`: nuevas tablas `combos` (`nombre`, `precioTotal`, `duracionAjustadaMinutos`, `activo`)
      y `combo_servicios` (`comboId`, `servicioId`, `orden`, `precioAsignado` — con `id` surrogate +
      `unique(comboId, servicioId)` en vez de la PK compuesta propuesta, para seguir la convención del
      resto del esquema)
- [x] `schema.ts`: `citas.servicioId` pasa a nullable; nueva `citas.comboId` (nullable, FK a `combos`)
- [x] Migración SQL idempotente `0013_combos.sql`
- [x] Backend: cálculo de duración de cita cuando es un combo (`combos.duracionAjustadaMinutos` o suma de
      `duracionMinutos` de sus servicios) en `citas.service.ts`
- [x] Backend: al cobrar una cita con `comboId`, generar una fila de `detallesTransaccion` por cada
      servicio del combo (reusa la tabla existente, sin schema nuevo para esto)
- [x] Frontend: gestión de combos en `admin/configuracion`, selector de combo en el flujo de reserva
      pública

**Citas grupales (acompañante):**
- [x] `schema.ts`: `citas.grupoReservaId` (nullable UUID) + índice parcial
- [x] Migración SQL (`0013_combos.sql` para `citas.grupoReservaId`, `0014_citas_grupales_y_cobro_conjunto.sql`
      para `transacciones.grupoReservaId` + `detallesTransaccion.citaId`/`empleadoId`)
- [x] Backend: `crearCitasGrupales()` crea N citas con el mismo `grupoReservaId` (generado en el
      servidor) en una sola transacción SQL — si cualquiera choca con el `EXCLUDE` constraint, toda la
      operación revierte. Nuevos endpoints `POST /citas/grupo` y `POST /citas/grupo/publica`.
- [x] **Decisión resuelta con el usuario:** cobro conjunto multi-empleado (versión completa, no la
      simplificada de "solo mismo empleado"). Una transacción cubre todo el grupo
      (`transacciones.citaId` NULL, `grupoReservaId` set); cada línea de `detallesTransaccion` lleva su
      propia `citaId`/`empleadoId` para atribuir comisión al empleado real. Esto rompió el supuesto "una
      transacción = un empleado" que asumían 4 puntos de reportes/exportación (dashboard, Mi Desempeño,
      CSV de transacciones/nómina, xlsx financiero/nómina) — reescritos para leer la atribución por línea
      con fallback a `cita.empleadoId` en transacciones anteriores a esta migración. Propina se reparte
      en partes iguales entre los empleados del grupo (sin forma automática de saber a cuál iba dirigida).
- [x] Frontend: agenda de staff muestra citas del mismo grupo agrupadas visualmente (badge). **Desviación
      de alcance:** "agregar acompañante" se construyó en `QuickWalkInModal` (flujo de recepción/admin),
      no en el wizard de reserva pública — es donde recepción realmente agenda walk-ins con acompañante;
      el self-service público con acompañante queda como trabajo futuro explícito, no a medio construir.

**Templates por vertical (widgets configurables):**
- [x] `schema.ts`: `barberias.configWidgetsDestacados` (jsonb, default `[]`)
- [x] Frontend: `WIDGET_REGISTRY` (6 widgets: producción por empleado, top servicios, pacientes activos,
      próximas revisiones, clientes en riesgo, stock bajo) + zona de widgets destacados en
      `admin/dashboard` (solo dashboard por ahora, como marcaba el alcance — home/citas quedan para
      después)
- [x] Backend: plantilla de widgets por defecto según `industria`, aplicada al crear un tenant

### 2.3 Agenda: anti-abuso, confirmación y migración de historial ✅ Completo

Ejecutado y verificado el 2026-07-25 (tenant `qa-test`, mezcla de smoke test en navegador real + curl
directo contra la API para los casos límite de anti-abuso). Diseño acordado con el usuario (2026-07-24, 2
rondas de entrevista) en
[`Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md`](./02-arquitectura-y-db/Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md)
(estado actualizado a implementado, con la sección de implementación y los bugs encontrados al final).

**Calendario en tiempo real:**
- [x] Backend: `EventEmitter2` + endpoint SSE `GET /horarios/disponibilidad/stream`
- [x] Backend: emitir evento en `citas.service.ts`/`horarios.service.ts` al crear/cancelar cita o bloqueo
- [x] Frontend: `TimeSlotGrid` se suscribe vía `EventSource`, refresca al recibir evento — verificado
      end-to-end: un `EventSource` en el navegador recibió el push en vivo al crear una cita vía API para
      el mismo empleado+fecha
- [x] **Gap encontrado durante la verificación (no listado originalmente):** `TimeSlotGrid` usaba
      horarios 100% mockeados (`MOCK_SLOTS` hardcodeado), nunca conectado a
      `GET /horarios/disponibilidad` — el propio §0 del doc de diseño asumía que ya estaba conectado.
      Sin esto, el SSE no tenía nada real que refrescar. Reescrito: `fecha/page.tsx` pide disponibilidad
      real (por empleado, o unión de todo el staff activo si se eligió "Cualquiera") y
      `lib/disponibilidad.ts` calcula los slots reales respetando jornada/almuerzo/ocupados. De paso se
      encontró y corrigió un bug de regresión de la Fase 2.2 en el mismo archivo: el guard de "sin
      servicio no se puede seguir" solo miraba `servicioId`, así que reservar un combo (`comboId`, sin
      `servicioId`) rebotaba de inmediato al paso anterior — el wizard de combos nunca funcionó en este
      paso. También se agregó `combo: true` al `with` de `handleRecordatorio24h`
      (`queue/citas.processor.ts`), que crasheaba con `result.servicio.nombre` sobre `null` para citas de
      combo

**Confirmación obligatoria (WhatsApp + link web):**
- [x] `schema.ts`: `citas.confirmada` (boolean, default `false`), `citas.confirmacionSolicitadaEn`
      (timestamptz, nullable), `barberias.horasAntesConfirmacion` (integer, default `4`)
- [x] Backend: job BullMQ `solicitar_confirmacion` (reutiliza `tokenCliente`/`tokenExpiraEn` existentes)
- [x] Backend: endpoint público `POST /citas/publica/:id/confirmar?token=...`
- [x] Backend: job `liberar_si_no_confirmo`
- [x] Backend: regla de auto-confirmación si la reserva se hizo con menos anticipación que la ventana
- [x] **Fix del webhook existente:** `whatsapp.controller.ts` — el mensaje de `recordatorio_24h` deja de
      prometer un flujo de respuesta numérica ("Responde 1 para Confirmar") que el webhook no conecta a
      la cita; el mensaje de `solicitar_confirmacion` usa un link directo en su lugar, sin ambigüedad
- [x] **Gap encontrado (no listado originalmente):** faltaba la página web de respaldo — sin ella, el
      link del WhatsApp de confirmación no tenía a dónde apuntar. Nueva
      `[tenantSlug]/confirmar-cita/page.tsx` (pública), llama al endpoint de arriba

**Enforcement de bloqueo + alerta de inasistencias (sin auto-bloqueo):**
- [x] Backend: `crearCitaPublica` valida `cliente.bloqueado` (cierra un gap ya existente, el toggle del
      admin hoy no tenía efecto)
- [x] `schema.ts`: nueva tabla `inasistencias` (`clienteId`, `citaId`, `fecha`)
- [x] Backend: insertar en `inasistencias` en los mismos 2 puntos donde ya se incrementa `ausenciasStrikes`
- [x] Frontend: badge/alerta de inasistencias visible al staff al crear cita (`QuickWalkInModal`) o ver
      ficha de cliente (`admin/clientes`, con fechas reales al hacer clic en el badge de strikes)
- [x] **Gap encontrado:** la búsqueda de cliente por teléfono en `QuickWalkInModal` solo corría para
      industrias con paciente (veterinaria/clínica) — un tenant de barbería nunca veía la alerta.
      Corregido para buscar siempre

**"1 cita activa sin confirmar" por teléfono:**
- [x] Backend: `crearCitaPublica` rechaza (409) si ya existe una cita `programada`+`confirmada=false` del
      mismo cliente — no aplica a citas creadas por staff

**Campos obligatorios al reservar:**
- [x] `CreateClienteDto.nombreCompleto`: de opcional a requerido
- [x] Backend: `notas` (motivo) requerido a nivel de aplicación solo si `industria` es veterinaria/clínica
      (`crearCita`/`crearCitasGrupales`, público y staff); frontend: campo condicional en el wizard
      público y en `QuickWalkInModal`

**Migración de historial de citas pasadas:**
- [x] Backend: `POST /importaciones/citas_historicas` — no encola jobs normales (inserta directo vía el
      processor, sin pasar por `citasService.crearCita()`); cliente y servicio se matchean por
      teléfono/nombre (deben existir ya, no se crean fantasmas); `estado=completada` suma a
      `totalAsistencias` (+ `totalGastado` si la fila trae `monto` — no se crea una transacción real para
      no falsear el libro fiscal/DGI); `estado=ausente_strike` suma a `ausenciasStrikes` + inserta en
      `inasistencias`
- [x] **2 bugs pre-existentes encontrados y corregidos al construir esto** (ver §9 del doc de diseño para
      el detalle): `parser.service.ts` convertía celdas de fecha a un formato no-ISO
      (`String(new Date(...))`), rompiendo cualquier DTO con `@IsDateString()`; y
      `importaciones.processor.ts` corría todo el lote en una sola transacción SQL sin aislar filas — una
      sola fila con un error real de Postgres (ej. el `EXCLUDE` de citas solapadas) envenenaba la
      transacción entera y tumbaba el resto del lote. Ambos corregidos (conversión a ISO;
      `SAVEPOINT`/`ROLLBACK TO SAVEPOINT` por fila) y verificados deliberadamente provocando un choque de
      horario en medio de un lote de 2 filas — la fila siguiente se siguió procesando

### 2.4 Resto de Multi-Industria Funcional

- [ ] Piloto de un vertical no-barbería de punta a punta: tenant real de veterinaria, agendar, cobrar,
      ver reportes con datos reales — no solo probar que el texto cambia
- [ ] Banner de "Reserva Pausada" en el portal público durante kill-switch (documentado como esperado en
      `matriz-permisos-y-bloqueos.md`, nunca construido)
- [ ] Decidir si renombrar `transacciones.comisionBarbero`/`propinaBarbero` — columnas append-only de un
      libro fiscal, requieren revisión dedicada aparte (excluido a propósito de la Fase 2/rename)

## Fase 3 — Calidad y Mantenimiento 🔲 Pendiente

- [ ] Suite de tests automatizados real — hoy los 13 `*.spec.ts` de `apps/api` y el único
      `*.e2e-spec.ts` son boilerplate sin personalizar de `nest generate` (cobertura real cero, ver
      `spec.md` §10); `apps/web` tiene Vitest instalado sin un solo archivo `*.test.tsx`. Empezar por los
      módulos críticos: RLS/tenant scoping, cálculo de comisiones, idempotencia de `crearCita`
- [ ] Deuda menor: `ProfileSelector.tsx` muestra el valor crudo del rol (`"empleado"`) en vez de la
      terminología del tenant

## Fase 4 — Infraestructura de Producción 🔲 Pendiente

> Hoy todo corre en Docker local, sin CI/CD ni entorno separado de staging. Plan de escalado por fases
> (costos, umbrales, cuándo agregar cada pieza):
> [`Escalabilidad_y_Crecimiento.md`](./02-arquitectura-y-db/Escalabilidad_y_Crecimiento.md).

- [ ] Dominio, DNS por tenant y SSL/TLS
- [ ] Entornos separados: staging vs producción
- [ ] CI/CD con GitHub Actions (correr `tsc --noEmit` + tests en cada PR — hoy no hay ni ramas de feature,
      todo el desarrollo ocurre directo sobre `master`)
- [ ] Backups automáticos con Point-in-Time Recovery
- [ ] PgBouncer para connection pooling — **verificar antes de activarlo** que el driver de Drizzle
      (`node-postgres`) no use prepared statements con nombre, que sí tienen problemas conocidos con el
      modo *transaction pooling* de PgBouncer (el patrón `SET LOCAL` que ya usa `TenantInterceptor` sí es
      compatible, eso ya está bien resuelto — ver `README_Arquitectura_Datos.md`)
- [ ] Monitoreo y alertas de disponibilidad

## Fase 5 — Negocio Multi-Industria 🔲 Pendiente

> No es código, pero define hacia dónde apunta el código.

- [ ] Elegir el primer vertical piloto no-barbería — veterinaria es la mejor candidata según
      [`IDEAS_FUTURAS_EXPANSION_Y_SOLO_PRENEUR.md`](./01-vision-y-plan/IDEAS_FUTURAS_EXPANSION_Y_SOLO_PRENEUR.md)
- [ ] Validar que el modelo de precios (por cantidad de empleados, ver
      [`Estrategia_Precios.md`](./01-vision-y-plan/Estrategia_Precios.md)) funciona igual en otros verticales
- [ ] Definir la estrategia de lanzamiento del segundo vertical
