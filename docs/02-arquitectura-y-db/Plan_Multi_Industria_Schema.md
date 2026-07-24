# Multi-Industria — Fase 1: Esquema de Base de Datos

> **Fecha:** 2026-07-24
> **Estado:** ✅ Aplicado en el entorno local (Docker `barberos_postgres`)
> **Alcance:** Solo esquema de base de datos. Aditivo y no disruptivo — no rompe nada existente.

---

## 1. Objetivo

Preparar la base de datos para que el mismo motor (NestJS + Drizzle + PostgreSQL con RLS) pueda operar
para múltiples verticales de negocio (salones de belleza, spas, veterinarias, clínicas, talleres
mecánicos, alquiler de espacios), tal como ya lo anticipaban:

- [`01-vision-y-plan/Vision_Multi_Industria.md`](../01-vision-y-plan/Vision_Multi_Industria.md)
- [`01-vision-y-plan/IDEAS_FUTURAS_EXPANSION_Y_SOLO_PRENEUR.md`](../01-vision-y-plan/IDEAS_FUTURAS_EXPANSION_Y_SOLO_PRENEUR.md)

Ambos documentos concluyen que el motor ya es agnóstico en su lógica (un `Barbero` es un `Recurso`, un
`Corte` es un `Servicio` con duración y precio); lo único que faltaba era **terminología dinámica por
tenant** y un lugar para **datos estructurados específicos de cada industria**.

## 2. Decisión de alcance: solo aditivo, sin renombrar nada

El esquema real (`apps/api/src/database/schema/schema.ts`, 20 tablas) tiene identificadores acoplados al
vertical de barbería: `usuarios.rol` incluye el valor `'barbero'`, y las columnas `citas.barberoId`,
`horarios.barberoId`, `bloqueosTemporales.barberoId` y `clientes.barberoFrecuenteId` usan ese nombre
explícito. Un grep sobre el código confirma que renombrar esos identificadores tocaría **~32 archivos**
entre `apps/api/src` y `apps/web/src` (servicios, DTOs, componentes de UI, copy en español).

Por eso esta fase se limitó estrictamente a **agregar** columnas nuevas con valores por defecto seguros,
sin tocar ni una sola columna, tabla o enum existente. Cero riesgo para el código que ya funciona hoy. El
renombrado se documenta en la [sección 6](#6-fase-2--pendiente-no-ejecutado) como trabajo futuro
explícito, no bloqueante.

## 3. Qué se agregó

### 3.1 Nuevo enum `industria_negocio`

```sql
CREATE TYPE industria_negocio AS ENUM (
  'barberia', 'salon_belleza', 'spa_masajes', 'veterinaria',
  'clinica_medica', 'taller_mecanico', 'espacio_alquiler', 'otro'
);
```

### 3.2 Columnas nuevas en `barberias` (el tenant maestro)

| Columna | Tipo | Default | Propósito |
|---|---|---|---|
| `industria` | `industria_negocio` | `'barberia'` | Vertical de negocio del tenant. |
| `terminologia_empleado` | `varchar(100)` | `'Barbero'` | Label dinámico del recurso humano (ej. "Doctor", "Groomer", "Cancha"). |
| `terminologia_servicio` | `varchar(100)` | `'Servicio'` | Label dinámico del servicio/producto (ej. "Consulta", "Tratamiento"). |
| `terminologia_cliente` | `varchar(100)` | `'Cliente'` | Label dinámico del cliente final (ej. "Paciente", "Dueño de mascota"). |

Todas `NOT NULL DEFAULT`, así que los tenants existentes quedaron retro-poblados automáticamente sin
necesidad de un script de backfill aparte.

### 3.3 Columna nueva en `clientes`

| Columna | Tipo | Default | Propósito |
|---|---|---|---|
| `datos_adicionales` | `jsonb` | `'{}'` | Atributos estructurados propios de cada vertical (ej. `{"nombre_mascota": "Rocky", "raza": "Labrador"}` en veterinarias, alergias en clínicas) sin normalizar una tabla nueva por industria. |

### 3.4 Columna nueva en `citas`

| Columna | Tipo | Default | Propósito |
|---|---|---|---|
| `notas` | `text` | `NULL` | Nota **por visita** (ej. evolución clínica, detalle del corte del día). Distinta de `clientes.notas_preferencia`, que vive a nivel de perfil del cliente, no de una cita puntual. |

## 4. Cómo se aplicó

Migración escrita a mano en
[`apps/api/src/database/migrations/0010_multi_industria_schema.sql`](../../apps/api/src/database/migrations/0010_multi_industria_schema.sql),
siguiendo el mismo patrón idempotente (`DO $$ ... IF NOT EXISTS ... $$` + `ADD COLUMN IF NOT EXISTS`) que
ya usa este repo en migraciones como `0006_import_export.sql`.

**Por qué no `drizzle-kit generate`/`push`:** el archivo `apps/api/src/database/migrations/meta/_journal.json`
solo tiene 4 entradas registradas, pero el esquema real tiene 20 tablas y hay 13 archivos de migración
manual en el directorio. El historial de snapshots de Drizzle está desincronizado de la realidad (la
mayoría de la evolución del esquema se hizo con SQL manual + posiblemente `drizzle-kit push` sin generar
snapshot). Correr `generate` o `push` hoy intentaría reconciliar *todo* ese drift acumulado, no solo este
cambio — mucho más riesgo que aplicar un `ALTER TABLE` quirúrgico.

Aplicado directamente contra el Postgres local de Docker (contenedor `barberos_postgres`, ya en ejecución):

```bash
docker exec -i barberos_postgres psql -U postgres -d barberos -f - \
  < apps/api/src/database/migrations/0010_multi_industria_schema.sql
```

No se necesitó ningún `GRANT` nuevo: `barberias`, `clientes` y `citas` no son tablas append-only (a
diferencia de `transacciones`/`audit_logs`) y ya tenían privilegios completos para el rol `app_user` desde
el bootstrap inicial.

## 5. Verificación realizada

1. **Estructura de columnas** — confirmado con `\d barberias`, `\d clientes`, `\d citas` en psql: las 6
   columnas nuevas aparecen con el tipo y default correctos.
2. **Backfill de tenants existentes** — los 3 tenants locales quedaron poblados por defecto:

   ```
            slug          | industria | terminologia_empleado | terminologia_servicio | terminologia_cliente
   ----------------------+-----------+-----------------------+-----------------------+----------------------
    barber-a-real-panama | barberia  | Barbero               | Servicio              | Cliente
    barberiajose         | barberia  | Barbero               | Servicio              | Cliente
    estilo-solo-carlos   | barberia  | Barbero               | Servicio              | Cliente
   ```

3. **Compilación** — `cd apps/api && npx tsc --noEmit` termina sin errores: el cambio en `schema.ts` es
   un no-op para todo el código de servicios existente (nada lo referencia todavía).

## 6. Fase 2 — Estado

Ver [Multi-Industria — Fase 2: Rename `barbero` → `empleado`](./Plan_Multi_Industria_Fase2_Rename.md)
para el detalle completo. Resumen de lo que pasó con cada ítem listado originalmente aquí:

- ✅ **Renombrar identificadores acoplados a barbería** (`usuarios.rol`, `barberoId`/
  `barberoFrecuenteId` en `citas`/`horarios`/`bloqueosTemporales`/`clientes`) — hecho, 51 archivos.
- ✅ **Renombrar `planes.limiteBarberos`** — hecho, junto con el rename general.
- ✅ **Exponer `industria`/`terminologia_*` en la creación de tenants del SuperAdmin** — hecho
  (`CreateTenantDto`, `crearTenantManual`, `CrearBarberiaModal.tsx` con selector de industria).
- 🔲 **Frontend: terminología dinámica real** (leer `tenant.terminologiaEmpleado`/`Servicio`/`Cliente`
  desde el backend en vez de copy estático genérico) — sigue pendiente, requiere construir desde cero el
  mecanismo de propagación de tenant (hoy no existe ninguno real, `getTenantConfig()` está mockeado).
  Documentado como Fase 2-D en el doc de Fase 2.
- 🔲 **Posible rename físico** de la tabla `barberias` a un nombre neutral (`negocios`/`tenants`) —
  sigue diferido, no bloqueante.
- 🔲 **`transacciones.comisionBarbero`/`propinaBarbero`** — excluido a propósito del rename por ser
  columnas de un libro contable append-only (fiscal/DGI); requiere revisión dedicada aparte.

## 7. Ejemplo: cómo se vería un tenant de otro vertical

Sin tocar ni una línea de código de negocio, hoy ya es posible declarar un tenant de otra industria a
nivel de datos (aunque el frontend seguirá mostrando copy de barbería hasta que se ejecute la Fase 2):

```sql
UPDATE barberias
SET industria = 'veterinaria',
    terminologia_empleado = 'Veterinario',
    terminologia_servicio = 'Consulta',
    terminologia_cliente = 'Dueño de mascota'
WHERE slug = 'veterinaria-peludos';

UPDATE clientes
SET datos_adicionales = '{"nombre_mascota": "Rocky", "raza": "Labrador"}'::jsonb
WHERE tenant_id = (SELECT id FROM barberias WHERE slug = 'veterinaria-peludos');
```
