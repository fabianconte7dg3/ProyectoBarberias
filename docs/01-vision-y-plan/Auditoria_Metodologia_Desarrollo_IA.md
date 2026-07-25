# Auditoría: Metodología de Desarrollo Asistido por IA

> **Fecha:** 2026-07-24
> **Qué es esto:** el usuario definió un marco de trabajo de 3 pasos (Planificar → Contexto real →
> Verificar) más una lista de anti-patrones para el desarrollo asistido por IA en este proyecto, y pidió
> auditar si `ProyectoBarberias` lo cumple. Este documento es el resultado de esa auditoría: qué se
> cumple, qué no, con evidencia concreta (no impresiones), y qué falta. **No se hicieron cambios de
> código a partir de esta auditoría** — es un diagnóstico para decidir a propósito, no una ejecución
> automática.

## Resumen de cumplimiento

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1a | Interview-first (la IA entrevista antes de programar) | 🟡 Parcial | Se usa el modo plan de Claude Code puntualmente, pero no es una regla documentada/exigida del repo |
| 1b | `spec.md` compilando especificación, casos límite, arquitectura, tests | 🔴 No existe | Ningún archivo `spec.md` en el repo (verificado con `find`) |
| 1c | `plan.md` con tareas chicas tachables | 🔴 No existe como archivo del repo | Existen checklists de producto (ver abajo) pero no un `plan.md` de tareas de implementación |
| 2 | Contexto real vía MCP (tools/resources/prompts conectados al proyecto) | 🔴 No configurado | No hay `.mcp.json` ni servidor MCP propio del proyecto — `.claude/` solo tiene `launch.json` y `settings.local.json` |
| 3a | VCS como puntos de guardado | 🟢 Cumple | 105 commits, historial limpio, sin force-push destructivo |
| 3b | Commits pequeños | 🟡 Parcial | La mayoría son pequeños (1-4 archivos), pero hay 2 commits masivos de ~60-79 archivos (renames mecánicos) |
| 3c | Revisión por un segundo modelo | 🔴 No se usa | Existe la herramienta (`/code-review ultra`) pero no hay evidencia de uso ni está documentada como paso obligatorio |
| Anti | Emojis en commits | 🟢 Cumple | 0 commits con emoji en 105 (`git log` + regex de rango Unicode) |
| Anti | Tests unitarios reales | 🔴 No cumple | Los 13 `*.spec.ts` + el único `*.e2e-spec.ts` son 100% boilerplate sin tocar de `nest new` (`"Hello World!"`) — **ya coincide** con lo señalado en `Checklist_Multi_Industria_y_Produccion.md`, Fase 4 |
| Anti | Deuda técnica: `node_modules` en git | 🔴 No cumple (grave) | 47.282 de 47.890 archivos trackeados (98.7%) son `node_modules`; ya estaba señalado en el checklist previo pero sin cuantificar la causa raíz |
| Anti | Secretos/credenciales en git | 🟡 Hallazgo nuevo | `apps/api/.env` está trackeado (contiene `DATABASE_URL`, `REDIS_HOST/PORT` de dev local) |
| Anti | Código basura / nombres genéricos | 🟢 Sin evidencia de violación | Spot-check de patrones típicos (`foo`, `temp2`, `data2`, etc.) sin resultados |
| Anti | Comentarios que no explican nada | 🟢 Sin evidencia de violación | Spot-check de comentarios existentes: explican el *porqué* (ej. "Log inmutable de auditoría"), no el *qué* |

## Detalle por sección

### 1. Planificar

El proyecto **sí tiene** una cultura fuerte de documentación de planificación de producto —
`docs/01-vision-y-plan/` contiene `Checklist_Desarrollo_SaaS.md`, `Roadmap_Backend.md`,
`Roadmap_Frontend.md`, `Vision_Multi_Industria.md`, `Estrategia_Precios.md`, y por cada iniciativa grande
se ha escrito un plan dedicado antes de ejecutar (ver `docs/02-arquitectura-y-db/Plan_Multi_Industria_*.md`,
cada uno con secciones de contexto, decisiones de diseño, alcance explícitamente excluido, y verificación).

Lo que **no existe** es el mecanismo específico pedido:

- Un **`spec.md`** único que compile especificación + casos límite + requisitos + arquitectura +
  tecnología + tests unitarios, producido a partir de una *entrevista* de la IA al usuario antes de
  escribir código. Hoy el patrón real es: el usuario da una instrucción de alto nivel → la IA usa el modo
  plan de Claude Code (`ExitPlanMode`) para proponer un plan → el usuario aprueba o pide ajustes. Es
  parecido en espíritu (hay una pausa antes de programar), pero el plan vive en
  `~/.claude/plans/*.md` (fuera del repo, no versionado, se pierde si no se documenta después a mano) y
  no sigue una plantilla fija de "casos límite / requisitos / arquitectura / tecnología / tests".
- Un **`plan.md`** de tareas chicas que se van tachando. La lista de tareas de esta sesión existió como
  `TaskCreate`/`TaskUpdate` (herramienta interna de Claude Code, ver las 20 tareas completadas de la
  iniciativa multi-industria) — funcionalmente similar, pero tampoco es un archivo versionado en el repo
  que el equipo pueda revisar en una PR.

**Qué sí cubre parcialmente esta necesidad hoy:** `Checklist_Multi_Industria_y_Produccion.md` es lo más
cercano a un `plan.md` real — está en el repo, versionado, con checkboxes Markdown tachables. Pero es a
nivel de fases de producto (semanas/meses), no a nivel de tarea de implementación diaria.

### 2. Contexto real (MCP)

No hay ningún servidor MCP propio de este proyecto configurado. `.claude/` solo contiene
`launch.json` (config de servidores de desarrollo para el preview del navegador) y
`settings.local.json` (permisos de algunos comandos puntuales) — no un `.mcp.json` con `mcpServers`.

Esto importa concretamente para este proyecto porque hay fuentes de verdad que hoy solo se consultan
"a mano" (grep, `psql` manual, lectura de archivos) y que un MCP dedicado podría exponer como
**Resources** (ej. el esquema real de Postgres vía introspección — relevante porque, como está
documentado en varios de los planes de esta sesión, el `meta/_journal.json` de Drizzle está desincronizado
de la base real, así que "leer el schema" hoy requiere `psql` manual) o como **Tools** (ej. "aplicar
migración SQL contra `barberos_postgres`" en vez de un `docker exec` compuesto a mano cada vez).

No se identificó ningún **Prompt** (plantilla de entrada reusable) versionado en el repo tampoco —
las instrucciones de arquitectura viven en `CLAUDE.md`/`AGENTS.md`, que es el mecanismo estándar de
Claude Code para esto, pero no es lo mismo que un MCP Prompt invocable explícitamente.

### 3. Verificar

**Control de versiones como puntos de guardado:** cumple. 105 commits en el historial, sin evidencia de
`push --force` ni reescritura de historia compartida.

**Commits pequeños:** mayormente sí — el `git log --shortstat` de los últimos 15 commits muestra la
mayoría entre 1 y 4 archivos. Hay dos excepciones grandes y explicables: `c3933d41` (60 archivos, el
rename mecánico `barbero`→`empleado` de Fase 2) y `b458b54b`/similares (79 archivos). Estos no son
"código basura acumulado sin revisar" — corresponden a cambios mecánicos de una sola naturaleza (rename
guiado por el compilador) documentados en `docs/02-arquitectura-y-db/Plan_Multi_Industria_Fase2_Rename.md`
— pero sí rompen la premisa de "si la siguiente sugerencia rompe algo, se vuelve al último punto seguro"
con precisión de commit, porque revertir uno de estos commits revierte 60-79 archivos a la vez, no un
cambio atómico. Para renames mecánicos futuros de este tamaño, considerar separar "cambio de schema"
de "cambio de código consumidor" en commits distintos aunque se hagan en la misma sesión.

**Revisión con un modelo diferente como segundo revisor:** no hay evidencia de que se use. Esta misma
sesión de Claude Code tiene acceso a `/code-review ultra` (alias `/ultrareview`), que lanza una revisión
multi-agente en la nube sobre la rama actual o un PR de GitHub — es exactamente el mecanismo de "segundo
revisor" que pide este criterio, pero (a) requiere que el usuario lo dispare explícitamente (no se
autoinvoca), y (b) no está documentado en ningún lugar del repo como parte del flujo esperado antes de
mergear a `master`. Hoy el desarrollo ocurre directo sobre `master` (no hay ramas de feature ni PRs en el
historial reciente), así que no hay ni siquiera el punto natural — un PR — donde ejecutar esa revisión.

### Anti-patrones — hallazgos concretos

- **`node_modules` trackeado en git — 47.282 de 47.890 archivos (98.7% del repo).** Causa raíz
  identificada con precisión: `apps/web/.gitignore` sí existe (viene del template de `create-next-app`,
  ignora `/node_modules`, `.env*`, etc. — por eso `apps/web` está limpio, 0 archivos de
  `node_modules` trackeados) pero **`apps/api` nunca tuvo un `.gitignore` propio**, y tampoco existe uno
  en la raíz del monorepo. Resultado: `apps/api/node_modules` (44.869 archivos) y el `node_modules/` de
  la raíz (2.413 archivos) se commitearon completos. `apps/api/dist/` (316 archivos, build compilado)
  también está trackeado por el mismo motivo. Esto ya estaba anotado como pendiente en
  `Checklist_Multi_Industria_y_Produccion.md` (Fase 4) pero sin la causa raíz ni el desglose exacto — se
  deja aquí documentado para que la corrección (agregar `.gitignore` en la raíz y en `apps/api`, luego
  `git rm -r --cached`) sea un cambio dirigido, no una exploración.
- **`apps/api/.env` trackeado en git** (hallazgo nuevo, no estaba en el checklist previo). Contiene
  `DATABASE_URL` y `REDIS_HOST`/`REDIS_PORT` de desarrollo local — hoy no son credenciales de producción
  (el `docker-compose.yml` usa `POSTGRES_PASSWORD: password`, un valor de desarrollo trivial), pero es el
  mismo síntoma que el punto anterior (falta de `.gitignore` en `apps/api`) y es el tipo de archivo que,
  si el proyecto pasa a tener credenciales reales de un entorno compartido, filtraría secretos por
  costumbre. Se resuelve con el mismo `.gitignore` de `apps/api` que el punto anterior.
- **Tests unitarios: no existen de verdad.** Los 13 archivos `*.spec.ts` en `apps/api/src` (uno por
  módulo: `auth`, `caja`, `citas`, `dgi`, `transacciones`, `usuarios`, `yappy`) y el único
  `test/app.e2e-spec.ts` son el boilerplate exacto que genera `nest generate` — 18 líneas cada uno,
  probando `"Hello World!"` del `AppController` por defecto, sin ninguna aserción sobre lógica de negocio
  real (RLS, cálculo de comisiones, idempotencia de citas, etc.). `apps/web` no tiene ni un solo archivo
  `*.test.ts(x)` a pesar de tener Vitest + Testing Library instalados y configurados en
  `package.json`. Esto ya estaba señalado en el checklist previo ("Fase 4: Suite de tests automatizados")
  — se confirma aquí con el detalle de que no es "cobertura baja", es cobertura cero real.
- **Emojis en commits: cumple.** `git log --format='%s'` sobre los 105 commits, filtrado por el rango
  Unicode de emoji, no devuelve resultados.
- **Código basura / nombres que suenan generados / comentarios vacíos:** sin evidencia de violación
  sistemática en el spot-check hecho (grep de patrones típicos como `foo`/`temp2`/`data2`, y lectura de
  una muestra de comentarios existentes, que explican el *porqué* — ej. `// Log inmutable de auditoría
  para TODOS los cierres de caja`, o un `// TODO: Deuda técnica — usar date-fns-tz...` que documenta una
  decisión pendiente real, no relleno). Esto es un spot-check, no una auditoría exhaustiva línea por
  línea — no se puede certificar "cumple" al 100% del código con la evidencia reunida aquí.
- **"Tratar la IA como un mago":** no hay una métrica objetiva para esto, pero el patrón de trabajo
  observado en el historial de este proyecto (planes escritos antes de ejecutar, verificación real en
  navegador antes de dar por completada una feature — ver
  `Plan_Multi_Industria_Fase2D_TerminologiaDinamica.md` sección 4 y 6 — y auto-corrección documentada de
  errores propios, ej. la nota sobre sobrescribir el PIN de un usuario de dev real por accidente en la
  misma sección) es consistente con el espíritu de "revisarle el trabajo a un junior" más que con
  aceptar el output sin revisión.

## Recomendaciones (no ejecutadas — pendientes de decisión del usuario)

En orden de impacto/costo:

1. **Agregar `.gitignore` en la raíz y en `apps/api`** (patrón de `apps/web/.gitignore`, que ya
   funciona bien) y sacar `node_modules`/`dist`/`.env` del control de versiones con
   `git rm -r --cached`. Es el hallazgo de mayor impacto — reduce el repo en ~98% de sus archivos
   trackeados y elimina el riesgo de secretos. Bajo riesgo técnico, alto en tamaño de diff (un commit
   dedicado, sin mezclar con otro cambio).
2. **Escribir un `spec.md` y un `plan.md` reales en el repo** para la próxima iniciativa grande (ej. la
   Fase 3 de `Checklist_Multi_Industria_y_Produccion.md` — wiring de `datos_adicionales`/`notas`), en vez
   de dejar el plan solo en `~/.claude/plans/`. Formalizar la plantilla (casos límite, requisitos,
   arquitectura, tecnología, tests) como parte del proceso, no solo para esta iniciativa.
3. **Escribir al menos un test unitario real** por módulo crítico (RLS/tenant scoping, cálculo de
   comisiones, idempotencia de `crearCita`) antes de seguir agregando funcionalidad — hoy un regresión
   silenciosa no la detectaría nada automatizado.
4. **Documentar `/code-review ultra` como paso esperado** antes de mergear cambios grandes a `master`
   (o adoptar un flujo de PRs para tener dónde dispararlo), y evitar repetir commits de 60-79 archivos —
   partir renames mecánicos grandes en commits más chicos cuando sea razonable.
5. **Evaluar un MCP propio del proyecto** (ej. introspección de schema de Postgres) si el costo de
   "leer el estado real de la base a mano" se vuelve recurrente — hoy es manejable porque el equipo es
   una sola persona con este mismo Claude Code, pero escala mal si el equipo crece.

---

*Este documento es un diagnóstico puntual, no un checklist recurrente — si se actúa sobre las
recomendaciones, actualizar el "Resumen de cumplimiento" de arriba en vez de crear un documento nuevo.*
