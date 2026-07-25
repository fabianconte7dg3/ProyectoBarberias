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

## Fase 1 — Rebrand: BarberOS → Volumetrix 🔲 Propuesto, no iniciado

> **Estado de verificación (2026-07-24):** se confirmó contra el código real que **nada de este rebrand
> se ejecutó todavía** — cero ocurrencias de "Volumetrix" en todo el repo. Todos los archivos referenciados
> abajo existen tal como se listan (verificado con `find`/`grep`, no asumido). Este plan viene con 3
> banderas del autor original que requieren una decisión explícita antes de ejecutar — están reproducidas
> tal cual en la sección "Decisiones pendientes" más abajo. **No ejecutar sin resolver esas 3 primero.**

### A. Infraestructura & Docker

- [ ] `infrastructure/docker-compose.yml`: `barberos_postgres`→`volumetrix_postgres`,
      `barberos_redis`→`volumetrix_redis`, `POSTGRES_DB: barberos`→`volumetrix`
      — ⚠️ ver Decisión Pendiente #3 (recreación de volumen)

### B. Backend (`apps/api`)

- [ ] `schema.ts`: `estadoBarberiaEnum` → `estadoTenantEnum` (**solo el nombre de la variable TS** — el
      enum físico de Postgres `estado_barberia` NO cambia, cero migración SQL necesaria para esto)
- [ ] Reemplazar los 2 literales `"BarberOS"` en `super-admin.service.ts` (líneas 37 y 78 — URL de TOTP y
      mensaje de bienvenida del setup inicial)
- [ ] Revisar strings de UI/respuesta en `tenants.service.ts`
- [ ] Revisar strings hardcoded en `auth.controller.ts`, `citas.controller.ts`, `clientes.controller.ts`,
      `kill-switch.guard.ts`, `usuarios.service.ts`, `servicios.service.ts`
- [ ] **NO tocar:** tabla física `barberias`, enum `industria_negocio` (valor `barberia` se queda), FK de
      las 11 tablas relacionadas — eso es una migración aparte, fuera de este plan

### C. Frontend (`apps/web`)

- [ ] Mover `apps/web/src/app/[tenantSlug]/admin/barberos/` → `.../admin/empleados/`, agregar redirect
      301 desde la ruta vieja
- [ ] Renombrar `components/super-admin/BarberiasEnRiesgoCard.tsx` → `NegociosEnRiesgoCard.tsx`
      (componente + import)
- [ ] Renombrar `components/super-admin/CrearBarberiaModal.tsx` → `CrearNegocioModal.tsx` + copy "Crear
      Barbería" → "Crear Negocio"
- [ ] Reemplazar los 5 literales `"BarberOS"` confirmados en frontend:
      `app/super-admin/page.tsx:172`, `app/super-admin/login/page.tsx:100`,
      `app/super-admin/setup/page.tsx:129`, `components/booking/SuccessView.tsx:15`,
      `components/admin/AdminHeader.tsx:76` — más el texto de `app/[tenantSlug]/admin/datos/page.tsx:393`
      (copy de exportación de clientes, menciona "BarberOS filtra automáticamente...")

### D. Documentación

- [x] `docs/spec.md` — este mismo plan lo generó (ver commit de esta sesión)
- [x] `docs/plan.md` — este archivo
- [ ] `CLAUDE.md` / `.agents/AGENTS.md`: actualizar nombre del proyecto y referencias a "BarberOS" **solo
      después** de que el rebrand de código (secciones A-C) esté efectivamente hecho — hacerlo antes
      dejaría la documentación describiendo un estado que el código todavía no tiene, que es exactamente
      el tipo de inconsistencia que
      [`Auditoria_Metodologia_Desarrollo_IA.md`](./01-vision-y-plan/Auditoria_Metodologia_Desarrollo_IA.md)
      identificó como anti-patrón a evitar

### E. Walkthrough

- [x] `docs/04-hitos-y-changelogs/walkthrough.md` — creado en esta sesión, documenta el estado **actual**
      (pre-rebrand, marca "BarberOS") — se actualizará cuando la Fase 1 se ejecute

### Decisiones pendientes (reproducidas del plan original, sin resolver todavía)

1. **¿Los slugs de tenants actuales (`estilo-solo-carlos`, etc.) siguen funcionando igual?** Asunción del
   plan original: sí, los slugs son datos, no código — el rebrand no los toca. Nadie lo ha confirmado
   explícitamente todavía.
2. **¿La ruta `/[tenantSlug]/admin/barberos` se renombra a `/empleados` con redirect 301?** Incluido en el
   plan (sección C), pero no confirmado por el usuario.
3. **Docker Compose — renombrar `POSTGRES_DB: barberos` → `volumetrix` requiere recrear el volumen o
   hacer `pg_dump` + restore.** Inocuo en dev local, pero es una acción con pérdida de datos si se hace
   mal — **no ejecutar sin que el usuario confirme el método** (recreación vs dump/restore) y sin
   respaldo previo.

### Verificación (cuando se ejecute)

```bash
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
```
- Docker Compose levanta con los nuevos nombres de contenedor.
- `npm run dev` en ambos paquetes sin errores.
- `/[slug]/admin/empleados` carga la lista de empleados; `/[slug]/admin/barberos` redirige 301.
- Super-admin login muestra el nuevo nombre.
- El panel de un tenant sigue mostrando su terminología dinámica (no hardcoded).

## Fase 2 — Multi-Industria Funcional 🔲 Pendiente

> **Diseño acordado con el usuario (2026-07-24, vía entrevista) — ver
> [`Plan_Multi_Industria_Fase3_DatosPorVertical.md`](./02-arquitectura-y-db/Plan_Multi_Industria_Fase3_DatosPorVertical.md)
> para el detalle completo y el porqué de cada decisión.** Nada de esto está implementado todavía —
> son tareas listas para ejecutar cuando el usuario lo confirme.

### 2.1 Modelo de datos por vertical (mascotas/pacientes + historial clínico)

- [ ] `schema.ts`: nueva tabla `pacientes` (`tenantId`, `clienteId`, `nombre`, `camposPersonalizados`
      jsonb, `activo`)
- [ ] `schema.ts`: `citas.pacienteId` (UUID, nullable, FK a `pacientes`)
- [ ] `schema.ts`: nueva tabla `notas_clinicas` (`citaId`, `pacienteId`, `empleadoId`, `diagnostico`,
      `tratamiento`, `proximaRevisionEn`, `createdAt`)
- [ ] `schema.ts`: `barberias.configCamposPersonalizados` (jsonb, default `[]`)
- [ ] Migración SQL idempotente `0012_pacientes_y_notas_clinicas.sql` (2 tablas nuevas + 2 columnas,
      políticas RLS estándar por `tenant_id` en las tablas nuevas)
- [ ] Backend: `PacientesModule` (CRUD básico, scoped a `clienteId`)
- [ ] Backend: `NotasClinicasModule` con `findFullByCita()` (solo autor) y `findMetadataByCita()` (admin,
      sin contenido clínico) — ver sección 4 del doc de diseño para el porqué de este patrón
- [ ] Backend: plantillas de `configCamposPersonalizados` por defecto según `industria`, aplicadas al
      crear un tenant desde SuperAdmin (`crearTenantManual`)
- [ ] Frontend: formulario de paciente (mascota) dentro del flujo de cliente, renderizado dinámicamente
      desde `configCamposPersonalizados` — solo visible cuando el tenant tiene `industria` que lo requiere
- [ ] Frontend: captura de nota clínica al cerrar una cita (solo visible/editable por el empleado
      asignado a esa cita)
- [ ] Frontend: vista de admin con metadata de notas clínicas (sin contenido) para auditoría/reportes

### 2.2 Combos, citas grupales y templates por vertical

> Diseño acordado con el usuario (2026-07-24, vía entrevista) — ver
> [`Plan_Multi_Industria_Fase4_CombosGruposTemplates.md`](./02-arquitectura-y-db/Plan_Multi_Industria_Fase4_CombosGruposTemplates.md)
> para el detalle y el porqué de cada decisión.

**Combos de servicios:**
- [ ] `schema.ts`: nuevas tablas `combos` (`nombre`, `precioTotal`, `duracionAjustadaMinutos`, `activo`)
      y `combo_servicios` (`comboId`, `servicioId`, `orden`, `precioAsignado`)
- [ ] `schema.ts`: `citas.servicioId` pasa a nullable; nueva `citas.comboId` (nullable, FK a `combos`)
- [ ] Migración SQL idempotente `0013_combos.sql`
- [ ] Backend: cálculo de duración de cita cuando es un combo (`combos.duracionAjustadaMinutos` o suma de
      `duracionMinutos` de sus servicios) en `citas.service.ts`
- [ ] Backend: al cobrar una cita con `comboId`, generar una fila de `detallesTransaccion` por cada
      servicio del combo (reusa la tabla existente, sin schema nuevo para esto)
- [ ] Frontend: gestión de combos en `admin/configuracion`, selector de combo en el flujo de reserva
      pública

**Citas grupales (acompañante):**
- [ ] `schema.ts`: `citas.grupoReservaId` (nullable UUID) + índice parcial
- [ ] Migración SQL (puede ir junto con `0013_combos.sql` o aparte)
- [ ] Backend: crear N citas con el mismo `grupoReservaId` en una sola operación transaccional (extender
      `crearCita` o un nuevo `crearCitasGrupales`)
- [ ] **Decisión pendiente, no resuelta en el diseño:** cómo se cobra un grupo en una sola transacción,
      dado que `transacciones.citaId` referencia una sola cita hoy — requiere revisión dedicada antes de
      tocar `transacciones` (tabla fiscal, ver `CLAUDE.md`)
- [ ] Frontend: flujo de reserva pública con "agregar acompañante"; agenda de staff muestra citas del
      mismo grupo agrupadas visualmente

**Templates por vertical (widgets configurables):**
- [ ] `schema.ts`: `barberias.configWidgetsDestacados` (jsonb, default `[]`)
- [ ] Frontend: `WIDGET_REGISTRY` + zona de widgets destacados en `admin/dashboard` (primero; home/citas
      después)
- [ ] Backend: plantilla de widgets por defecto según `industria`, aplicada al crear un tenant

### 2.3 Agenda: anti-abuso, confirmación y migración de historial

> Diseño acordado con el usuario (2026-07-24, 2 rondas de entrevista) — ver
> [`Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md`](./02-arquitectura-y-db/Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md).
> Incluye un hallazgo real: el recordatorio de WhatsApp ya promete "responde 1 para confirmar" pero el
> webhook no cumple eso hoy — corregirlo es parte de esta fase, no un bug aparte.

**Calendario en tiempo real:**
- [ ] Backend: `EventEmitter2` + endpoint SSE `GET /horarios/disponibilidad/stream`
- [ ] Backend: emitir evento en `citas.service.ts`/`horarios.service.ts` al crear/cancelar cita o bloqueo
- [ ] Frontend: `TimeSlotGrid` se suscribe vía `EventSource`, refresca al recibir evento

**Confirmación obligatoria (WhatsApp + link web):**
- [ ] `schema.ts`: `citas.confirmada` (boolean, default `false`), `citas.confirmacionSolicitadaEn`
      (timestamptz, nullable), `barberias.horasAntesConfirmacion` (integer, default `4`)
- [ ] Backend: job BullMQ `solicitar_confirmacion` (reutiliza `tokenCliente`/`tokenExpiraEn` existentes)
- [ ] Backend: endpoint público `POST /citas/publica/:id/confirmar?token=...`
- [ ] Backend: job `liberar_si_no_confirmo`
- [ ] Backend: regla de auto-confirmación si la reserva se hizo con menos anticipación que la ventana
- [ ] **Fix del webhook existente:** `whatsapp.controller.ts` — el "1"/"2" del menú general no debe
      confundirse con una respuesta a un pedido de confirmación de cita específica; el mensaje de
      recordatorio deja de prometer algo que no cumple

**Enforcement de bloqueo + alerta de inasistencias (sin auto-bloqueo):**
- [ ] Backend: `crearCitaPublica` valida `cliente.bloqueado` (cierra un gap ya existente, el toggle del
      admin hoy no tiene efecto)
- [ ] `schema.ts`: nueva tabla `inasistencias` (`clienteId`, `citaId`, `fecha`)
- [ ] Backend: insertar en `inasistencias` en los mismos 2 puntos donde ya se incrementa `ausenciasStrikes`
- [ ] Frontend: badge/alerta de inasistencias visible al staff al crear cita o ver ficha de cliente

**"1 cita activa sin confirmar" por teléfono:**
- [ ] Backend: `crearCitaPublica` rechaza (409) si ya existe una cita `programada`+`confirmada=false` del
      mismo cliente — no aplica a citas creadas por staff

**Campos obligatorios al reservar:**
- [ ] `CreateClienteDto.nombreCompleto`: de opcional a requerido
- [ ] Backend: `notas` (motivo) requerido a nivel de aplicación solo si `industria` es veterinaria/clínica

**Migración de historial de citas pasadas:**
- [ ] Backend: `POST /importaciones/citas_historicas` — no debe encolar jobs normales (recordatorio,
      confirmación) por ser fechas pasadas
- [ ] Definir si suman a `clientes.totalAsistencias`/`totalGastado`

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
