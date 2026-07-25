# Multi-Industria — Fase 3: Modelo de Datos por Vertical

> **Fecha diseño:** 2026-07-24 · **Fecha implementación:** 2026-07-25
> **Estado:** ✅ Implementado y verificado (ver sección 8) — diseño acordado con el usuario vía entrevista
> (sección 6), ejecutado como Fase 2.1 de [`plan.md`](../plan.md)
> **Alcance:** resolver el gap identificado en `Checklist_Multi_Industria_y_Produccion.md` Fase 3 —
> hoy la terminología es dinámica pero `clientes.datos_adicionales`/`citas.notas` no tienen wiring real,
> y un campo JSONB plano no alcanza para el caso real de veterinaria (múltiples mascotas por cliente) ni
> para clínica (historial clínico consultable). Este documento fija el modelo de datos antes de tocar
> código, siguiendo el flujo Planificar → Ejecutar → Verificar de `.agents/AGENTS.md`.

## 1. El problema que motiva este diseño

Barbería y salón de belleza comparten un modelo simple: el *sujeto del servicio* es el mismo *cliente*
que paga. Veterinaria y clínica médica no — un cliente puede tener varias mascotas/pacientes, cada uno
con su propio historial, y cada cita es de *uno* de ellos, no del cliente en general. Meter esto en
`clientes.datos_adicionales` (un JSONB plano por cliente) rompe en cuanto el primer cliente real de
veterinaria tenga 2+ mascotas. Se decidió modelar esto correctamente ahora en vez de parchear después.

## 2. Decisiones (resultado de la entrevista, ver sección 6)

| Decisión | Elegido |
|---|---|
| ¿Sujeto de servicio propio (mascota/paciente) por cliente? | **Sí, modelarlo desde ahora** — tabla `pacientes` |
| ¿Historial clínico estructurado o texto libre? | **Estructurado** — tabla `notas_clinicas`, no solo `citas.notas` |
| ¿Quién ve el contenido del historial clínico? | **Solo el profesional que atendió** (`empleado_id` de la nota) |
| ¿El admin del tenant ve algo? | **Metadatos sí** (que existe, cuándo, quién la escribió) — **contenido clínico no** |
| ¿Campos específicos de vertical (raza, peso, alergias) vía código o config? | **Motor genérico de campos personalizados por tenant** (JSON schema), no hardcodeado por industria |

## 3. Modelo de datos propuesto

### 3.1 Nueva tabla `pacientes` — el "sujeto del servicio", opcional

```sql
CREATE TABLE pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES barberias(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  nombre VARCHAR(255) NOT NULL,
  campos_personalizados JSONB NOT NULL DEFAULT '{}',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: mismo patrón que el resto de tablas de tenant (policy sobre tenant_id = current_tenant_id()).
```

- **Barbería / salón de belleza: no la usan.** El cliente sigue siendo el sujeto, exactamente como hoy —
  cero cambio de comportamiento, cero migración de dato existente.
- **Veterinaria:** un `paciente` = una mascota. Un cliente puede tener N.
- **Clínica médica:** un `paciente` = la persona atendida (normalmente el mismo cliente que agenda, pero
  modelado igual para reusar `notas_clinicas` sin bifurcar el esquema por vertical).

### 3.2 `citas.paciente_id` — nueva columna, nullable

```sql
ALTER TABLE citas ADD COLUMN paciente_id UUID REFERENCES pacientes(id);
```

Nula siempre para barbería/salón. Requerida (a nivel de aplicación, no de constraint SQL — para no
romper el flujo de creación de citas existente) cuando el tenant tiene `industria` de veterinaria o
clínica.

### 3.3 Nueva tabla `notas_clinicas` — historial estructurado

```sql
CREATE TABLE notas_clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES barberias(id),
  cita_id UUID NOT NULL REFERENCES citas(id),
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  empleado_id UUID NOT NULL REFERENCES usuarios(id), -- autor / profesional responsable
  diagnostico TEXT,
  tratamiento TEXT,
  proxima_revision_en DATE, -- ej. próxima vacuna, próximo control
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: tenant_id = current_tenant_id(), igual que el resto — la confidencialidad
-- por profesional NO se hace a nivel de RLS (ver sección 4).
```

Distinta de `citas.notas` (columna ya existente desde la Fase 1), que **se mantiene** como nota operativa
libre y genérica para cualquier vertical (ej. "cliente llegó 10 min tarde") — no clínica, no confidencial.

### 3.4 Motor de campos personalizados

`campos_personalizados` (JSONB) ya aparece en `pacientes` (arriba) y ya existe en `clientes` desde la
Fase 1 (`datos_adicionales`). Lo que falta es la **configuración** que le da forma a ese JSONB — nueva
columna en `barberias`:

```sql
ALTER TABLE barberias ADD COLUMN config_campos_personalizados JSONB NOT NULL DEFAULT '[]';
```

Forma del contenido (ejemplo para un tenant de veterinaria):
```json
[
  { "entidad": "paciente", "clave": "especie", "etiqueta": "Especie", "tipo": "texto", "requerido": true },
  { "entidad": "paciente", "clave": "raza", "etiqueta": "Raza", "tipo": "texto", "requerido": false },
  { "entidad": "paciente", "clave": "peso_kg", "etiqueta": "Peso (kg)", "tipo": "numero", "requerido": false },
  { "entidad": "paciente", "clave": "alergias", "etiqueta": "Alergias conocidas", "tipo": "texto", "requerido": false }
]
```

- Al crear un tenant nuevo desde SuperAdmin, se pre-rellena `config_campos_personalizados` con una
  plantilla por defecto según la `industria` elegida (veterinaria, clínica, etc. — barbería/salón quedan
  con `[]`, no la necesitan). El tenant puede editar/agregar/quitar campos después — la plantilla es un
  punto de partida, no una restricción.
- **Agregar un 5to vertical el año que viene = agregar una plantilla de config nueva, sin tocar código
  ni hacer una migración de esquema.** Esto es lo que cumple el requisito de "que no afecte la
  escalabilidad".
- Fuera de esta config: `diagnostico`/`tratamiento`/`proxima_revision_en` de `notas_clinicas` **no** son
  campos personalizados — son columnas reales, porque necesitan ser consultables/reportables (ej. "listar
  pacientes con próxima revisión vencida"), algo que JSONB no hace bien a escala. El motor de campos
  personalizados es deliberadamente solo para lo cosmético/variable, no para lo que necesita reportes.

## 4. Confidencialidad del historial clínico — implementación

**No se implementa como una policy RLS nueva.** El patrón ya existente en el codebase para "un empleado
solo ve lo suyo" es un filtro a nivel de aplicación, no de base de datos —
`citas.service.ts:obtenerCitasAgenda` ya hace exactamente esto:
```ts
if (user.rol === 'empleado') {
  conditions.push(eq(citas.empleadoId, user.userId));
}
```
`notas_clinicas.service.ts` (nuevo) sigue el mismo patrón, con dos métodos en vez de uno:
- `findFullByCita()` — devuelve `diagnostico`/`tratamiento` completos, **solo si**
  `notaClinica.empleadoId === user.userId`. Cualquier otro empleado/recepción → `ForbiddenException`.
- `findMetadataByCita()` — para admin: devuelve `{ existe: true, fecha, empleadoNombre, citaId }`, nunca
  `diagnostico`/`tratamiento`. Es la vista que consume, por ejemplo, un reporte administrativo o una
  pantalla de auditoría.

Se eligió este enfoque (sobre una policy RLS por `empleado_id`) porque: (a) es consistente con el patrón
ya establecido en el codebase, (b) evita tener que propagar `app.current_user_id` al `TenantInterceptor`
(hoy solo propaga `app.current_tenant_id`) — un cambio de infraestructura RLS más grande y con más
superficie de riesgo que un filtro de servicio, y (c) la distinción "admin ve metadata pero no contenido"
es una distinción *a nivel de columna*, no de fila — RLS de Postgres filtra filas, no columnas, así que
de todas formas habría necesitado lógica de aplicación para ese caso.

**Trade-off aceptado:** esta confidencialidad depende de que todo acceso a `notas_clinicas` pase por el
servicio (nunca una query cruda desde otro módulo). Es el mismo trade-off que ya existe hoy para el
filtro de `citas` por empleado — no es un patrón nuevo para el codebase.

## 5. Qué NO cambia (compatibilidad)

- Barbería y salón de belleza: cero cambios de comportamiento. `pacientes`/`notas_clinicas` quedan sin
  filas para esos tenants.
- `clientes.datos_adicionales` y `citas.notas` (Fase 1): se mantienen, con su propósito original
  (cliente-nivel genérico / nota operativa por cita) — no se reemplazan por lo nuevo, se complementan.
- Ninguna tabla ni columna existente se renombra ni se borra.

## 6. Registro de la entrevista (Planificar, según `.agents/AGENTS.md`)

Preguntas hechas al usuario y respuestas, en orden:

1. *¿Multi-mascota por cliente?* → "Sí, diseñar el modelo desde ahora".
2. *¿Historial estructurado o texto libre?* → "Estructurado desde ahora".
3. *¿Quién ve el historial clínico?* → "Solo el profesional asignado".
4. *¿Motor de campos personalizados genérico o campos fijos por vertical?* → "Motor genérico desde ahora".
5. *(Follow-up) ¿El admin ve algo del historial clínico?* → "Admin ve que existe la nota, no el
   contenido clínico".

## 7. Siguiente paso

Ver [`plan.md`](../plan.md), §2.1, para el desglose ejecutado en tareas chicas (schema.ts, migración SQL,
servicio de NestJS, UI de captura) — todas completas, ver sección 8.

## 8. Implementación (2026-07-25) — qué coincide con el diseño y qué se desvió

El modelo de datos (§3), el motor de campos personalizados (§3.4) y el flujo de confidencialidad de
`findFullByCita()` (§4) se implementaron exactamente como se diseñaron. Dos diferencias respecto a este
documento, ambas deliberadas y descubiertas durante la ejecución:

- **`findMetadataByCita()` → `findMetadataByPaciente()`.** El diseño original (§4) proponía una consulta
  de metadata por cita individual. Al construir la UI de admin (historial dentro de la ficha de cliente)
  resultó más útil agregar por `pacienteId`: el admin ve de una vez todas las notas de "Firulais", no
  cita por cita. La garantía de confidencialidad no cambia — sigue devolviendo únicamente
  `id/citaId/empleadoId/empleadoNombre/proximaRevisionEn/createdAt`, nunca `diagnostico`/`tratamiento`.
- **Gap no anticipado: `QuickWalkInModal.tsx`.** El diseño no mencionaba que el panel de admin tiene un
  segundo camino de creación de citas (walk-in / manual, usado por recepción) además del portal público
  de reserva. Sin selector de paciente ahí, una cita creada por recepción para una veterinaria quedaba
  sin `pacienteId` y por lo tanto sin poder capturar nota clínica al cobrar. Se agregó búsqueda de
  cliente/pacientes existentes por teléfono (`onBlur`) + `<select>` condicional, con el mismo criterio de
  "solo visible si la industria del tenant lo requiere" que el resto del wiring.

Verificación end-to-end (navegador real, no solo `curl`): tenant `qa-test` conmutado a
`industria='veterinaria'`, cliente creado, paciente "Firulais" registrado con sus campos dinámicos
(especie/raza/peso), cita creada desde `QuickWalkInModal` con `pacienteId` enlazado, cobro con nota
clínica capturada — confirmado en Postgres real. Seguridad verificada con requests directos autenticados:
el autor de la nota recibe 200 en `findFullByCita`; un segundo empleado autenticado (no autor) recibe 403
con el mensaje "Solo el profesional que atendió esta cita puede ver el contenido clínico."; un empleado
sin rol admin recibe 403 en el endpoint de metadata (`@Roles('admin')`); el admin recibe 200 con solo los
campos no clínicos.

De paso se encontró y corrigió un bug preexistente en `QuickWalkInModal.tsx`: la búsqueda de cliente
existente construía `` `/clientes?q=${telefono}` `` sin `encodeURIComponent`. Un teléfono con `+`
(formato usado en toda la app, ej. `+50761112222`) se decodifica como espacio en el query string del lado
del servidor (convención `application/x-www-form-urlencoded` que aplica el parser de Express incluso a
querystrings de `GET`), así que la búsqueda fallaba en silencio y nunca encontraba al cliente. Corregido
en los 2 sitios del archivo con el mismo patrón.
