# Multi-Industria — Fase 2: Rename `barbero` → `empleado`

> **Fecha:** 2026-07-24
> **Estado:** ✅ Aplicado (backend + DB local + frontend + SuperAdmin)
> **Alcance:** Rename completo de identificadores acoplados al vertical de barbería, más la
> conexión inicial de `industria`/`terminologia_*` (agregadas en
> [Fase 1](./Plan_Multi_Industria_Schema.md)) al flujo de creación de tenants del SuperAdmin.

---

## 1. Objetivo y alcance

El usuario pidió explícitamente el rename completo (no solo conectar terminología dinámica). Esta fase
renombra `barbero` → `empleado` en toda la base de código (backend, base de datos y frontend), y expone
las columnas de industria/terminología agregadas en la Fase 1 en el flujo de onboarding del SuperAdmin.

**51 archivos modificados** (26 en `apps/api/src`, 25 en `apps/web/src`, 1 renombrado:
`InviteBarberoModal.tsx` → `InviteEmpleadoModal.tsx`), ejecutado en tres milestones guiados por el
compilador (`tsc --noEmit` como red de seguridad, no "grep and pray").

## 2. Qué se renombró

| Elemento | Antes | Después |
|---|---|---|
| Valor de `usuarios.rol` | `'barbero'` | `'empleado'` |
| Valor de `origen_bloqueo` | `'barbero'` | `'empleado'` |
| Columna `citas` | `barbero_id` | `empleado_id` |
| Columna `horarios` | `barbero_id` | `empleado_id` |
| Columna `bloqueos_temporales` | `barbero_id` | `empleado_id` |
| Columna `clientes` | `barbero_frecuente_id` | `empleado_frecuente_id` |
| Columna `planes` | `limite_barberos` | `limite_empleados` |
| Constraint EXCLUDE (`citas`) | `no_solapamiento_barbero` | `no_solapamiento_empleado` |
| 4 constraints FK | `*_barbero_id_usuarios_id_fk` | `*_empleado_id_usuarios_id_fk` |
| Índice (nunca materializado, se creó directo con el nombre nuevo) | `idx_citas_tenant_barbero_inicio` | `idx_citas_tenant_empleado_inicio` |
| Función `SECURITY DEFINER` | `get_all_tenants_summary()` → `total_barberos` | mismo nombre, columna `total_empleados` |
| Rutas HTTP (`horarios.controller.ts` / `HorariosModal.tsx`) | `/horarios/barbero/:barberoId` | `/horarios/empleado/:empleadoId` |
| Componente + archivo | `InviteBarberoModal.tsx` | `InviteEmpleadoModal.tsx` |
| Identificadores TS (`barberoId`, `barberoFrecuenteId`, `barberoNombre`, tipo `Barbero`, `RendimientoBarbero`, etc.) | — | equivalentes en `empleado*` |
| Copy en español | "Barbero", "Elige a tu barbero" | "Empleado", "Elige a tu empleado" |
| Nombres comerciales sembrados en `planes` | "Plan Básico (Hasta 3 Barberos)" | "Plan Básico (Hasta 3 Empleados)" |

## 3. Qué NO se renombró (excluido a propósito)

1. **`transacciones.comision_barbero` / `transacciones.propina_barbero`** (y sus DTOs/exports CSV
   `Comision_Barbero`/`Propina_Barbero`): son columnas de una tabla *append-only* usada para reportes
   fiscales (DGI). Renombrar un libro contable amerita su propia revisión dedicada, no un rename
   mecánico junto con todo lo demás.
2. **La tabla `barberias`** y el enum `estado_barberia`: son sobre el *negocio* (tenant), no sobre el
   *rol de staff*. Ya estaba excluido desde la Fase 1.
3. **Terminología dinámica real en el frontend** (Fase 2-D, no ejecutada): hoy el copy quedó en genérico
   ("Empleado"/"Servicio"), no dinámico por tenant. Ver sección 5.
4. **Route/directorio `/admin/barberos`** y nombres de archivo `BarberProfileCard.tsx`/
   `BarberSelection.tsx`: cosmético, bajo impacto para el usuario final, se dejó fuera para controlar el
   radio de impacto. `InviteBarberoModal.tsx` sí se renombró porque era el ejemplo explícito del plan.

## 4. Cómo se ejecutó

**Milestone A — Backend:** edité `schema.ts` a mano (columnas, enums, relations), corrí
`npx tsc --noEmit` para obtener la lista exacta de archivos rotos (el tipo `Rol` en
`common/decorators/roles.decorator.ts` se deriva de `rolUsuarioEnum.enumValues`, así que cualquier
`@Roles('barbero', ...)` se marcaba solo), apliqué `sed` con límites de palabra (`\bbarberoId\b`, etc.)
para las ~140 ocurrencias mecánicas, y corregí a mano los casos camelCase-embebidos que el `\b` no
alcanza (`rendimientoBarberosMap`, `staffBarberos`, `comisionBarberoTotal`, etc.). Repetí `tsc` hasta
cero errores.

**Migración `0011_rename_empleado.sql`:** aplicada directo a `barberos_postgres` vía `psql`. Un detalle
real encontrado en la aplicación: `CREATE OR REPLACE FUNCTION get_all_tenants_summary()` falló con
`cannot change return type of existing function` porque le cambié el nombre a una columna de salida —
Postgres exige `DROP FUNCTION` primero cuando cambia el tipo de fila devuelto. Se corrigió en el archivo
y se reaplicó.

**Milestone B — Frontend:** mismo patrón (`sed` + `tsc --noEmit` + fixes manuales), ejecutado
inmediatamente después del backend para no dejar el contrato de rutas HTTP a medio migrar (el frontend
llama `/horarios/empleado/:id`, que ya existía renombrado en el backend).

**Milestone C — SuperAdmin:** agregué `industria`/`terminologiaEmpleado`/`terminologiaServicio`/
`terminologiaCliente` como campos opcionales en `CreateTenantDto` y en el insert de
`crearTenantManual()`; en el frontend, `CrearBarberiaModal.tsx` ahora tiene un selector de industria que
pre-rellena (editable) los 3 campos de terminología con defaults razonables por vertical (ej. veterinaria
→ "Veterinario"/"Consulta"/"Dueño de mascota").

## 5. Explícitamente diferido: Fase 2-D (terminología dinámica real)

Hoy `apps/web/src/app/[tenantSlug]/layout.tsx` usa un `getTenantConfig()` **mockeado** — un solo tenant
hardcodeado (`'barberia-carlos'`), sin llamada real al backend — y el objeto `tenant` resultante ni
siquiera se propaga a los hijos (solo su color vía CSS var, no vía Context/store). Conectar
`terminologiaEmpleado/Servicio/Cliente` de verdad para que un tenant de veterinaria vea "Veterinario" en
vez de "Empleado" requiere:

- Un endpoint público (nuevo o reutilizado) para resolver el tenant completo por `slug`.
- Un mecanismo de propagación nuevo (React Context o un store tipo `adminStore.ts`) — hoy no existe
  ninguno; `reservar/layout.tsx` y `admin/layout.tsx` ni siquiera reciben el `tenant` de su padre, cada
  uno re-deriva lo que necesita por su cuenta.

Es una feature del tamaño de esta misma fase — queda para una sesión dedicada aparte, no mezclada con el
rename.

## 6. Consecuencia aceptada

Renombrar el valor del enum `rol_usuario` invalidó el claim `rol` de cualquier JWT ya emitido con el
valor viejo `"barbero"`. Cualquier sesión de staff que estuviera logueada en el navegador local necesita
volver a iniciar sesión. Entorno de desarrollo local con datos de prueba (3 tenants) — aceptable, sin
lógica de compatibilidad dual.

## 7. Verificación realizada

- `cd apps/api && npx tsc --noEmit` → limpio.
- `cd apps/web && npx tsc --noEmit` → limpio.
- Migración verificada por psql: `enum_range` de `rol_usuario`/`origen_bloqueo`, estructura de `citas`/
  `horarios`/`bloqueos_temporales`/`clientes`/`planes`, y `SELECT * FROM get_all_tenants_summary()`
  devolviendo `total_empleados` correctamente para los 3 tenants existentes.
- `git diff` completo revisado a ojo — confirmado que "Barbería"/"BarberOS" (negocio/marca) y
  `comisionBarbero`/`propinaBarbero` (fiscal, excluidos) no fueron tocados.
- **Smoke test real** (API + web levantados con Docker Postgres/Redis ya corriendo):
  - `GET /servicios/publico/barberiajose` y `GET /auth/staff/barberiajose` → 200, el segundo devuelve
    `"rol":"empleado"` para el staff.
  - Página pública `/barberiajose/reservar` renderiza `"2. Elige a tu empleado"` correctamente.
  - `POST /citas/publica` con `empleadoId` real → **201 Created**, respuesta incluye `empleadoId`
    correctamente (constraint `no_solapamiento_empleado` y RLS no bloquearon el insert). Registro de
    prueba eliminado después.
  - El click-through completo en el navegador no pudo verificarse (el pane de este entorno no
    compositó frames — limitación de la herramienta, no del código); se compensó con la verificación
    HTTP end-to-end de arriba, que ejercita la misma ruta que usaría el frontend.
