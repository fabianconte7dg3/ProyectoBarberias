> **📦 Archivado 2026-07-24.** Consolidación intermedia entre el roadmap original
> ([`Checklist_Desarrollo_SaaS.md`](./Checklist_Desarrollo_SaaS.md)) y el diseño detallado de Multi-Industria
> que vino después. Todo lo que describía como pendiente ya se detalló y amplió en documentos de diseño
> dedicados: [`Plan_Multi_Industria_Fase3_DatosPorVertical.md`](../02-arquitectura-y-db/Plan_Multi_Industria_Fase3_DatosPorVertical.md),
> [`Plan_Multi_Industria_Fase4_CombosGruposTemplates.md`](../02-arquitectura-y-db/Plan_Multi_Industria_Fase4_CombosGruposTemplates.md),
> [`Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md`](../02-arquitectura-y-db/Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md).
> Roadmap vigente con todas las tareas consolidadas: [`docs/plan.md`](../plan.md). Se conserva como
> registro histórico.

# Checklist Completo: De SaaS de Barberías a Plataforma Multi-Industria

> **Actualizado:** 2026-07-25
> **Avance general:** 8 / 27 tareas (1 de 6 fases completa)

Este documento consolida todo lo hecho hasta ahora en la iniciativa multi-industria (Fases 1, 2 y 2-D,
ver `docs/02-arquitectura-y-db/Plan_Multi_Industria_*.md`) con lo que falta para que el producto sea
realmente una plataforma multi-industria en producción — no solo a nivel de esquema y copy, sino
funcional y desplegable.

---

## Fase 1–2: Cimientos Multi-Industria ✅ Completo

- [x] Esquema: `industria` + `terminologia_empleado/servicio/cliente` en `barberias` — [Plan_Multi_Industria_Schema.md](../02-arquitectura-y-db/Plan_Multi_Industria_Schema.md)
- [x] Esquema: `datos_adicionales` (jsonb) en `clientes`, `notas` en `citas`
- [x] Rename completo `barbero → empleado` — backend, DB y frontend (51 archivos) — [Plan_Multi_Industria_Fase2_Rename.md](../02-arquitectura-y-db/Plan_Multi_Industria_Fase2_Rename.md)
- [x] SuperAdmin: selector de industria + terminología al crear un tenant
- [x] Terminología dinámica real en el Portal de Reserva público — [Plan_Multi_Industria_Fase2D_TerminologiaDinamica.md](../02-arquitectura-y-db/Plan_Multi_Industria_Fase2D_TerminologiaDinamica.md)
- [x] Terminología dinámica real en las 8 páginas del Panel de Administración
- [x] Fix: la sesión de admin/staff se cerraba sola por una carrera de hidratación de Zustand
- [x] Tenant + credenciales de QA reutilizables para pruebas — [Credenciales_QA_Local.md](../06-referencias-tecnicas/Credenciales_QA_Local.md)

## Fase 3: Multi-Industria Funcional 🔲 Pendiente — **prioridad inmediata**

> **El gap real:** verificado en el código, `clientes.datos_adicionales` y `citas.notas` (agregadas en la
> Fase 1) no tienen ningún DTO, endpoint o formulario que las use — cero referencias fuera del esquema.
> La terminología ya cambia ("Veterinario" en vez de "Barbero"), pero el sistema todavía no puede
> capturar el dato específico del vertical. Multi-industria hoy es cosmético, no funcional.

- [ ] Formulario y visualización de `datos_adicionales` por vertical (ej. nombre de mascota/raza para veterinaria)
- [ ] Definir el mecanismo de configuración de campos por industria — ¿JSON schema simple en `barberias`, o tabla dedicada de campos personalizados?
- [ ] Conectar `citas.notas` al flujo real de agendar/cobrar (hoy tampoco tiene wiring)
- [ ] Piloto de un vertical no-barbería de punta a punta: tenant real de veterinaria, agendar, cobrar, ver reportes con datos reales — no solo probar que el texto cambia
- [ ] Banner de "Reserva Pausada" en el portal público durante kill-switch (documentado en `matriz-permisos-y-bloqueos.md`, nunca construido)
- [ ] Decidir si renombrar `transacciones.comisionBarbero`/`propinaBarbero` — columnas append-only de un libro fiscal, requieren revisión dedicada aparte (excluido a propósito de la Fase 2)

## Fase 4: Calidad y Mantenimiento 🔲 Pendiente

- [ ] Suite de tests automatizados — hoy solo existe el boilerplate e2e de Nest sin personalizar
- [ ] `.gitignore` + sacar `node_modules` del control de versiones (~47.000 archivos trackeados hoy)
- [ ] Actualizar docs desactualizados: `Roadmap_Backend.md` (dice Hito 7 pendiente, ya está hecho) y el ERD (documenta 12 tablas, hay 20 reales)
- [ ] Deuda menor: `ProfileSelector.tsx` muestra el valor crudo del rol (`"empleado"`) en vez de la terminología del tenant

## Fase 5: Infraestructura de Producción 🔲 Pendiente

> Del propio roadmap original del proyecto (`Checklist_Desarrollo_SaaS.md`, Fases 4/6/7/8) — nunca
> ejecutado. Hoy todo corre en Docker local.

- [ ] Dominio, DNS por tenant y SSL/TLS
- [ ] Entornos separados: staging vs producción
- [ ] CI/CD con GitHub Actions
- [ ] Backups automáticos con Point-in-Time Recovery
- [ ] PgBouncer para connection pooling
- [ ] Monitoreo y alertas de disponibilidad

## Fase 6: Negocio Multi-Industria 🔲 Pendiente

> No es código, pero define hacia dónde apunta el código.

- [ ] Elegir el primer vertical piloto no-barbería — veterinaria es la mejor candidata según `IDEAS_FUTURAS_EXPANSION_Y_SOLO_PRENEUR.md`
- [ ] Validar que el modelo de precios (por cantidad de empleados) funciona igual en otros verticales
- [ ] Definir la estrategia de lanzamiento del segundo vertical

---

## Versión visual

Este checklist también existe como página interactiva (con casillas que se pueden marcar):
https://claude.ai/code/artifact/b9854ff9-4b34-469c-8adf-463133bc94b3
