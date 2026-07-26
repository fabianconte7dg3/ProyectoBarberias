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
      (`.github/workflows/ci.yml`). `npm test` de `apps/api` queda fuera a propósito (12/13 specs
      boilerplate rotos, ver Fase 3 abajo) — solo corren `test:integration` (real) y el `test` de
      `apps/web` (real).
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

## Fase 6 — Rediseño Visual Volumetrix (Google Stitch) + Impersonation y Mi Silla 🔶 Parcial (6.1/7)

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

### 6.2 Rediseño Super Admin (Executive System) 🔲 Pendiente
- [ ] `super-admin/login`
- [ ] `super-admin` (dashboard global)
- [ ] `super-admin/tenants` (listado)
- [ ] `super-admin/tenants/[id]` (detalle) — superficie donde también se agrega el botón de
      impersonation (ver 6.3)

### 6.3 Impersonation de Super Admin ("Login as Tenant") 🔲 Pendiente
- [ ] Backend: endpoint que emite un JWT de impersonación de expiración corta (claim distinguible del
      login normal) a partir de `super-admin/tenants/[id]`
- [ ] Backend: registrar cada uso en el log de auditoría existente (ver `Consideraciones_Seguridad.md`)
- [ ] Backend: decidir mecanismo de "volver" a la sesión real de Super Admin sin tener que reloguear
- [ ] Frontend: banner persistente y visible en toda la UI mientras la sesión está impersonando —
      nunca debe ser invisible que hay un operador externo dentro de la cuenta
- [ ] Verificar: RLS se comporta igual que un login admin real; la auditoría queda registrada en cada uso

### 6.4 Rediseño Panel de Administración de Tenant (Design System) 🔲 Pendiente
- [ ] `admin/login`
- [ ] `admin/dashboard`
- [ ] `admin/agenda`
- [ ] `admin/caja` + `CobrarCitaModal`
- [ ] `admin/empleados`
- [ ] `admin/configuracion`
- [ ] `admin/clientes`
- [ ] `admin/productos`
- [ ] `admin/datos`

### 6.5 Vista "Mi Silla" para staff 🔲 Pendiente
- [ ] Backend: confirmar si alcanza con filtrar el endpoint de agenda existente por el `empleadoId`
      propio del staff logueado, o hace falta un endpoint dedicado
- [ ] Frontend: nueva ruta (ej. `admin/mi-silla`), visible solo para roles `empleado`/`recepcion`, con
      el visual del mockup `dashboard_del_barbero_mi_silla` del export de Stitch
- [ ] Decidir si reemplaza el acceso de staff a la agenda completa o convive con ella

### 6.6 Rediseño Portal de Reserva Pública + Landing (Design System) 🔲 Pendiente
- [ ] `reservar/**` (selección de profesional, fecha/hora, confirmación)
- [ ] Landing page `/` — hoy sigue siendo el boilerplate de `create-next-app`
      (`apps/web/src/app/page.tsx`); construir con el mockup `three.js` del export

### 6.7 Verificación y documentación 🔲 Pendiente
- [ ] `tsc --noEmit` en ambos paquetes tras cada bloque de esta fase
- [ ] Smoke test en navegador de cada superficie re-diseñada antes de darla por cerrada
- [ ] Actualizar `walkthrough.md`/`spec.md` y marcar esta fase completa al cerrar
