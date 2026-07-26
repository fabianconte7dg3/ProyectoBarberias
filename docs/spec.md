# Especificación de Producto — Volumetrix

> **Nota de nomenclatura:** "Volumetrix" es el nombre de marca del producto — el rebrand desde "BarberOS"
> se ejecutó el 2026-07-25 (ver [`plan.md`](./plan.md), Fase 1, y el detalle en
> [`Plan_Rebrand_Fase1_BarberOS_a_Volumetrix.md`](./02-arquitectura-y-db/Plan_Rebrand_Fase1_BarberOS_a_Volumetrix.md)).
> Código, base de datos (`volumetrix`), contenedores Docker (`volumetrix_postgres`/`volumetrix_redis`) y
> las cadenas de texto en pantalla ya dicen "Volumetrix". La tabla física `barberias` y el enum
> `industria_negocio` (valor `barberia`) se dejaron sin tocar a propósito — son datos de negocio, no
> marca, y renombrarlos es una migración aparte fuera de alcance de este rebrand.

## 1. Qué es Volumetrix

Un SaaS multi-tenant de agendamiento y operación para negocios de servicios por cita — nacido como
sistema operativo para barberías en Panamá, con una arquitectura deliberadamente agnóstica de industria
(ver [`Vision_Multi_Industria.md`](./01-vision-y-plan/Vision_Multi_Industria.md)). Resuelve tres
problemas para el dueño de un negocio de servicios: agenda sin choques de horario, cobro con control de
caja/comisiones, y comunicación automática con el cliente (WhatsApp) — todo aislado por tenant a nivel de
base de datos, no solo de aplicación.

## 2. Verticales

- **Activo hoy (Go-To-Market):** barberías y salones de belleza en Panamá.
- **Soportado a nivel de esquema; veterinaria y clínica médica ya tienen captura de datos propia**
  (entidad `pacientes` + `notas_clinicas`, ver [`plan.md`](./plan.md) §2.1); spa/masajes, taller mecánico
  y espacios de alquiler (canchas/salas) siguen sin UI/flujo de captura propio (ver hallazgo en
  [`Auditoria_Metodologia_Desarrollo_IA.md`](./01-vision-y-plan/Auditoria_Metodologia_Desarrollo_IA.md)
  y [`plan.md`](./plan.md) Fase 2.4). El enum `industria_negocio` y las columnas
  `terminologia_empleado/servicio/cliente` ya existen para todos los verticales; falta validar un piloto
  real de punta a punta con un tenant no-barbería.

## 3. Actores

| Rol | Acceso | Cómo entra |
|---|---|---|
| **Cliente final** | Portal público de reserva (`/[tenantSlug]/reservar`), sin cuenta | Sin login — flujo público |
| **Empleado** (antes "barbero") | Agenda propia, cobro de citas propias | PIN de 4 dígitos (`/auth/login/staff`) |
| **Recepción** | Igual que empleado + gestión de todo el staff visible | PIN de 4 dígitos |
| **Admin de tenant** | Panel completo: catálogo, reportes, configuración, caja | Email + contraseña (`/auth/login/admin`) |
| **SuperAdmin de plataforma** | Alta de tenants, planes, kill-switch, observabilidad global | Email + contraseña + TOTP obligatorio (`/super-admin`) |

## 4. Módulos funcionales (mapeados a `apps/api/src/*`)

- **Auth** — dos flujos de login no intercambiables (admin por password, staff por PIN), cookies
  `httpOnly`, rate-limiting progresivo por usuario.
- **Citas** — creación con idempotencia, bloqueo optimista contra double-booking (`EXCLUDE` constraint
  `btree_gist`), auto-resolución de empleado para modo "Solo-preneur" (un solo empleado activo).
  Notificaciones asíncronas vía BullMQ (recordatorio 24h, cancelación por retraso).
- **Horarios** — disponibilidad por empleado, bloqueos temporales (reservas en curso, ausencias).
- **Clientes** — CRM básico: historial, strikes de ausencia, cliente frecuente.
- **Servicios / Productos** — catálogo con precio y duración; productos para venta de mostrador (POS).
- **Transacciones / Caja** — cobro mixto (efectivo con denominación + Yappy con validación visual),
  comisiones, arqueo de caja (`efectivoEsperado` vs `efectivoDeclarado` → `cuadrado`/`sobrante`/`faltante`).
- **Reportes** — producción por empleado, desglose de métodos de pago, series temporales.
- **DGI** — emisión de factura fiscal panameña (vía proveedor externo), asíncrona.
- **WhatsApp** — mensajería vía Evolution API/BullMQ: confirmaciones, recordatorios, webhooks entrantes
  de confirmación/cancelación del cliente.
- **Yappy** — cobro digital vía webhook HMAC-firmado.
- **Importaciones / Datos** — exportación de datos de clientes con filtro de consentimiento explícito
  (cumplimiento de protección de datos).
- **Tenants** — perfil público de tenant (nombre, color, terminología dinámica) para el portal.
- **Super-Admin** — onboarding asistido de tenants, gestión de planes, kill-switch por tenant, canario de
  RLS automatizado, alertas de seguridad, métricas de churn/riesgo.
- **Audit** — log inmutable de acciones sensibles (cierre de caja con descuadre, reseteo de contraseñas).

## 5. Requisitos no funcionales

- **Aislamiento multi-tenant a nivel de base de datos**, no solo de aplicación — Row-Level Security de
  PostgreSQL, verificado en producción por un job canario horario (`CanaryProcessor`) que detecta si
  alguna consulta sin scope de tenant expone filas ajenas.
- **Confidencialidad** — cumplimiento de la Ley 81 de Panamá (protección de datos personales); ningún
  tenant puede ver datos de otro.
- **Integridad financiera** — transacciones ACID, proceso de "Cierre Ciego de Caja" (el conteo físico se
  declara antes de ver el esperado, forzando honestidad operativa).
- **Disponibilidad** — objetivo de despliegue en VPS (Hetzner/DigitalOcean), respaldos automáticos y
  balanceo de carga — **no implementado todavía**, ver [`plan.md`](./plan.md) Fase 4.

## 6. Casos límite ya resueltos (evidencia: código + hitos documentados)

- Doble clic / requests duplicados al crear una cita → idempotencia por `idempotencyKey`.
- Dos clientes reservando el mismo horario simultáneamente → constraint `EXCLUDE` a nivel de PostgreSQL,
  no solo validación en aplicación (`citas.service.ts:crearCita`, catch de código `23P01`).
- Cliente cancela 5 minutos antes → cancelación sin *strike* (`cancelarPorCliente`, distinto de
  `ausente_strike`, que sí penaliza).
- Jornada que empieza tarde → el bloque de almuerzo se desplaza automáticamente para no pisar turnos ya
  agendados.
- Falla el proveedor de facturación DGI al momento de cobrar → emisión encolada/asíncrona, no bloquea el
  cobro en caja.
- Recarga dura del navegador en admin/staff → corregido en esta misma iniciativa multi-industria (ver
  `Plan_Multi_Industria_Fase2D_TerminologiaDinamica.md`), era una carrera de hidratación de Zustand que
  deslogueaba sesiones válidas.
- Kill-switch de plataforma sobre un tenant → bloquea toda mutación (`503` a cualquier verbo que no sea
  `GET`) sin afectar a otros tenants.
- Cliente de veterinaria/clínica con varias mascotas/pacientes, cada una con historial clínico propio →
  entidad `pacientes` + `notas_clinicas` estructurada, confidencialidad a nivel de aplicación (solo el
  profesional autor ve el contenido; el admin ve metadata, nunca diagnóstico/tratamiento), motor de
  campos personalizados por tenant para que agregar un vertical nuevo no requiera tocar código — ver
  [`Plan_Multi_Industria_Fase3_DatosPorVertical.md`](./02-arquitectura-y-db/Plan_Multi_Industria_Fase3_DatosPorVertical.md).
- Combo de servicios (corte+barba+tinte) cobrado como un solo bloque pero con comisión desglosada por
  servicio interno → tablas `combos`/`combo_servicios` ("bundle rastreado"), una línea de
  `detallesTransaccion` por servicio al cobrar. Cita de acompañante (cliente + 2da persona atendida en la
  misma visita, aunque los empleen empleados distintos) → `citas.grupoReservaId` + cobro conjunto en una
  sola transacción con atribución de comisión por línea/empleado real — ver
  [`Plan_Multi_Industria_Fase4_CombosGruposTemplates.md`](./02-arquitectura-y-db/Plan_Multi_Industria_Fase4_CombosGruposTemplates.md).
- Cliente reserva sin confirmar y desaparece → confirmación obligatoria (WhatsApp con link + respaldo
  web) con auto-liberación del horario si no confirma a tiempo; reserva con menos anticipación que la
  ventana de confirmación se auto-confirma (no tendría sentido esperar respuesta). Cliente ya bloqueado
  por el admin intenta reservar por el portal público → rechazado (`403`). Cliente con una reserva sin
  confirmar intenta agendar otra por el portal público → rechazado (`409`) hasta que confirme o se libere
  la anterior — ninguna de las dos reglas aplica cuando el staff agenda manualmente, que ya tiene contexto
  real del cliente. Calendario público desactualizado tras una reserva de otro cliente → stream SSE
  (`GET /horarios/disponibilidad/stream`) empuja un aviso al navegador para refrescar sin recargar. Ver
  [`Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md`](./02-arquitectura-y-db/Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md).
- Dueño de negocio pausa el auto-servicio (`killSwitchActivo`) para una emergencia → el portal público
  muestra un banner bloqueante ("Reservas pausadas temporalmente") y el backend rechaza cualquier
  `POST`/`PUT`/`PATCH`/`DELETE` público con `503`, sin excepción para el propio admin. SuperAdmin bloquea
  la plataforma completa de un tenant (`bloqueadoPorPlataforma`, nivel más severo) → se rechaza incluso al
  admin autenticado con una sesión ya emitida, no solo en el próximo login. Piloto de vertical no-barbería
  (veterinaria) de punta a punta con datos reales, no solo terminología — ver `plan.md` §2.4.

## 7. Casos límite / gaps conocidos, aún sin resolver

- **Templates por vertical más allá del dashboard (parcial).** El motor de widgets destacados
  (`WIDGET_REGISTRY` + `barberias.configWidgetsDestacados`) está implementado y funcionando en
  `admin/dashboard`; extenderlo a home/citas queda pendiente — ver
  [`Plan_Multi_Industria_Fase4_CombosGruposTemplates.md`](./02-arquitectura-y-db/Plan_Multi_Industria_Fase4_CombosGruposTemplates.md)
  §1. "Agregar acompañante" también quedó implementado solo en el flujo de recepción/admin
  (`QuickWalkInModal`), no en el wizard de reserva pública — ver §7.3 del mismo documento para el
  porqué de esa desviación de alcance.
- **Portal de reserva pública sin selector de fecha por rango largo / vista mensual** — el `DaySelector`
  del wizard muestra solo un carrusel corto de días, no un calendario mensual completo. No bloqueante,
  fuera del alcance de la Fase 2.3 (que se centró en anti-abuso y tiempo real, no en UX de selección de
  fecha).
- **Botón "Avisar por WhatsApp" de la pantalla de éxito de reserva usa un número simulado.** Encontrado en
  el piloto de vertical no-barbería (Fase 2.4): `SuccessView.tsx` arma el deep-link de WhatsApp con un
  teléfono hardcodeado (`"50761234567"`), no el número real del negocio — el perfil público del tenant
  (`GET /tenants/publico/:slug`) no expone hoy ningún campo de WhatsApp/contacto. Requiere decidir qué
  campo exponer (¿`telefonoNegocio`? ¿el número de `whatsapp_config`?) y si es información sensible del
  negocio antes de corregirlo.
- **CTA de contacto de la landing page (`/`) usa un email no verificado.** Encontrado al construir la
  landing en la Fase 6.6: no existe hoy ningún flujo de alta de tenant self-service ni canal de
  contacto público confirmado, así que el CTA usa `mailto:hola@volumetrixpa.com` — una dirección
  plausible sobre el dominio de producción ya decidido en la Fase 4, pero no confirmada como buzón
  real provisionado. Mismo tipo de gap que el punto anterior: requiere que el usuario confirme o
  provisione el canal de contacto real antes de depender de ese botón en producción.

## 8. Arquitectura y stack tecnológico

Ver [`CLAUDE.md`](../CLAUDE.md) para la guía completa y actualizada de arquitectura (multi-tenancy RLS,
convención de migraciones hand-written, patrón `TenantContext`/`runInTenantScope`, Context de React para
terminología dinámica). Resumen: NestJS 11 + Drizzle ORM + PostgreSQL 16 + Redis/BullMQ en el backend;
Next.js 16 (App Router) + React 19 + Zustand + Tailwind 4 en el frontend.

## 9. Integraciones externas

| Integración | Propósito | Estado |
|---|---|---|
| Yappy | Cobro digital vía webhook HMAC | Implementado |
| WhatsApp (Evolution API) | Recordatorios, confirmaciones, webhooks entrantes | Implementado |
| DGI (vía GuruSoft/Alegra) | Facturación fiscal panameña | Implementado (asíncrono) |

Ver [`docs/03-integraciones/`](./03-integraciones/) para el detalle de cada una.

## 10. Estado de calidad y tests

**Honesto, no aspiracional.** Desde la Fase 3 (2026-07-25) los 3 módulos más críticos tienen
cobertura real: aislamiento RLS multi-tenant, idempotencia de `crearCita`/`crearCitasGrupales`, y
cálculo de comisiones de `cobrarCita`/`cobrarGrupo` — 13 integration tests en `apps/api` que corren
contra una base de datos de test dedicada (`volumetrix_test`, mismo contenedor Docker) vía
`npm run test:integration`, más 8 tests en `apps/web` (`npm test`) para `calcularSlotsDisponibles` y
`ProfileSelector`. Detalle completo del diseño (por qué integration tests reales y no mocks para RLS)
en [`Plan_Fase3_Suite_Tests.md`](./02-arquitectura-y-db/Plan_Fase3_Suite_Tests.md).

Lo que **no** se tocó: los 13 archivos `*.spec.ts` originales de `apps/api` y el único `*.e2e-spec.ts`
siguen siendo boilerplate de `nest generate` sin personalizar — y de hecho están rotos hoy (`npm test`
falla en 12 de los 13, ver `plan.md` Fase 3): los controllers ya requieren providers reales
(`DRIZZLE_POOL_DB`, `Queue`, etc.) que el boilerplate nunca registró. Ver
[`Auditoria_Metodologia_Desarrollo_IA.md`](./01-vision-y-plan/Auditoria_Metodologia_Desarrollo_IA.md)
para el detalle histórico y `plan.md` para lo que queda pendiente.

## 11. Documentos relacionados

- [`plan.md`](./plan.md) — roadmap de fases y tareas chicas, incluyendo el rebrand a Volumetrix.
- [`README.md`](./README.md) — índice completo de toda la documentación por categoría.
- [`04-hitos-y-changelogs/walkthrough.md`](./04-hitos-y-changelogs/walkthrough.md) — recorrido de 15
  minutos por todo lo construido hasta ahora.
