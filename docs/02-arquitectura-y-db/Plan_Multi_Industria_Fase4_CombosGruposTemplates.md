# Multi-Industria — Fase 4: Combos, Citas Grupales y Templates por Vertical (Diseño, aprobado — no implementado)

> **Fecha:** 2026-07-24
> **Estado:** ✅ Diseño acordado con el usuario vía entrevista (ver sección 5) · 🔲 Sin implementar
> **Alcance:** tres necesidades de negocio reales identificadas por el usuario, que aplican a los 4
> verticales activos (barbería, salón, veterinaria, clínica): (1) que cada vertical tenga una experiencia
> de producto propia, no solo terminología; (2) combos de servicios (ej. corte + barba + tinte); (3)
> citas donde un cliente viene acompañado y ambos se atienden (ej. padre e hijo).

## 1. Templates por vertical (home, dashboard, citas)

**Decisión:** híbrido — mismo esqueleto de página para todos los tenants (mismo código, mismas rutas,
cero bifurcación), con una zona de **widgets destacados configurable** que cambia según industria/tenant.
Mismo principio que el motor de campos personalizados de la Fase 3: plantilla por defecto según
`industria`, editable por tenant, sin requerir deploy de código para un vertical nuevo.

### Diseño

- Nueva columna `barberias.config_widgets_destacados` (jsonb, default `[]`) — array de claves de widget
  y orden, ej. `["produccion_empleado", "combos_populares"]` para barbería,
  `["revisiones_proximas", "pacientes_activos"]` para veterinaria.
- Frontend: un `WIDGET_REGISTRY` (mapa clave → componente React) en `apps/web`. Las páginas de
  `dashboard`, `home`/landing del tenant, y (más adelante) `citas`/agenda renderizan su layout fijo de
  siempre + `config_widgets_destacados.map(key => WIDGET_REGISTRY[key])`.
- Plantilla por defecto según `industria`, aplicada igual que `config_campos_personalizados` (Fase 3): al
  crear un tenant desde SuperAdmin, se pre-rellena con el set sugerido para su industria; el tenant puede
  editarlo después.
- **Nota importante, ya resuelta por trabajo previo:** parte de "que la página de citas se vea distinta
  por vertical" (ej. mostrar columna "Paciente" en vez de columna extra en veterinaria) **no necesita
  este motor de widgets** — ya está disponible gracias a `useTenant()` (Fase 2-D, sabe la `industria` del
  tenant) + `citas.pacienteId` (Fase 3). Es una tarea de frontend chica (renderizado condicional), no un
  nuevo mecanismo de configuración.
- Los widgets concretos (`revisiones_proximas`, `combos_populares`, etc.) son features de producto a
  construir una por una — lo que se diseña y prioriza *ahora* es el motor de registro/configuración, no
  cada widget individual.

## 2. Combos de servicios

**Decisión:** *bundle rastreado* — el combo agrupa servicios existentes, se agenda como un bloque
continuo de tiempo, pero cada servicio interno se sigue contabilizando por separado para reportes y
comisión.

**Hallazgo clave al verificar el esquema real antes de diseñar** (no asumido): la tabla
`detalles_transaccion` **ya existe** (`schema.ts:236`) y ya soporta exactamente la itemización que
"bundle rastreado" necesita — `servicioId`, `precioUnitario`, `comisionAplicada` por línea. Esto significa
que la parte de *cobro y comisión por servicio dentro de un combo* **no requiere tabla nueva** — se
resuelve insertando una fila de `detalles_transaccion` por cada servicio del combo al momento de cobrar,
igual que ya se hace hoy para ventas de mostrador con productos múltiples.

### Diseño

```sql
CREATE TABLE combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES barberias(id),
  nombre VARCHAR(255) NOT NULL,
  precio_total DECIMAL(10,2) NOT NULL, -- puede ser menor a la suma individual (descuento por combo)
  duracion_ajustada_minutos INTEGER, -- NULL = usar la suma de duracionMinutos de sus servicios
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE combo_servicios (
  combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  servicio_id UUID NOT NULL REFERENCES servicios(id),
  orden INTEGER NOT NULL DEFAULT 0,
  precio_asignado DECIMAL(10,2) NOT NULL, -- porción del precio_total atribuida a este servicio,
                                            -- usada para poblar detalles_transaccion al cobrar
  PRIMARY KEY (combo_id, servicio_id)
);

-- citas: alternativa a servicioId cuando la cita es de un combo
ALTER TABLE citas ALTER COLUMN servicio_id DROP NOT NULL;
ALTER TABLE citas ADD COLUMN combo_id UUID REFERENCES combos(id);
-- Regla de aplicación (no constraint SQL, para no bloquear casos futuros): exactamente uno de
-- servicio_id / combo_id debe estar presente.
```

- Duración de la cita: si `comboId` está seteado, se usa `combos.duracionAjustadaMinutos` si existe, si
  no la suma de `duracionMinutos` de los servicios del combo — calculado en `citas.service.ts`, mismo
  lugar donde hoy se calcula `finEstimado` a partir de `servicio.duracionMinutos`.
- Al cobrar (`TransaccionesService`): si la cita tiene `comboId`, se inserta una fila de
  `detallesTransaccion` por cada `combo_servicios` (con `precioAsignado` y su comisión correspondiente)
  en vez de una sola línea genérica — reutiliza el mecanismo de comisión por servicio que ya existe hoy.
- **Explícitamente fuera de alcance de este diseño:** un combo donde distintas partes las atienden
  distintos empleados (ej. una persona hace el corte, otra el tinte). Se asume un solo `empleadoId` por
  cita de combo, igual que una cita normal — si aparece la necesidad real de dividir un combo entre
  empleados, es una iteración aparte.

## 3. Citas grupales (cliente + acompañante)

**Decisiones:**
- El manejo del acompañante **depende del vertical** — barbería/salón usan una nota simple (protege el
  flujo de reserva sin fricción, que es un objetivo de producto explícito desde
  `Checklist_Desarrollo_SaaS.md`); clínica/veterinaria usan un registro propio (`pacientes`, ya diseñado
  en la Fase 3), porque ahí el historial del acompañante sí importa clínicamente.
- El agendamiento soporta **ambos casos** desde el diseño: mismo empleado atendiendo en secuencia, o
  empleados distintos en simultáneo — sin bifurcar el motor de citas.

### Diseño

- **Barbería/salón:** cero cambio de esquema. La nota "trae a su hijo Juan" va en `citas.notas` (ya
  existe desde la Fase 1). Si el hijo también se atiende, es una **segunda `cita` independiente**
  (mismo mecanismo de abajo), no un campo extra en la primera.
- **Clínica/veterinaria:** el acompañante obtiene su propio `paciente` (Fase 3) y su propia `cita`
  (`pacienteId` distinto), vinculada por el agrupador de abajo.
- **Agrupador, para los dos casos:**
  ```sql
  ALTER TABLE citas ADD COLUMN grupo_reserva_id UUID;
  CREATE INDEX idx_citas_grupo_reserva ON citas (grupo_reserva_id) WHERE grupo_reserva_id IS NOT NULL;
  ```
  - `NULL` (default): cita individual, comportamiento actual, sin cambios.
  - Mismo valor en 2+ citas: se tratan como **una sola visita** para UX y cobro — se muestran agrupadas
    en la agenda del staff, y se cobran juntas en un solo checkout (una `transaccion` puede referenciar
    solo una `citaId` hoy — ver nota abajo).
  - El motor de agendamiento **no necesita cambios**: dos citas con el mismo `grupoReservaId` pero
    distinto `empleadoId` ya se agendan en simultáneo sin conflicto (son filas independientes); dos citas
    con el mismo `empleadoId` ya se agendan en secuencia sin solapar (el `EXCLUDE` constraint existente
    ya lo garantiza). El agrupador es puramente para presentación/cobro conjunto, no para la lógica de
    disponibilidad.
- **Nota de implementación pendiente de revisar:** `transacciones.citaId` hoy es una FK a **una** cita.
  Cobrar 2+ citas de un mismo `grupoReservaId` en una sola transacción requiere decidir entre (a) permitir
  `citaId` nulo y usar `detallesTransaccion` para vincular cada cita del grupo, o (b) generar N
  transacciones (una por cita) pero con un `grupoReservaId` compartido a nivel de transacción también,
  mostradas juntas en caja pero separadas en el libro contable. **No se resuelve en este documento** —
  es una decisión de Fase 5 (implementación), porque toca `transacciones`, una tabla fiscal donde ya
  existe la política explícita de no tocar sin revisión dedicada (ver `CLAUDE.md`).

## 4. Qué NO cambia (compatibilidad)

- Ninguna cita, combo o widget es obligatorio — todo lo nuevo es aditivo y nullable. Un tenant que nunca
  configura combos/widgets/citas grupales sigue funcionando exactamente igual que hoy.
- El flujo de reserva pública actual (un cliente, un servicio, un empleado) sigue siendo el camino por
  defecto — combos y citas grupales son *opciones* que el cliente elige, no un rediseño del flujo base.

## 5. Registro de la entrevista (Planificar, según `.agents/AGENTS.md`)

1. *¿Templates a medida, motor de widgets, o híbrido?* → "Híbrido: esqueleto común + widgets destacados".
2. *¿Combo atómico o bundle rastreado?* → "Bundle rastreado".
3. *¿Acompañante con registro propio o nota simple?* → "Depende del vertical".
4. *¿Citas grupales: secuencial, simultáneo, o ambos?* → "Ambos casos, desde el diseño".

## 6. Siguiente paso

Diseño aprobado, **no implementado**. Ver [`plan.md`](../plan.md), Fase 2 §2.2, para las tareas chicas
ejecutables. La decisión de `transacciones`/cobro grupal (sección 3, nota de implementación) debe
resolverse explícitamente con el usuario antes de tocar esa tabla, dado que es una tabla fiscal con
política de no-tocar-sin-revisión ya establecida.
