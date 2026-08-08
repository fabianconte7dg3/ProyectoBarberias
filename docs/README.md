# 📚 Documentación Técnica de Volumetrix (SaaS Multitenant)

¡Bienvenido a la documentación oficial de **Volumetrix**! (nombre de código del repositorio:
"ProyectoBarberias" — histórico, el producto se rebrandeó a Volumetrix el 2026-07-25, ver
[`plan.md`](./plan.md) Fase 1).

Esta documentación está organizada de forma modular en categorías claras para facilitar su navegación, mantenimiento y referencia técnica.

## 🚀 Empezar aquí

- [`spec.md`](./spec.md) — especificación de producto completa (verticales, actores, módulos, casos límite, integraciones, estado de tests).
- [`plan.md`](./plan.md) — roadmap en tareas chicas tachables, fase por fase (fuente única de verdad de qué falta — no hay otro roadmap "vivo" en el repo).
- [`04-hitos-y-changelogs/walkthrough.md`](./04-hitos-y-changelogs/walkthrough.md) — recorrido de 15 minutos por la arquitectura y todo lo construido hasta hoy.
- [`../CLAUDE.md`](../CLAUDE.md) — guía de arquitectura, comandos y convenciones para trabajar en el código.

---

## 📂 Estructura de la Documentación

```
docs/
├── 01-vision-y-plan/           # Planificación de producto, roadmap y modelos de negocio vigentes
├── 02-arquitectura-y-db/       # Arquitectura técnica, diseño relacional, RLS, stack, diseño multi-industria
├── 03-integraciones/           # Documentación de APIs e integraciones de terceros (Yappy, WhatsApp)
├── 04-hitos-y-changelogs/      # Historial de desarrollo, resúmenes de entregables y walkthroughs
├── 05-diseno-y-ux/             # Identidad visual y flujos operativos
├── 06-referencias-tecnicas/    # Guías técnicas y credenciales de QA
└── archives/                   # Documentos superados/históricos — ver sección al final de este índice
```

> **Nota sobre esta reorganización (2026-07-24):** varios documentos que existían antes se movieron a
> `archives/` por estar duplicados entre sí o superados por versiones más nuevas y precisas (un ERD que
> documentaba 12 tablas cuando hay 19 reales, 3 roadmaps distintos apuntándose entre sí, docs de ideación
> que recomendaban Supabase — nunca usado). Cada archivo movido tiene un banner al inicio explicando qué
> lo reemplaza. Si buscas algo que solía estar en `01-vision-y-plan/` o `02-arquitectura-y-db/` y no
> aparece en el índice de abajo, probablemente está en `archives/`.

---

## 🗺️ Índice de Contenidos (documentos vigentes)

### 📍 [01. Visión y Planificación](./01-vision-y-plan/)
- [Auditoría: Metodología de Desarrollo Asistido por IA](./01-vision-y-plan/Auditoria_Metodologia_Desarrollo_IA.md) — Cumplimiento del flujo Planificar/Contexto real (MCP)/Verificar y anti-patrones.
- [Roadmap Backend](./01-vision-y-plan/Roadmap_Backend.md) — Completo, 7/7 hitos. Registro histórico del orden de construcción del backend.
- [Roadmap Frontend](./01-vision-y-plan/Roadmap_Frontend.md) — Completo, 4/4 hitos. Registro histórico del orden de construcción del frontend.
- [Visión Multi-Industria](./01-vision-y-plan/Vision_Multi_Industria.md) — Por qué la arquitectura permite pivotar a otros verticales sin reescribir el motor.
- [Ideas Futuras: Expansión & Empleado Solo-preneur](./01-vision-y-plan/IDEAS_FUTURAS_EXPANSION_Y_SOLO_PRENEUR.md) — Adaptación a profesional independiente y nuevas verticales.
- [Estrategia de Precios](./01-vision-y-plan/Estrategia_Precios.md) — Estrategia comercial oficial (anula pricing de documentos anteriores).

### 📍 [02. Arquitectura & Base de Datos](./02-arquitectura-y-db/)
- [Modelo de Datos — Panorama Relacional](./02-arquitectura-y-db/Modelo_Base_Datos_ERD.md) — Las 19 tablas reales, propósito y relaciones (no un diccionario de campos — eso vive en `schema.ts`).
- [Consideraciones de Seguridad de Aplicación](./02-arquitectura-y-db/Consideraciones_Seguridad.md) — Auth, PWA, enlaces tokenizados (no RLS — eso está en `CLAUDE.md`).
- [Catálogo de 30 Casos Límite Operativos](./02-arquitectura-y-db/Manejo_de_Errores.md) — Casos de negocio reales (pagos, concurrencia, errores humanos) y su solución de diseño.
- [Stack Web](./02-arquitectura-y-db/Stack_Web.md) — Elección de tecnologías (NestJS, Next.js, BullMQ, Tailwind) con correcciones sobre qué se adoptó realmente.
- [Escalabilidad y Crecimiento](./02-arquitectura-y-db/Escalabilidad_y_Crecimiento.md) — Hoja de ruta de escalado por fases, con costos y umbrales.
- [Auditoría del Stack Tecnológico](./02-arquitectura-y-db/Auditoria_Stack_Tecnologico.md) — 56 vulnerabilidades encontradas y remediadas (39→0 backend, 17→6 residuales de bajo riesgo), dependencias muertas eliminadas, todo verificado en vivo.
- [Rebrand — Fase 1: BarberOS → Volumetrix](./02-arquitectura-y-db/Plan_Rebrand_Fase1_BarberOS_a_Volumetrix.md) — Backend, frontend, infra (Docker/DB) y documentación renombrados. ✅ Implementado.
- [Multi-Industria — Fase 1: Esquema](./02-arquitectura-y-db/Plan_Multi_Industria_Schema.md) — Columnas de industria/terminología dinámica agregadas a `barberias`, `clientes` y `citas`. ✅ Implementado.
- [Multi-Industria — Fase 2: Rename `barbero` → `empleado`](./02-arquitectura-y-db/Plan_Multi_Industria_Fase2_Rename.md) — Rename completo backend/DB/frontend. ✅ Implementado.
- [Multi-Industria — Fase 2-D: Terminología Dinámica Real](./02-arquitectura-y-db/Plan_Multi_Industria_Fase2D_TerminologiaDinamica.md) — Endpoint público de tenant + Context de React. ✅ Implementado.
- [Multi-Industria — Fase 3: Modelo de Datos por Vertical](./02-arquitectura-y-db/Plan_Multi_Industria_Fase3_DatosPorVertical.md) — Entidad `pacientes`, historial clínico estructurado con confidencialidad por profesional, motor de campos personalizados. ✅ Implementado y verificado (2026-07-25).
- [Multi-Industria — Fase 4: Combos, Citas Grupales y Templates](./02-arquitectura-y-db/Plan_Multi_Industria_Fase4_CombosGruposTemplates.md) — Combos con comisión itemizada, citas de acompañante, widgets configurables por vertical. ✅ Implementado y verificado (2026-07-25).
- [Sistema de Agenda — Anti-abuso, Confirmación y Migración](./02-arquitectura-y-db/Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md) — Calendario en tiempo real (SSE), confirmación WhatsApp+web, enforcement de bloqueo, historial de inasistencias, importación de citas históricas. ✅ Implementado y verificado (2026-07-25).
- [Fase 3: Suite de Tests Automatizados Real](./02-arquitectura-y-db/Plan_Fase3_Suite_Tests.md) — DB de test dedicada, integration tests reales de RLS/idempotencia/comisiones, Vitest en frontend. ✅ Implementado (2026-07-25, alcance acordado — ver plan.md).
- [Fase 4: Infraestructura de Producción](./02-arquitectura-y-db/Plan_Fase4_Infraestructura.md) — Subdominio por tenant (`proxy.ts`), CORS/Caddy de producción, PgBouncer verificado empíricamente, CI/CD, staging desplegado y verificado en AWS real (2026-07-28). 🔶 Parcial — backups automáticos con PITR y monitoreo de disponibilidad siguen pendientes, ver [`plan.md`](./plan.md) Fase 4.

### 📍 [03. Integraciones Externas](./03-integraciones/)
- [Integración Yappy API](./03-integraciones/Integracion_Yappy_API.md) — Cobros digitales y webhooks HMAC. ✅ Implementado.
- [WhatsApp (Evolution API)](./03-integraciones/WhatsApp_Evolution_API.md) — Mensajería asíncrona y recordatorios. ✅ Implementado, con un hallazgo pendiente de corregir (webhook de confirmación).

### 📍 [04. Hitos Completados & Changelogs](./04-hitos-y-changelogs/)
- [Walkthrough (15 minutos)](./04-hitos-y-changelogs/walkthrough.md) — Recorrido completo de arquitectura y estado actual para alguien que entra nuevo al proyecto.
- [Resumen de Hitos y Flujos completos](./04-hitos-y-changelogs/RESUMEN_HITOS_Y_FLUJOS.md) — Resumen de Hitos 1 a 9 del backend.
- [CHANGELOG Frontend Hito 2](./04-hitos-y-changelogs/CHANGELOG_Frontend_Hito2.md) — Log histórico del MVP del portal de reservas.
- [CHANGELOG Hito 5](./04-hitos-y-changelogs/CHANGELOG_Hito5.md) — Log histórico del módulo financiero y Yappy.
- [Avances: Productos, Staff y Dashboards](./04-hitos-y-changelogs/WALKTHROUGH_PRODUCTOS_BARBEROS_Y_DASHBOARDS.md) — Log histórico de analítica, inventario y auditoría.

### 📍 [05. Diseño & UX](./05-diseno-y-ux/)
- [Perfil Operativo & Flujo](./05-diseno-y-ux/Perfil_Operativo_Flujo.md) — Experiencia operativa del staff y del cliente.
- [Estructura del CRM](./05-diseno-y-ux/Estructura_CRM.md) — Cómo funciona el CRM silencioso en la práctica.
- [Pantallas del MVP](./05-diseno-y-ux/Pantallas_Figma.md) — Las 9 pantallas del MVP y la identidad visual (paleta, tipografía) — ya construidas.
- [Rediseño Visual — Google Stitch (PRD + Design System)](./05-diseno-y-ux/Plan_Rediseno_Visual_Stitch.md) — 24 pantallas exportadas + 2 sistemas de diseño (tenant / Super Admin) + impersonation de Super Admin y vista "Mi Silla". ✅ Implementado — desglose ejecutable en [`plan.md`](./plan.md) Fase 6 y sub-fases 6-B a 6-J.

### 📍 [06. Referencias Técnicas](./06-referencias-tecnicas/)
- [Arquitectura de Datos — Guía de Setup](./06-referencias-tecnicas/README_Arquitectura_Datos.md) — Cómo dejar el patrón RLS/Drizzle funcionando en un entorno nuevo (corregido: ya no instruye usar `drizzle-kit`, prohibido en este proyecto).
- [Credenciales de Prueba (QA Local)](./06-referencias-tecnicas/Credenciales_QA_Local.md) — Tenant y usuarios de prueba dedicados con credenciales fijas, para no tocar cuentas de dev reales.
- [Matriz de Permisos, Roles y Estados de Bloqueo](./06-referencias-tecnicas/matriz-permisos-y-bloqueos.md) — RBAC, métodos de pago y cumplimiento regulatorio, y los kill-switches (`killSwitchActivo`/`bloqueadoPorPlataforma`) — ver [`plan.md`](./plan.md) Fase 2.4 para el enforcement real de backend que le faltaba.
- [Patrón de Autenticación para Páginas del Panel Admin](./06-referencias-tecnicas/patron-auth-paginas-admin.md) — Regla de oro `useAdminAuth` y el bug de carrera de hidratación de Zustand que previene (ver `plan.md` Fase 0).
- [Políticas SQL RLS (0001_rls_policies.sql)](./06-referencias-tecnicas/0001_rls_policies.sql) — Referencia del script de políticas.

---

## 📦 Archivados (`archives/`)

Documentos superados, conservados como registro histórico — cada uno tiene un banner explicando qué lo
reemplaza:

- [`Idea_SaaS_Barberias.md`](./archives/Idea_SaaS_Barberias.md), [`SaaS_Barberias_Panama.md`](./archives/SaaS_Barberias_Panama.md) — ideación temprana (recomendaban Supabase, nunca usado).
- [`Modelo_Base_Datos_General.md`](./archives/Modelo_Base_Datos_General.md), [`Motor_Base_Datos.md`](./archives/Motor_Base_Datos.md) — narrativas de justificación de RLS, duplicadas entre sí, superadas por [`CLAUDE.md`](../CLAUDE.md).
- [`Infraestructura_Hibrida.md`](./archives/Infraestructura_Hibrida.md) — narrativa de infraestructura, superada por [`Escalabilidad_y_Crecimiento.md`](./02-arquitectura-y-db/Escalabilidad_y_Crecimiento.md).
- [`Wireframes_UI.md`](./archives/Wireframes_UI.md) — mockups con imágenes rotas (ruta local de otra herramienta), pantallas ya construidas.
- [`Checklist_Desarrollo_SaaS.md`](./archives/Checklist_Desarrollo_SaaS.md), [`Checklist_Multi_Industria_y_Produccion.md`](./archives/Checklist_Multi_Industria_y_Produccion.md) — roadmaps anteriores, consolidados en [`plan.md`](./plan.md).

---

*Última actualización: 2026-08-08 — Proyecto Barberías SaaS*
