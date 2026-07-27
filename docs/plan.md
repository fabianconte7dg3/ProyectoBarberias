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

## Fase 2 — Multi-Industria Funcional ✅ Completo (2.1-2.4)

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

### 2.4 Resto de Multi-Industria Funcional ✅ Completo

Ejecutado y verificado el 2026-07-25. Verificación mixta: navegador real (login, portal público con
terminología dinámica, dashboard con widgets reales) + `curl` directo (casos límite de kill-switch,
cobro, comisión, confidencialidad de notas clínicas — más preciso que clickear un formulario N veces).

- [x] **Piloto de un vertical no-barbería de punta a punta.** Nuevo tenant dedicado `veterinaria-piloto`
      (no se reutilizó `qa-test` — ver `Credenciales_QA_Local.md`, que documenta que ese tenant debe
      arrancar siempre en `industria='barberia'` para no romper otras verificaciones futuras). Seed nuevo
      `seed-veterinaria-piloto.sql` (mismo patrón que `seed-qa-test.sql`) que simula exactamente lo que
      `crearTenantManual` generaría para un alta real: plantillas de `configCamposPersonalizados`
      (especie/raza/peso/alergias) y `configWidgetsDestacados` ya aplicadas, horario real del veterinario
      (para que la disponibilidad de la Fase 2.3 tenga algo que mostrar). Flujo verificado con datos
      reales, no simulados: cliente (dueño de mascota) → paciente "Firulais" con campos personalizados →
      reserva pública con terminología dinámica ("Elige a tu veterinario", "Motivo de la visita") →
      cobro → nota clínica capturada por el veterinario asignado → confidencialidad confirmada (admin
      recibe `403` al intentar leer el contenido completo, solo ve metadata) → dashboard con widgets
      reales ("Pacientes Activos: 1", "Próximas Revisiones (7 días): 0", "Top Veterinarios") → "Mi
      Desempeño" del veterinario con comisión correcta.
  - **Bug real encontrado (exactamente el tipo que este piloto buscaba atrapar):** `SuccessView.tsx`
    (pantalla de éxito tras reservar) tenía hardcodeado "Te esperamos en la barbería" sin importar el
    tenant/industria — nunca se había notado porque nadie había probado el flujo público completo con un
    tenant no-barbería de punta a punta. Corregido para usar `tenant.nombreComercial` dinámico.
  - **Gap encontrado, documentado pero no corregido (amplía el alcance de este fix):** el botón "Avisar
    por WhatsApp" de esa misma pantalla usa un número de teléfono simulado/hardcodeado
    (`"50761234567"`), no el número real del negocio — el perfil público del tenant no expone hoy un
    campo de WhatsApp. Requiere decidir qué campo exponer (¿`telefonoNegocio`? ¿el número de
    `whatsapp_config`?) y si es información sensible del negocio antes de corregirlo — ver gap nuevo en
    `spec.md` §7.
- [x] **Banner de "Reserva Pausada" en el portal público durante kill-switch.**
  - **Gap real encontrado (más profundo que "falta el banner"):** `KillSwitchGuard` solo resolvía el
    tenant desde `request.user.tenantId`/`request.params.tenantId` — ninguno de los dos existe en rutas
    `@Public()` (`/citas/publica`, `/clientes/publico`, etc., que resuelven el tenant por
    `x-tenant-slug` dentro del propio controller). Resultado: la Pausa de Auto-Servicio
    (`killSwitchActivo`) **nunca bloqueaba nada** en la Reserva Pública Web pese a estar documentado como
    "🛑 PAUSADO" en `matriz-permisos-y-bloqueos.md` §2 — no era solo que faltara la UI, la propia
    enforcement de backend no existía para ese camino. Corregido: el guard ahora resuelve el tenant por
    slug como fallback. Verificado con `curl`: `POST /citas/publica` con `killSwitchActivo=true` → `503`.
  - De paso se agregó el chequeo de `bloqueadoPorPlataforma` (bloqueo más severo, a nivel SuperAdmin) al
    mismo guard — tampoco se chequeaba ahí antes. A diferencia de `killSwitchActivo`, este **sí** aplica
    incluso al propio admin del tenant (un admin con sesión JWT ya emitida antes del bloqueo podía seguir
    mutando datos; `auth.service.ts` ya lo corta en el login, pero no había nada que lo cortara por
    request). Verificado con `curl`: admin autenticado + `bloqueadoPorPlataforma=true` → `503` también.
  - `GET /tenants/publico/:slug` expone `killSwitchActivo`; `reservar/layout.tsx` bloquea el wizard
    completo con un banner ("Reservas pausadas temporalmente") en vez de dejar que el cliente recorra
    todos los pasos solo para toparse con el error al final. Verificado visualmente en navegador.
- [x] **Decisión tomada: renombrar `transacciones.comisionBarbero`/`propinaBarbero` →
      `comisionEmpleado`/`propinaEmpleado`.** Confirmado antes de decidir que son puramente internas (sin
      conexión con el módulo DGI ni ningún contrato externo) — 8 archivos backend + 1 frontend
      (`CobrarCitaModal.tsx`, que también manda el campo `propinaBarbero` en el payload de cobro).
      Migración `ALTER TABLE RENAME COLUMN` (no toca datos existentes, solo el nombre). Headers de
      exportación CSV (`datos.service.ts`) actualizados de `Comision_Barbero`/`Propina_Barbero` a
      `Comision_Empleado`/`Propina_Empleado` por consistencia. Verificado con `curl`: un cobro real
      devuelve `comisionEmpleado`/`propinaEmpleado` en la respuesta con el monto correcto.

## Fase 3 — Calidad y Mantenimiento ✅ Completo (alcance acordado — ver nota de cierre)

Ejecutado y verificado el 2026-07-25. Detalle completo del diseño (DB de test dedicada, por qué
integration tests reales en vez de mocks para RLS/idempotencia/comisiones, cada ajuste de drift
encontrado) en
[`Plan_Fase3_Suite_Tests.md`](./02-arquitectura-y-db/Plan_Fase3_Suite_Tests.md).

- [x] **Suite de tests automatizados real, empezando por los módulos críticos** (RLS/tenant scoping,
      cálculo de comisiones, idempotencia de `crearCita`).
  - Backend: DB de test dedicada `volumetrix_test` (mismo contenedor Docker) + script de bootstrap
    (`apps/api/test/integration/bootstrap-test-db.sh`) que reproduce las 21 migraciones reales en un
    orden explícito (no alfabético — no es confiable en este repo). Encontró y documentó drift real no
    capturado en ningún archivo de migración: una dependencia circular entre 2 migraciones (resuelta
    pre-creando una función), una columna duplicada entre otras 2, y **2 tablas completas**
    (`detalles_transaccion`, `productos`) más **4 columnas sueltas** (`clientes.acepta_marketing`,
    `usuarios.porcentaje_comision_producto`, `transacciones.idempotency_key`,
    `transacciones.cita_id` nullable) que existen en `volumetrix` real sin ninguna migración que las
    cree — confirmado con un diff completo de `information_schema.columns` entre ambas bases.
  - Backend: 13 integration tests reales en 3 archivos (`test/integration/*.integration-spec.ts`),
    corriendo contra Postgres real vía `npm run test:integration` — aislamiento RLS multi-tenant
    (cross-tenant SELECT/INSERT rechazados por Postgres, no por la app), idempotencia de
    `crearCita`/`crearCitasGrupales` (misma `idempotencyKey`, choque real de horario vía `EXCLUDE`
    constraint), y cálculo de comisiones de `cobrarCita`/`cobrarGrupo` (servicio simple, combo, cobro
    grupal multi-empleado con atribución por línea).
  - Frontend: `vitest.config.ts` + scripts `test`/`test:watch` (Vitest, `@testing-library/react` y
    `@testing-library/dom` ya estaban instalados, solo sin config ni un solo archivo de test). 8 tests
    en 2 archivos: `calcularSlotsDisponibles` (lógica pura de disponibilidad — jornada, almuerzo,
    ocupados, slots pasados con reloj mockeado) y `ProfileSelector` (ver siguiente punto).
  - **Fuera de esta pasada, documentado no resuelto:** los 13 `*.spec.ts` boilerplate de `apps/api`
    (uno por controller/service de `nest generate`) y el `app.e2e-spec.ts` genérico. **Hallazgo real al
    correr `npm test` (confirmado con `git stash` que no es algo que esta fase haya roto): 12 de los 13
    fallan hoy** — `Test.createTestingModule({ controllers: [XController] })` no registra los providers
    reales que cada controller ya requiere (`DRIZZLE_POOL_DB`, `Queue`, etc.), así que ni siquiera logran
    instanciar el módulo. No es solo "cobertura cero", es una suite en rojo — la prioridad de esta fase
    fue RLS/idempotencia/comisiones, no reparar boilerplate; queda como la continuación natural de esta
    misma fase en una sesión futura.
- [x] **Fix + test de regresión: `ProfileSelector.tsx`** mostraba el valor crudo del rol (`"empleado"`)
      en vez de la terminología del tenant. Corregido para usar `useTenant()` y mapear
      `'empleado' → terminologiaEmpleado`; `admin`/`recepcion` no tienen término dinámico en el esquema
      (roles de plataforma, no del vertical) así que quedan como "Administrador"/"Recepción" genérico.
- [x] **Continuación (2026-07-26): reparados los 12 `*.spec.ts` boilerplate de `apps/api` que quedaban
      en rojo.** Causa raíz confirmada en los 12: `Test.createTestingModule({ controllers: [X] })` (o
      `providers: [X]`) generado por `nest generate`, sin mockear ninguna de las dependencias reales del
      constructor (`DRIZZLE_POOL_DB`, otros servicios) — Nest no podía resolver el módulo de test y
      fallaba en `compile()`, antes de llegar siquiera al único `it('should be defined')` de cada archivo.
      No se limitó el fix a "hacer compilar el módulo": se reescribieron con mocks reales (`jest.fn()`
      para servicios inyectados, `TenantContext.getDb()/getTenantId()` spyeados donde el código los usa
      directo en vez de vía `@Inject(DRIZZLE_POOL_DB)`) y casos de negocio concretos, no solo
      `should be defined` — con foco en la lógica que la suite de `test:integration` (RLS/idempotencia/
      comisiones) no cubre:
  - `auth.service.spec.ts`: bloqueo progresivo de PIN tras 5 intentos fallidos (30s/2m/5m), y las 4
    causales de rechazo de `loginAdmin` (rol incorrecto, cuenta inactiva, contraseña inválida, tenant
    bloqueado por plataforma o suspendido por pago).
  - `caja.service.spec.ts`: cálculo del balance esperado en efectivo (suma completa de pagos en
    efectivo, solo la porción en efectivo de los mixtos) y los 3 estados de cierre (cuadrado/sobrante/
    faltante) según la diferencia declarada.
  - `dgi.service.spec.ts`: el retardo asíncrono simulado de 2s (con `jest.useFakeTimers()`) y que un
    fallo de DB durante la emisión de factura no propague ni tumbe el flujo de cobro que la llamó.
  - `transacciones.service.spec.ts`: idempotencia por `idempotencyKey`, las 3 causales de rechazo
    (cita ajena de otro empleado, cita ya procesada, cobro duplicado), cálculo de comisión de un
    servicio simple vs. un combo (una línea de detalle por servicio interno), y que el método de pago
    Yappy no marque la cita completada ni emita factura DGI hasta el webhook.
  - `usuarios.service.spec.ts`: límite de empleados por plan al invitar staff, kill switch (no-op si
    ya está en el estado pedido, auditoría si cambia), y las 2 causales de rechazo de activación de
    cuenta por token (inválido, expirado).
  - `yappy.service.spec.ts`: el más profundo — reproduce el cifrado AES-256-CBC real de
    `secretKeyCifrada` dentro del propio test (misma `ENCRYPTION_KEY` que el servicio) para poder
    calcular un HMAC-SHA256 válido y verificar la validación de hash del webhook de punta a punta
    (hash correcto vs. incorrecto), además de las 3 resoluciones de adaptador (manual sin config,
    manual con número configurado, comercial incompleto → error).
  - Los 5 `*.controller.spec.ts` restantes se dejaron como smoke tests de wiring (DI real con
    servicios mockeados, sin lógica de negocio propia que testear ahí) pero con al menos un caso que
    verifica delegación real al servicio (no solo `should be defined`) — incluyendo el hallazgo de que
    `CajaController`/`TransaccionesController` necesitan `DRIZZLE_POOL_DB` mockeado en el módulo de
    test aunque no lo inyecten directo, porque `TenantInterceptor` (referenciado vía
    `@UseInterceptors` a nivel de clase) se resuelve al compilar el módulo, no al primer request.
  - `npm test` de `apps/api`: 13/13 suites, 77 tests, verde. `npx tsc --noEmit` limpio.
  - **No perseguido a propósito:** los ~150 errores de `@typescript-eslint/no-unsafe-*` que deja
    `eslint` sobre estos archivos (mocks tipados `any` disparan las reglas de seguridad de tipos) —
    mismo patrón ya presente y tolerado en los `test/integration/*.integration-spec.ts` existentes de
    la Fase 3 original (176 errores ahí también); no es una convención nueva de este cambio, y `eslint`
    no forma parte del gate de CI para tests (`.github/workflows/ci.yml` corre `tsc --noEmit` +
    `test:integration`, no `lint`).

## Fase 4 — Infraestructura de Producción 🔶 Parcial

> Detalle completo, decisiones técnicas y hallazgos reales (colisión de nombres de contenedor entre dev
> y producción, `middleware.ts` renombrado a `proxy.ts` en Next 16, auth de PgBouncer con dos roles):
> [`Plan_Fase4_Infraestructura.md`](./02-arquitectura-y-db/Plan_Fase4_Infraestructura.md). Plan de
> escalado por fases (costos, umbrales, cuándo agregar cada pieza):
> [`Escalabilidad_y_Crecimiento.md`](./02-arquitectura-y-db/Escalabilidad_y_Crecimiento.md).

- [x] Dominio, DNS por tenant y SSL/TLS — `volumetrixpa.com`, subdominio por tenant vía
      `apps/web/src/proxy.ts` (reescribe `<slug>.volumetrixpa.com` → `/[tenantSlug]/...` internamente) +
      Caddy on-demand TLS con `ask` validado contra tenants reales (`GET /tenants/validar-dominio`).
      Verificado en navegador real. Pendiente de decisión externa: proveedor DNS si más adelante se
      quiere certificado wildcard en vez de on-demand por subdominio (no es necesario para operar, es
      una optimización).
- [ ] Entornos separados: staging vs producción — `docker-compose.staging.yml` + Caddyfile +
      `.env.staging.example` listos como placeholder, sin servidor de staging real todavía.
- [x] CI/CD con GitHub Actions — `tsc --noEmit` + tests en cada PR y push a `master`
      (`.github/workflows/ci.yml`). `npm test` de `apps/api` queda fuera del workflow a propósito
      (son unit tests sin DB — `test:integration`, que sí corre, es la cobertura real de RLS/
      idempotencia/comisiones contra Postgres).
  - **Hallazgo real (2026-07-26): CI nunca había pasado en verde desde que se agregó** — las 3
    corridas que existían hasta ese momento fallaron, incluidas las de antes de este hallazgo. Causa
    raíz: el rol `app_user` (del que depende *todo* el aislamiento RLS vía `SET LOCAL ROLE app_user`
    en `TenantInterceptor`/`runInTenantScope`) nunca se creaba en ningún script versionado —
    `CREATE ROLE app_user ...` en
    [`0001_rls_policies.sql:94`](../apps/api/src/database/migrations/0001_rls_policies.sql) está
    **comentado**, pensado para correrse a mano una sola vez; eso se hizo hace tiempo contra el
    Postgres local persistente (por eso funcionaba en dev), pero un Postgres realmente nuevo — el
    volumen efímero de cada corrida de CI — no tiene el rol, y `GRANT ... TO app_user` de
    `0003_financiero.sql` fallaba con `role "app_user" does not exist"`. Segundo bug encontrado en el
    camino: `bootstrap-test-db.sh` tenía un candado de "21 archivos .sql esperados" que quedó
    desactualizado cuando `0018_impersonacion_audit.sql` (Fase 6.3) se agregó sin sumarlo al script.
  - **Corregido:** nuevo `infrastructure/postgres-init/01-create-app-user.sql` (bloque `DO` idempotente,
    misma credencial `app_user`/`app_password` ya versionada en
    `infrastructure/pgbouncer-test/userlist.txt`), montado en `docker-compose.yml` vía
    `docker-entrypoint-initdb.d` — mecanismo nativo de la imagen de Postgres, solo corre en un volumen
    vacío (no toca el volumen local ya existente del equipo, no toca ninguna migración histórica).
    Verificado en un contenedor Postgres aislado y descartable (volumen nuevo, sin relación con
    `volumetrix_postgres`) que el rol se crea correctamente. `bootstrap-test-db.sh` actualizado para
    aplicar `0018` y esperar 22 archivos. `test:integration` corrido localmente tras el fix: 13/13 en
    verde. Push confirmado en verde en GitHub Actions (`gh run watch`), la primera vez que CI pasa desde
    que se agregó el workflow.
  - **Segundo hallazgo (mismo día, encontrado al revisar producción antes de dar el primero por cerrado
    del todo): `docker-compose.production.yml` (y `docker-compose.staging.yml`, mismo bug) tenían
    `POSTGRES_USER=app_user`.** La imagen oficial de Postgres crea ese usuario como **superusuario** al
    inicializar el volumen — un superusuario hace *bypass* de RLS sin importar `NOBYPASSRLS` (ver
    postgres docs), contradiciendo el propio comentario de diseño en `0001_rls_policies.sql` ("la app
    NUNCA debe conectarse como superusuario/owner"). De haberse desplegado tal cual, RLS habría quedado
    sin efecto en producción para todo el tráfico de la app.
  - **Corregido:** `POSTGRES_USER` pasa a ser el rol *owner* (`postgres`, solo para aplicar migraciones a
    mano, nunca usado por la app en runtime) en ambos `.env.*.example`. Nuevo
    `infrastructure/postgres-init-production/01-create-app-user.sh` — mismo mecanismo
    `docker-entrypoint-initdb.d` que el fix de dev/CI, pero la password de `app_user` viene de una env
    var nueva (`APP_USER_PASSWORD`, seteada en `.env.production`/`.env.staging`, nunca hardcodeada) en
    vez de un valor fijo — falla fuerte (`exit 1`) si esa env var no está seteada, en vez de arrancar
    silenciosamente inseguro. `docker-compose.production.yml`: `pgbouncer` corregido para proxyear como
    `app_user` (antes usaba las credenciales del owner, mismo bug un nivel más arriba — el pool entero
    habría seguido siendo superusuario aunque el rol app_user existiera bien). `docker-compose.staging.yml`
    (sin PgBouncer) recibe el mismo mount del init script.
  - **Bug real encontrado durante la verificación:** la interpolación de variables de `psql` (`:'var'`)
    no se sustituye dentro de un bloque `DO $$ ... $$` — el primer intento de
    `EXECUTE format(..., :'app_user_password')` le llegaba literal al parser SQL del servidor y rompía
    con `syntax error at or near ":"`. Reescrito sin bloque dinámico: chequeo de idempotencia con
    `psql -tAc` aparte, password escapada al estilo SQL (`'` → `''`) por el propio shell e interpolada
    en un heredoc sin comillas en el delimitador (para que el shell la expanda antes de llegar a psql).
  - **Verificado en contenedores Docker aislados y descartables** (sin tocar `volumetrix_postgres`
    real): rol creado con `LOGIN`/`NOSUPERUSER`/`NOBYPASSRLS`; conexión "remota" real (contenedor
    cliente separado, misma topología de red que `pgbouncer`↔`postgres` en el compose real, no
    `localhost` — que hubiera dado un falso positivo por la regla `trust` que la imagen habilita para
    conexiones locales) con la password correcta autentica y confirma `is_superuser: off`; con password
    incorrecta, falla con `password authentication failed`; sin `APP_USER_PASSWORD` seteada, el
    contenedor de Postgres no arranca (`exit 1`, log explícito). `docker compose ... config` válido en
    ambos compose files con las env vars resueltas.
- [ ] Backups automáticos con Point-in-Time Recovery — `scripts/backup-postgres.sh` (snapshot manual vía
      `pg_dump`, verificado) listo, pero no es PITR real ni corre en ningún cron — falta destino de
      backup elegido (S3 o similar) y WAL archiving continuo.
- [x] PgBouncer para connection pooling — agregado a `docker-compose.production.yml`
      (`pool_mode=transaction`). La verificación pendiente ya se hizo: la suite real de integration
      tests (RLS/idempotencia/comisiones) corrida completa a través de PgBouncer, 13/13 en verde —
      `drizzle-orm/node-postgres` es compatible, confirmado empíricamente, no solo en teoría.
- [ ] Monitoreo y alertas de disponibilidad — `GET /health` (sin tocar DB) ya existe como requisito
      técnico común a cualquier proveedor, pero no se eligió servicio de monitoreo todavía.

## Fase 5 — Negocio Multi-Industria 🔲 Pendiente

> No es código, pero define hacia dónde apunta el código.

- [ ] Elegir el primer vertical piloto no-barbería — veterinaria es la mejor candidata según
      [`IDEAS_FUTURAS_EXPANSION_Y_SOLO_PRENEUR.md`](./01-vision-y-plan/IDEAS_FUTURAS_EXPANSION_Y_SOLO_PRENEUR.md)
- [ ] Validar que el modelo de precios (por cantidad de empleados, ver
      [`Estrategia_Precios.md`](./01-vision-y-plan/Estrategia_Precios.md)) funciona igual en otros verticales
- [ ] Definir la estrategia de lanzamiento del segundo vertical
- [ ] Sucursales / multi-sede — feature del PRD de Google Stitch, deliberadamente diferida (no priorizada
      en la decisión del 2026-07-26, ver [`Plan_Rediseno_Visual_Stitch.md`](./05-diseno-y-ux/Plan_Rediseno_Visual_Stitch.md)
      §5.1). Requiere diseño de esquema propio (tabla `sucursales`, FKs opcionales) antes de retomarla.
- [ ] Perfil de cuenta propia (autogestión de usuario) — mismo PRD, misma decisión, diferida por ahora.

## Fase 6 — Rediseño Visual Volumetrix (Google Stitch) + Impersonation y Mi Silla ✅ Completo

> Decidido con el usuario el 2026-07-26 (ver
> [`Plan_Rediseno_Visual_Stitch.md`](./05-diseno-y-ux/Plan_Rediseno_Visual_Stitch.md) para el gap
> analysis completo de las 24 pantallas exportadas): (1) el rediseño visual va primero, con reemplazo
> total de los tokens de tema actuales (shadcn neutro) por los dos sistemas de diseño de Stitch; (2) de
> las 4 features de negocio nuevas del PRD, se construyen ahora **impersonation de Super Admin** y
> **vista "Mi Silla" para staff** — sucursales y perfil de cuenta propia quedan en el backlog de Fase 5;
> (3) sin prioridad de superficie fija — el orden de abajo es el orden técnico más práctico (fundamento →
> Super Admin, donde además se agrega impersonation → panel de tenant, donde además se agrega Mi Silla →
> portal público + landing).

### 6.1 Fundamento del sistema de diseño ✅ Completo
- [x] Reemplazar los tokens de `apps/web/src/app/globals.css` (hoy shadcn neutro/oklch) por los dos
      sistemas de Stitch: **Volumetrix Design System** (superficie tenant: `[tenantSlug]/**`, activo por
      defecto en `:root`) y **Volumetrix Executive System** (superficie `super-admin/**`, scopeado vía
      `[data-surface="executive"]` en el nuevo `apps/web/src/app/super-admin/layout.tsx`) — paletas,
      tipografía Inter (reemplaza Geist Sans en `apps/web/src/app/layout.tsx`; Geist Mono se mantiene
      para `font-mono`, usado en 24 archivos), radios (4px estándar / 8px contenedores, escala fija en
      vez del `calc()` derivado de un solo `--radius`)
- [x] Confirmar que el mecanismo de white-label por tenant (`colorPrimario` → CSS var `--primary`,
      ver `CLAUDE.md` §Frontend) sigue funcionando sobre los nuevos tokens — verificado en navegador
      (`qa-test.localhost:3000/reservar`, `--primary` resuelve al fallback de marca nuevo `#b0004a`,
      ya no al rojo genérico `#ef4444` de antes)
- [x] Dark mode: navy `#0f172a` (Executive) / charcoal `#121212` (Design System), no negro puro, según
      ambos `DESIGN.md` — implementado, no verificable en navegador porque el dark mode de la app usa
      selector de clase (`.dark`) y no hay ningún toggle/`ThemeProvider` que la aplique todavía (deuda
      preexistente, no introducida por este cambio)
- [x] Verificado: `tsc --noEmit` limpio en `apps/web`; en navegador, superficie tenant resuelve a Design
      System (`background:#f3faff`, `primary:#b0004a`) y superficie Super Admin resuelve a Executive
      System (`background:#fbf8fa`, `primary:#b7004d`, `sidebar:#1e293b`) de forma independiente; sin
      errores nuevos en consola

### 6.2 Rediseño Super Admin (Executive System) ✅ Completo
- [x] `super-admin/login` — hero navy (`#091426`) + tarjeta clara flotante, tokens Executive
- [x] `super-admin/setup` — no estaba en el alcance original de 6.2, pero es la misma familia de
      pantalla-de-acceso que login (mismo `isAuthScreen` en el layout) y quedaba visualmente rota
      (slate oscuro) si no se tocaba también — mismo tratamiento hero navy + tarjeta
- [x] `super-admin` (dashboard) — se separó el listado de tenants a su propia ruta (ver siguiente
      punto); esta página ahora solo tiene las 4 KPI cards + `AlertasSeguridadPanel` +
      `NegociosEnRiesgoCard` (recoloreados a tokens Executive, antes hardcodeaban `zinc-*`)
- [x] `super-admin/tenants` (listado, **ruta nueva** — antes la tabla vivía inline dentro del
      dashboard) — filtros, búsqueda, cambio de plan/estado, kill-switch y `CrearNegocioModal`
      (recoloreado) se movieron aquí completos
- [x] `super-admin/tenants/[id]` (detalle) — recoloreado, sin cambios de estructura. El botón de
      impersonation queda para 6.3, no se agregó todavía
- [x] Nuevo `super-admin/layout.tsx`: sidebar fija (260px, tokens `--sidebar-*`) con Dashboard/Negocios/
      Cerrar sesión — reemplaza el header+logout que antes vivía duplicado en cada página. Pantallas de
      login/setup quedan sin sidebar (`isAuthScreen`)
- [x] Deliberadamente NO se copiaron del mockup de Stitch: gráficos Chart.js (MRR mensual, dona por
      industria), feed de "Actividad Reciente" y "Mapa de Actividad", ni el indicador
      "Impersonating: Tenant X" — ninguno tiene datos reales detrás (no hay endpoint de plataforma para
      series históricas de MRR, breakdown por industria, ni feed de actividad), y agregar UI con datos
      inventados hubiera sido una feature fantasma. Los enlaces del sidebar del mockup a "Plans"/
      "Alerts"/"Configuration"/"Reports" tampoco se agregaron por la misma razón: esas rutas no existen
- [x] Verificado: `tsc --noEmit` limpio; en navegador, `/super-admin/login` renderiza con los tokens
      nuevos (confirmado antes en 6.1) y `/super-admin` (sin sesión) hace las 3 llamadas esperadas
      (`stats`/`security-alerts`/`business-metrics`), recibe 401 y redirige a login sin errores de
      consola ni assets rotos — no se pudo verificar visualmente el dashboard/listado ya autenticados
      por no contar con credenciales de superadmin (con TOTP) a mano en este entorno

### 6.3 Impersonation de Super Admin ("Login as Tenant") ✅ Completo
- [x] Backend: `POST /super-admin/tenants/:id/impersonar` (`SuperAdminGuard`) — busca el admin activo
      real del tenant y emite un JWT de 30 min (`expiresIn: '30m'`, vs. las 12h de un login admin
      normal) con la misma forma `sub`/`tenantId`/`rol` que un login real, más los claims
      `imp`/`impBy`/`impByEmail` que lo distinguen. `JwtStrategy.validate()` los propaga a
      `request.user` solo cuando están presentes, sin tocar el contrato para tokens normales
- [x] Backend: cada uso queda en `audit_logs` (nuevo valor de enum `impersonacion`, migración
      `0018_impersonacion_audit.sql`) — `usuarioId` apunta al admin impersonado (satisface el FK real
      de la tabla) y la identidad del Super Admin que lo disparó (id + email + IP + user-agent) vive en
      `payloadDespues`, visible en el propio log de auditoría de `super-admin/tenants/[id]`
- [x] Backend: "volver" a la sesión de Super Admin sin relogueo no necesitó mecanismo nuevo — el token
      de impersonación viaja en la cookie httpOnly `jwt` (igual que un login admin), mientras que la
      sesión de Super Admin vive en `super_jwt` en `localStorage`, un canal completamente aparte que
      nunca se toca. Salir de la impersonación es solo `POST /auth/logout` (limpia la cookie `jwt`) +
      volver a `/super-admin/tenants` — `super_jwt` sigue ahí, sesión de Super Admin intacta
- [x] Frontend: banner ámbar dentro del mismo `<header>` sticky de `AdminHeader` (no un sticky
      independiente — dos stickies con `top-0` se superpondrían al hacer scroll), visible en todas las
      páginas de `[tenantSlug]/admin/**`. Estado no persistido como fuente de verdad: `useAdminAuth`
      resincroniza `impersonation` en `adminStore` desde `GET /auth/me` (`imp`/`impByEmail`) en cada
      mount, igual que ya hacía con la sesión misma
- [x] Botón "Entrar como Negocio" en `super-admin/tenants/[id]` con confirmación explícita antes de
      abrir la sesión
- [x] Verificado: `tsc --noEmit` limpio en ambos paquetes; migración aplicada y confirmada por psql
      (`enum_range` muestra `impersonacion`); `curl` sin token / con Bearer inválido al endpoint nuevo
      devuelve 401 (guard correctamente cableado, sin 500). RLS-paridad verificada por lectura de
      código, no con un test nuevo: el payload del token de impersonación tiene la misma forma que un
      login admin real y `TenantInterceptor` solo mira `tenantId`/`rol==='superadmin'`, ninguno de los
      dos ve los claims extra — no se pudo probar el flujo autenticado de punta a punta (clic real en
      "Entrar como Negocio" → banner → salir) por no contar con credenciales de superadmin con TOTP en
      este entorno

### 6.4 Rediseño Panel de Administración de Tenant (Design System) ✅ Completo
- [x] Punto de partida distinto a 6.2: a diferencia de Super Admin (que tenía `slate`/`zinc`/`blue`
      hardcodeado por todas partes), el panel de tenant **ya usaba** los tokens semánticos
      (`bg-card`, `text-foreground`, `bg-primary`, etc.) desde antes de esta fase — heredó la paleta
      Design System nueva automáticamente en cuanto 6.1 cambió `globals.css`, sin tocar una sola línea
      de estas páginas. Confirmado por grep antes de tocar nada: 0-7 coincidencias de color hardcodeado
      por archivo (vs. cientos en Super Admin)
- [x] `admin/login` — ya usaba tokens (`bg-card`, `bg-secondary/30`), sin cambios
- [x] `admin/dashboard`, `admin/caja` + `CobrarCitaModal`, `admin/configuracion`, `admin/clientes`,
      `admin/datos` — se recolorearon los ~20 usos sueltos de `blue-*` (Tailwind literal, sin token) a
      `secondary` (teal de marca), para que el único acento fuera de paleta que quedaba en el panel se
      alineara con el sistema de dos colores en vez de un tercero sin nombre
- [x] `admin/agenda`, `admin/empleados`, `admin/productos` — 0 hardcodeado, sin cambios
- [x] **Bug real encontrado y corregido en el camino** (no era de 6.4, pero bloqueaba verificarlo):
      `proxy.ts` reescribía cualquier request en un subdominio de tenant anteponiendo el slug sin
      comprobar si el path ya lo traía — cualquier `router.push`/`<Link>` a una ruta ya prefijada
      (exactamente lo que hace todo el panel: `AdminHeader`, `admin/login`, `useAdminAuth`) generaba un
      404 por doble-prefijo (`/qa-test/qa-test/admin/agenda`) apenas se navegaba dentro de una sesión
      abierta por subdominio. Corregido con un guard de idempotencia en el propio proxy — si el path ya
      empieza con el slug, no se reescribe. Sin este fix, el panel entero era inutilizable por
      subdominio (el mecanismo central de Fase 4) en cuanto el usuario hacía clic en cualquier link
      interno
- [x] Verificado con datos reales de la seed `seed-qa-test.sql` (tenant `qa-test`,
      `qa-admin@test.local`): login real vía API, sesión válida confirmada por `GET /auth/me`, y las 9
      páginas (`login` incluida) cargadas con datos reales — dashboard con KPIs y gráfico de
      recaudación, clientes con 7 registros, empleados con 2 perfiles y comisiones, agenda con grid de
      horarios, caja con arqueo, productos y configuración con sus catálogos — todas con
      `background:#f3faff`, `primary:#b0004a`, `secondary:#006876`, Inter, sin errores de consola
      nuevos. `tsc --noEmit` limpio en ambos paquetes
- [x] **Nota abierta, no resuelta**: durante la verificación, autenticar contra
      `qa-test.localhost:3000` (subdominio de dev) en vez de `localhost:3000` (dominio raíz) resultó en
      que la cookie `jwt` (con `SameSite=Lax`) no viajaba en llamadas fetch subsiguientes a
      `localhost:4000` — consistente con que `qa-test.localhost` y `localhost` son sitios distintos para
      el algoritmo de SameSite (hostnames diferentes), mientras que `localhost:3000`/`localhost:4000`
      sí son mismo sitio (mismo hostname, solo difiere el puerto). En producción esto no debería repetirse
      — `barberia-jose.volumetrixpa.com` y `api.volumetrixpa.com` comparten el mismo eTLD+1
      (`volumetrixpa.com`), que es lo que decide "mismo sitio" — pero **no está verificado contra un
      dominio real**, solo razonado. Queda como riesgo a confirmar antes de depender de subdominios en
      producción (ver `Plan_Fase4_Infraestructura.md`)

### 6.5 Vista "Mi Silla" para staff ✅ Completo
- [x] Backend: no hizo falta ningún endpoint nuevo. `GET /citas?fecha=` ya fuerza
      `empleadoId = user.userId` cuando `user.rol === 'empleado'`
      (`citas.service.ts:obtenerCitasAgenda`), y `GET /reportes/mi-desempeno` ya acepta
      `desde`/`hasta` y siempre está scopeado al empleado autenticado — pedir ambos con
      `desde=hasta=hoy` da exactamente los datos de "hoy" que pedía el mockup, sin nueva superficie
      de API
- [x] Frontend: nueva ruta `admin/mi-silla` (`[tenantSlug]/admin/mi-silla/page.tsx`), gateada con
      `useAdminAuth({ requiredRole: 'empleado' })` — **solo `empleado`, no `recepcion`** (decisión
      tomada al implementar, ver nota abajo)
- [x] **Alcance ajustado del mockup a lo que hay datos reales para respaldar** (mismo criterio que
      6.2 con los gráficos fantasma de Super Admin): se construyeron las 3 secciones con datos
      reales — KPIs (Servicios/Comisiones/Propinas desde `mi-desempeno`, Tiempo Promedio calculado
      client-side desde `finEstimado - inicioEstimado` de las citas completadas), Cola de Clientes
      (tarjeta destacada "En Silla" con barra de progreso + Finalizar → abre `CobrarCitaModal`
      existente; pendientes con botón "Pasar a Silla" y menú de Ausente/Cancelar), y Servicios de
      Hoy Completados (tabla, badge "Pagado" porque `estado='completada'` solo se alcanza tras un
      cobro real). **Deliberadamente no se copiaron** del mockup: "Metas del Día" (implica una meta
      diaria por empleado que no existe en el schema) e "Inventario de Puesto" (implica inventario
      por-silla/por-empleado, cuando `productos` es inventario a nivel de tenant) — ambos habrían
      sido UI con datos inventados
- [x] **Decisión: `empleado` únicamente, no `recepcion`** (el plan original decía
      "empleado`/`recepcion`", ajustado al implementar). `citas.empleadoId` nunca apunta a un
      usuario `recepcion` — ni el flujo de creación de citas, ni el filtro "Solo Mis Citas" de
      `admin/agenda`, tratan a recepción como profesional asignable. Una "Mi Silla" para recepción
      siempre estaría vacía; se queda con la vista operativa completa de `admin/agenda`, igual que
      hoy
- [x] **Decisión: convive con la agenda completa, no la reemplaza.** `empleado` ve ambos links en el
      nav (`AdminHeader`) — Mi Silla como vista enfocada del día, Agenda para el caso de querer ver
      la grilla completa o "Ver Todo el Equipo" (toggle que ya existía). El login con PIN de
      `empleado` ahora aterriza en `/admin/mi-silla` (antes `/admin/agenda`, sin cambios para
      `admin`/`recepcion`) — cambio en `admin/login/page.tsx`
- [x] **`AdminHeader` ajustado para soportar páginas de fecha fija**: `selectedDate`/`onDateChange`
      pasaron a opcionales — si no se pasan, el navegador de fechas (prev/hoy/siguiente) simplemente
      no se renderiza, en vez de forzar una fecha ficticia en una página que solo opera sobre "hoy"
- [x] **Bug real encontrado y corregido durante la verificación** (no estaba en el alcance original,
      pero bloqueaba cualquier tenant con al menos un servicio completado hoy): `servicioPrecio`/
      `comboPrecio` llegan del API como **strings** (Drizzle serializa columnas `decimal` como
      string, no `number`, pese a que el tipo `CitaAgenda` los declara `number | null`), y la tabla
      de "Servicios de Hoy" llamaba `.toFixed(2)` directo sobre ese valor → `TypeError` en cuanto
      había una sola cita completada, tumbando toda la página (Next.js caía al error boundary por
      defecto, sin componente `error.tsx` propio). Solo se manifestaba con datos reales — el estado
      vacío (sin citas) no lo disparaba, por eso una verificación solo del caso vacío no lo hubiera
      encontrado. Corregido envolviendo con `Number(...)` antes de `.toFixed()`
- [x] Verificado end-to-end con datos reales del tenant `qa-test` (citas creadas vía API para hoy en
      los 3 estados relevantes + un cobro real): estado vacío, tarjeta "En Silla" con barra de
      progreso y WhatsApp, botón "Finalizar" abre `CobrarCitaModal` pre-rellenado (cliente/servicio/
      total correctos) y lo cierra sin romper estado, menú "Opciones" de un pendiente (Marcar
      Ausente/Cancelar), botón "Pasar a Silla" transiciona `programada → en_curso` con UI optimista
      y persiste en el backend, KPIs se refrescan tras un cobro real (Yappy, que confirmó además que
      la cita correctamente se queda en `en_curso` hasta el webhook — comportamiento correcto y
      preexistente de `TransaccionesService.cobrarCita`, no algo que Mi Silla necesitara manejar
      distinto). Confirmado también que `admin`/`recepcion` no ven el link "Mi Silla" en el nav y
      que visitar `/admin/mi-silla` directo como `admin` redirige a `/admin/agenda` (mismo guard
      compartido que ya usan las páginas admin-only). `tsc --noEmit` limpio en ambos paquetes

### 6.6 Rediseño Portal de Reserva Pública + Landing (Design System) ✅ Completo
- [x] Punto de partida distinto a 6.4/6.5: `reservar/**` y `components/booking/**` **no** usaban
      tokens semánticos — eran `bg-white`/`text-gray-*`/`border-gray-*` hardcoded, sin dark mode, más
      cerca del punto de partida de Super Admin (6.2) que del panel de tenant. Se migraron todos a
      tokens (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted`,
      `text-destructive`) en `reservar/layout.tsx`, `reservar/fecha/page.tsx`,
      `reservar/confirmar/page.tsx`, `ServiceSelection`, `BarberSelection`, `BarberProfileCard`,
      `DaySelector`, `TimeSlotGrid`, `ClientForm`, `BookingSummary`, `SuccessView`, `BottomAction`
- [x] Nuevo `components/booking/BookingStepper.tsx` — indicador de progreso (círculos numerados +
      check al completar) montado en `reservar/layout.tsx`, visible en las 3 páginas reales del flujo
      (`Servicio y Profesional` → `Fecha y Hora` → `Confirmación`), oculto en la pausa de
      auto-servicio y en la vista de éxito. El mockup de Stitch mostraba 4 pasos separando
      Servicio/Profesional — se mantuvieron combinados en una sola página como ya estaba (cambiar eso
      es una restructuración de flujo, no un rediseño visual, fuera de alcance de esta fase)
- [x] `TimeSlotGrid` agrupa los horarios ya calculados en Mañana/Tarde/Noche (puramente
      presentacional, mismo criterio que el mockup) — verificado con horarios reales configurados
      para un empleado de prueba, con las 3 franjas renderizando correctamente
- [x] **Bug real encontrado y corregido, no solo cosmético**: `reservar/confirmar/page.tsx` llamaba a
      `BookingSummary` con datos inventados — `` `${terminologiaServicio} Seleccionado` ``,
      `` `${terminologiaEmpleado} Asignado` `` y un precio fijo `"15.00"` — en vez del servicio/combo,
      empleado y precio reales elegidos en los pasos anteriores. `useBookingStore`
      (`apps/web/src/lib/store.ts`) solo persistía los ids, no el nombre/precio. Se agregaron
      `itemNombre`/`itemPrecio`/`empleadoNombre` al store (poblados en `reservar/page.tsx` al elegir,
      desde los catálogos ya cargados) y `confirmar/page.tsx` ahora los lee del store. Verificado
      end-to-end: el resumen de confirmación mostró el servicio, precio y empleado reales elegidos,
      tanto para un servicio suelto (barbería) como para la terminología dinámica de veterinaria
      (`Consulta` / `Veterinario`) con el campo "Motivo de la visita" correctamente presente
- [x] Landing page `/` reescrita — el mockup `three.js` del export resultó ser JS roto de otra
      pantalla pegado por error (lógica de un numpad de login, referencias a elementos DOM
      inexistentes, sin escena Three.js real ni `screen.png` válido), confirmando lo que ya decía
      `Plan_Rediseno_Visual_Stitch.md` ("No existe"). Se construyó una landing informativa con el
      Design System (hero, 6 features grounded en funcionalidad real ya construida, grid de las 7
      industrias reales del enum `industria_negocio` con las mismas etiquetas que
      `CrearNegocioModal.tsx`, CTA de contacto) en vez de intentar reconstruir Three.js — **sin**
      agregar la dependencia `three` (no estaba instalada) para un solo hero decorativo; se usó un
      fondo con blobs de gradiente en CSS
- [x] Logo real (`logo_short.png` del export, el único de los 5 assets de marca con canal alpha
      transparente — los `_dark`/`_light`/`_full_*` tienen fondo sólido horneado) copiado a
      `apps/web/public/logo-volumetrix.png`; SVGs boilerplate de `create-next-app`
      (`next.svg`/`vercel.svg`/`file.svg`/`globe.svg`/`window.svg`) eliminados de `public/` por quedar
      sin ningún uso tras reescribir `page.tsx`
- [x] **CTA de contacto sin backing real, documentado igual que el gap de WhatsApp de `SuccessView`**:
      no existe today ningún flujo de alta de tenant self-service ni canal de contacto público
      verificado — el CTA usa `mailto:hola@volumetrixpa.com`, una dirección plausible sobre el
      dominio de producción ya decidido en Fase 4, pero **no confirmada como buzón real
      provisionado**. Mismo tratamiento que el número de WhatsApp hardcodeado en `SuccessView.tsx`
      (Fase 2.4): no se inventó un formulario de captura de leads sin backend detrás
- [x] Verificado end-to-end en navegador: flujo completo de reserva pública real en `qa-test`
      (servicio → empleado → fecha con horarios reales configurados y agrupados por franja →
      confirmación con datos reales → envío real → cita creada confirmada por API con
      `origen: 'web_publica'`), flujo de veterinaria con terminología dinámica y motivo de la visita,
      landing page sin errores de consola con el logo cargando correctamente, sin scroll horizontal
      en 375px tanto en la landing como en el wizard de reserva. `tsc --noEmit` limpio en ambos
      paquetes

### 6.7 Verificación y documentación ✅ Completo
- [x] `tsc --noEmit` en ambos paquetes tras cada bloque de esta fase — se hizo en cada sub-fase (6.1 a
      6.6) y se repitió al cierre: limpio en `apps/api` y `apps/web`
- [x] Smoke test en navegador de cada superficie re-diseñada antes de darla por cerrada — hecho por
      sub-fase con datos reales (`qa-test`/`veterinaria-piloto`), documentado en cada sección de
      arriba. Al cerrar la fase se repitió un chequeo de regresión dirigido específicamente al único
      componente compartido que cambió en 6.5 (`AdminHeader`, `selectedDate`/`onDateChange` pasaron a
      opcionales) — `admin/agenda` (que sí los pasa) siguió renderizando el navegador de fechas y las
      citas reales sin cambios
- [x] Actualizar `walkthrough.md`/`spec.md` y marcar esta fase completa al cerrar — sección nueva en
      `walkthrough.md` resumiendo la Fase 6, gap del `mailto:` de la landing registrado en `spec.md`
      §7 junto al gap ya existente del WhatsApp simulado, y banner/enlaces de
      `Plan_Rediseno_Visual_Stitch.md` actualizados de "ejecución no iniciada" a completado
