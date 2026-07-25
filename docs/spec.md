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

## 7. Casos límite / gaps conocidos, aún sin resolver

- **Combos de servicios, citas de acompañante y templates por vertical (diseñados, no implementados).**
  Un cliente de barbería puede querer corte+barba+tinte como un solo bloque cobrado con comisión
  desglosada por servicio; un cliente puede venir acompañado (padre e hijo) y ambos atenderse; cada
  vertical debería sentir su propio dashboard/home, no una etiqueta cambiada sobre el mismo layout. Diseño
  completo en [`Plan_Multi_Industria_Fase4_CombosGruposTemplates.md`](./02-arquitectura-y-db/Plan_Multi_Industria_Fase4_CombosGruposTemplates.md),
  tareas en [`plan.md`](./plan.md) §2.2.
- **Anti-abuso, confirmación obligatoria y calendario en tiempo real (diseñados, no implementados).**
  Verificado contra el código real, no asumido: el recordatorio de WhatsApp ya le pide al cliente
  "responde 1 para confirmar" pero el webhook no está conectado a esa cita específica — una función que
  el sistema promete y no cumple hoy. Tampoco existe enforcement del campo `clientes.bloqueado` (el
  toggle del admin es decorativo), ni límite de reservas sin confirmar por teléfono, ni actualización del
  calendario sin recargar. Diseño completo en
  [`Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md`](./02-arquitectura-y-db/Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md),
  tareas en [`plan.md`](./plan.md) §2.3.
- Banner de "Reserva Pausada" en el portal público cuando el kill-switch está activo — documentado como
  esperado, nunca implementado en frontend.
- `transacciones.comisionBarbero`/`propinaBarbero` — columnas fiscales append-only, deliberadamente no
  renombradas junto con el resto del rename `barbero`→`empleado`; requieren revisión dedicada.

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

**Honesto, no aspiracional:** los 13 archivos `*.spec.ts` de `apps/api` y el único `*.e2e-spec.ts` son
boilerplate de `nest generate` sin personalizar (prueban `"Hello World!"`, no lógica de negocio real).
`apps/web` tiene Vitest + Testing Library instalados pero cero archivos `*.test.tsx`. Cobertura real de
tests automatizados: **cero**. Ver
[`Auditoria_Metodologia_Desarrollo_IA.md`](./01-vision-y-plan/Auditoria_Metodologia_Desarrollo_IA.md)
para el detalle completo y `plan.md` para la tarea de remediación.

## 11. Documentos relacionados

- [`plan.md`](./plan.md) — roadmap de fases y tareas chicas, incluyendo el rebrand a Volumetrix.
- [`README.md`](./README.md) — índice completo de toda la documentación por categoría.
- [`04-hitos-y-changelogs/walkthrough.md`](./04-hitos-y-changelogs/walkthrough.md) — recorrido de 15
  minutos por todo lo construido hasta ahora.
