# Diseño del Esquema de Datos — Panorama Relacional

> **Corregido 2026-07-24.** La versión anterior de este documento documentaba 12 tablas campo por campo;
> el esquema real tiene **19 tablas** (verificado contando `pgTable(...)` en `schema.ts`, no adivinado).
> Mantener un diccionario de campos duplicado en Markdown se desincroniza solo con el tiempo — ya pasó una
> vez. Por eso este documento ahora es un **mapa de relaciones y propósito por tabla**, no un diccionario
> de columnas. **La fuente de verdad para columnas, tipos y constraints exactos es siempre**
> [`apps/api/src/database/schema/schema.ts`](../../apps/api/src/database/schema/schema.ts) — para
> inspeccionar el estado real de una tabla en vivo, `\d nombre_tabla` en `psql` (ver `CLAUDE.md`, algunos
> índices/constraints declarados en Drizzle nunca se materializaron en la base real).

## Principios que no cambian

- **RLS obligatorio**: toda tabla con `tenant_id` tiene una policy `tenant_id = current_tenant_id()`
  (`migrations/0001_rls_policies.sql`). Ver "Multi-tenancy via Postgres RLS" en `CLAUDE.md`.
- **UUID v4** en todas las llaves primarias (previene IDOR).
- **Timestamptz** en todas las fechas.
- **Append-only**: `transacciones` y `audit_logs` no permiten `UPDATE`/`DELETE` global — solo `INSERT`,
  con `UPDATE` de columnas específicas permitido en `transacciones` para trazabilidad de pago
  (`yappyOrderId`, `estadoDgi`, etc.). Correcciones de monto van como nueva inserción, nunca editando la
  fila original.

## Mapa de relaciones

```
planes ──┐
         ├──── barberias (tenant)
         │         │
         │         ├──── usuarios (empleados, admins) ──── horarios (disponibilidad)
         │         │
         │         ├──── servicios (catálogo)
         │         │
         │         ├──── productos (retail)
         │         │
         │         ├──── clientes (CRM)
         │         │         │
         │         ├──── citas ──┼── → cliente_id (nullable, walk-ins)
         │         │             ├── → empleado_id
         │         │             ├── → servicio_id
         │         │             └──── transacciones (append-only)
         │         │                        └──── detalles_transaccion (líneas itemizadas)
         │         │
         │         ├──── bloqueos_temporales (locks: almuerzos, walk-ins, reservas en proceso)
         │         ├──── whatsapp_config / yappy_config (integraciones por tenant)
         │         ├──── plantillas_whatsapp (mensajes personalizables)
         │         ├──── cierres_de_caja (arqueo ciego diario)
         │         ├──── trabajos_importacion (CSV/Excel async)
         │         └──── audit_logs (append-only)
         │
         └──── (fuera de RLS, plataforma) plataforma_admins, alertas_seguridad
```

## Las 19 tablas, por propósito

| # | Tabla | Propósito | Notas |
|---|---|---|---|
| 1 | `planes` | Catálogo de planes de suscripción (límites de empleados, precio) | Fuente relacional de verdad; `barberias.planSuscripcion` se mantiene sincronizado |
| 2 | `barberias` | Tenant maestro | Incluye `industria` + `terminologia_*` (multi-industria, Fase 1) — ver `Plan_Multi_Industria_Schema.md` |
| 3 | `usuarios` | Staff: empleados y admins | Rol derivado del enum (`admin`/`empleado`/`recepcion`), login dual (password vs PIN) |
| 4 | `servicios` | Catálogo del local | Duración + precio, motor genérico de bloques de tiempo |
| 5 | `productos` | Inventario retail | Stock atómico, descontado en venta de mostrador |
| 6 | `clientes` | CRM | `datosAdicionales` (jsonb, multi-industria), `ausenciasStrikes`, `bloqueado` |
| 7 | `citas` | Núcleo operativo | `notas` (multi-industria, Fase 1), idempotency key, tokens de gestión |
| 8 | `transacciones` | Finanzas + DGI | **Append-only.** `comisionBarbero`/`propinaBarbero` deliberadamente sin renombrar (ver `CLAUDE.md`) |
| 9 | `detalles_transaccion` | Líneas de venta itemizadas | Comisión y precio por servicio/producto individual dentro de una transacción |
| 10 | `horarios` | Disponibilidad base por empleado | Reglas fijas; los ajustes puntuales van en `bloqueos_temporales` |
| 11 | `bloqueos_temporales` | Locks dinámicos de agenda | Almuerzos, walk-ins, locks de reserva optimista (3 min) |
| 12 | `audit_logs` | Trazabilidad inmutable | **Append-only.** Acciones sensibles: cierre con descuadre, reseteo de password, kill-switch |
| 13 | `whatsapp_config` | Instancia Evolution API por tenant | Heartbeat de conexión, QR de re-vinculación |
| 14 | `cierres_de_caja` | Arqueo ciego diario | Declarado vs esperado, genera `cuadrado`/`sobrante`/`faltante` |
| 15 | `plantillas_whatsapp` | Mensajes del bot personalizables | Editable por admin sin tocar código |
| 16 | `yappy_config` | Credenciales Yappy por tenant | Merchant ID, llaves de firma del webhook |
| 17 | `trabajos_importacion` | Estado de imports CSV/Excel async | Filas creadas/actualizadas/rechazadas por job |
| 18 | `plataforma_admins` | Cuentas de SuperAdmin | **Fuera de RLS** (tabla de plataforma, no de tenant) — 2FA TOTP obligatorio |
| 19 | `alertas_seguridad` | Alertas de la consola SuperAdmin | Logins fallidos, canario de RLS, churn de tenants — **fuera de RLS** |

## Documentos de diseño relacionados (esquema propuesto, no implementado aún)

- [`Plan_Multi_Industria_Fase3_DatosPorVertical.md`](./Plan_Multi_Industria_Fase3_DatosPorVertical.md) —
  nuevas tablas `pacientes` y `notas_clinicas`.
- [`Plan_Multi_Industria_Fase4_CombosGruposTemplates.md`](./Plan_Multi_Industria_Fase4_CombosGruposTemplates.md) —
  nuevas tablas `combos` y `combo_servicios`, columnas `citas.comboId`/`grupoReservaId`.
- [`Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md`](./Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md) —
  nueva tabla `inasistencias`, columnas `citas.confirmada`/`confirmacionSolicitadaEn`.

Todas estas siguen la misma convención: aditivas, sin romper nada existente, migradas a mano (nunca
`drizzle-kit`, ver `CLAUDE.md`).
