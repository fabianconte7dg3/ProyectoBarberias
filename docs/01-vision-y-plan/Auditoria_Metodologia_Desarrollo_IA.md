# Auditoría: Metodología de Desarrollo Asistido por IA

> **Fecha:** 2026-07-24 (auditoría inicial) · **Re-verificado:** 2026-07-24, tras las actualizaciones del
> usuario (commits `cb5a499c`…`83245162`).
> **Qué es esto:** el usuario definió un marco de trabajo de 3 pasos (Planificar → Contexto real →
> Verificar) más una lista de anti-patrones para el desarrollo asistido por IA en este proyecto, y pidió
> auditar si `ProyectoBarberias` lo cumple. Este documento es el resultado de esa auditoría, re-verificada
> después de que el usuario aplicara varias de las recomendaciones.

## ⚠️ Hallazgo de la re-verificación: el fix de `node_modules` dejó `apps/api` sin poder arrancar

El commit `0f52ba55` dice en su mensaje *"Los archivos siguen presentes en disco local, solo se sacan del
tracking de git"* — pero al re-verificar, `apps/api/node_modules/` **no existía físicamente en disco**
(`git rm --cached` no debería borrar del disco, así que algo adicional los eliminó — posiblemente un
`git clean` posterior, o una limpieza manual). Confirmado corriendo `npm run start:dev` en `apps/api`:
`sh: línea 1: nest: orden no encontrada`. Se corrigió en el momento como parte de esta re-verificación
con `npm install` en `apps/api` (866 paquetes reinstalados) — no requiere una decisión del usuario, es
restaurar el estado esperado post-clonado, y quedó confirmado con `git status --ignored` que
`node_modules/` vuelve a estar presente en disco pero correctamente ignorado por git. `npx tsc --noEmit`
en `apps/api` corre limpio (0 errores) después de la reinstalación.

**Lección para el propio flujo de "Verificar" de este proyecto:** después de un `git rm --cached` masivo,
correr `npm install` y arrancar la app antes de dar por cerrada la tarea — el árbol de trabajo limpio en
`git status` no garantiza que la app siga corriendo.

## Resumen de cumplimiento

| # | Criterio | Estado inicial | Estado re-verificado | Evidencia |
|---|---|---|---|---|
| 1a | Interview-first (la IA entrevista antes de programar) | 🟡 Parcial | 🟡 Parcial (sin cambios) | `.agents/AGENTS.md` ahora documenta un flujo de 3 pasos (Planificar/Ejecutar/Verificar), pero sigue sin exigir una entrevista estructurada antes de programar |
| 1b | `spec.md` compilando especificación, casos límite, arquitectura, tests | 🔴 No existe | 🔴 Sigue sin existir | `find` no encuentra `spec.md`; `.agents/AGENTS.md` menciona `implementation_plan.md` como nombre esperado, pero tampoco existe ningún archivo con ese nombre en el repo todavía |
| 1c | `plan.md` con tareas chicas tachables | 🔴 No existe | 🔴 Sigue sin existir | Mismo hallazgo — `.agents/AGENTS.md` menciona `walkthrough.md` como destino de actualización, tampoco existe aún |
| 2 | Contexto real vía MCP (tools/resources/prompts conectados al proyecto) | 🔴 No configurado | 🔴 Sigue sin configurar | No hay `.mcp.json` en el repo (verificado de nuevo) |
| 3a | VCS como puntos de guardado | 🟢 Cumple | 🟢 Cumple | 109 commits ahora, historial limpio |
| 3b | Commits pequeños | 🟡 Parcial | 🟢 Mejorado | Los 4 commits nuevos son de 1 archivo cada uno; además `.agents/AGENTS.md` ahora **documenta la regla explícita** de 1-10 archivos por commit y de aislar renames mecánicos — pasa de práctica implícita a convención escrita |
| 3c | Revisión por un segundo modelo | 🔴 No se usa | 🟡 Mejorado (documentado, no aún ejercido) | `.agents/AGENTS.md` ahora define a **Antigravity como segundo revisor obligatorio** (revisión semántica, seguridad, `tsc --noEmit`, commit+push) para cada cambio, con `/code-review ultra` reservado a cambios >20 archivos. Sigue sin evidencia en el historial de que ese paso se haya ejecutado todavía — es una convención nueva, aún no probada en la práctica |
| Anti | Emojis en commits | 🟢 Cumple | 🟢 Cumple | 0 emojis en 109 commits; ahora también es una regla escrita en `.agents/AGENTS.md` |
| Anti | Tests unitarios reales | 🔴 No cumple | 🔴 Sin cambios | Sigue siendo boilerplate sin tocar — no era el foco de esta ronda de cambios |
| Anti | Deuda técnica: `node_modules`/`dist`/`.env` en git | 🔴 No cumple (grave) | 🟢 **Resuelto** | Ver detalle abajo — de 47.890 a 329 archivos trackeados |
| Anti | Secretos/credenciales en git | 🟡 Hallazgo nuevo | 🟢 **Resuelto** | `apps/api/.env` sacado del tracking (`git rm --cached`), sigue en disco local para desarrollo |
| Anti | Código basura / nombres genéricos | 🟢 Sin evidencia de violación | 🟢 Sin cambios | No aplicó a esta ronda |
| Anti | Comentarios que no explican nada | 🟢 Sin evidencia de violación | 🟢 Sin cambios | No aplicó a esta ronda |

## Qué cambió en esta ronda (commits `cb5a499c`…`83245162`)

1. **`cb5a499c` / `83245162` — nuevo `.agents/AGENTS.md`.** Define el rol de **Antigravity como segundo
   revisor obligatorio** (revisión semántica + seguridad + `tsc --noEmit` + commit/push), convenciones de
   commits (Conventional Commits en español, sin emojis, 1-10 archivos, renames mecánicos aislados), y un
   flujo Planificar/Ejecutar/Verificar de 3 pasos. Es leído automáticamente por Antigravity y (según su
   propio texto, actualizado en `83245162`) por Claude. Responde directamente a los criterios 3c
   (segundo revisor) y a la convención de commits pequeños de 3b.
2. **`0f52ba55` — `chore: eliminar node_modules, dist y .env del control de versiones`.** `git rm --cached`
   sobre `apps/api/node_modules/` (44.869 archivos), `apps/api/dist/` (316 archivos), `node_modules/` raíz
   (2.413 archivos) y `apps/api/.env`. Referencia explícitamente esta misma auditoría como causa raíz
   documentada — el flujo de "leer el hallazgo → decidir → ejecutar" funcionó como se esperaría.
3. **`ac27f95e` — nuevo `apps/api/.gitignore`.** El que faltaba desde el inicio del proyecto (causa raíz
   identificada en la auditoría original). Sigue el mismo patrón que el `.gitignore` de `apps/web`.
4. **Nuevo `.gitignore` en la raíz** (visto en el árbol de trabajo, no en un commit separado — probablemente
   incluido en `0f52ba55`).

**Resultado medido:** de 47.890 a **329 archivos trackeados** (-99.3%), 0 archivos de `node_modules`
trackeados (antes 47.282), 0 archivos `.env` trackeados (antes 1).

**Efecto secundario encontrado y corregido en esta re-verificación:** `apps/api` quedó sin
`node_modules/` en disco (ver sección de arriba) — restaurado con `npm install`.

**Deuda documentada pero aún desactualizada:** la tabla "Deuda Técnica Conocida" del propio
`.agents/AGENTS.md` (líneas 83-93) todavía lista los ítems 1 (`node_modules`/`dist` trackeados) y 2
(`.env` trackeado) como pendientes — quedaron obsoletos por los commits `0f52ba55`/`ac27f95e` del mismo
día. Se corrige como parte de esta re-verificación (ver commit de esta sesión) para no dejar un documento
del propio repo contradiciendo el estado real, que es justo el tipo de inconsistencia que esta auditoría
busca detectar.

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

## Recomendaciones — estado actualizado

En orden de impacto/costo:

1. ~~Agregar `.gitignore` en la raíz y en `apps/api`, sacar `node_modules`/`dist`/`.env` del control de
   versiones.~~ **✅ Resuelto** (`0f52ba55`, `ac27f95e`) — ver sección "Qué cambió en esta ronda". Único
   pendiente relacionado: correr `npm install` en cualquier clon nuevo del repo (ya no viene con
   `node_modules` versionado) — trivial, pero vale la pena una nota en un futuro `README.md` de setup si
   no existe todavía uno con pasos de instalación explícitos.
2. **Ejercer el rol de "segundo revisor" que ya quedó documentado en `.agents/AGENTS.md`.** La convención
   existe desde `cb5a499c`, pero todavía no hay un commit en el historial donde se pueda confirmar que
   ese paso 3 (revisión semántica + seguridad + `tsc --noEmit` antes de commitear) efectivamente ocurrió
   como un paso distinto, en vez de ser parte implícita del mismo flujo de siempre. Vale la pena, en la
   próxima sesión de trabajo, dejar rastro explícito (ej. en el mensaje de commit o en un doc) de que el
   segundo revisor corrió y qué encontró — aunque sea "nada que reportar" — para que la convención se
   pueda auditar objetivamente en vez de confiar en que se siguió.
3. **Escribir un `spec.md` / `implementation_plan.md` / `walkthrough.md` reales en el repo** para la
   próxima iniciativa grande (ej. la Fase 3 de `Checklist_Multi_Industria_y_Produccion.md` — wiring de
   `datos_adicionales`/`notas`). `.agents/AGENTS.md` ya *menciona* estos nombres de archivo como parte del
   flujo esperado, pero ninguno existe todavía en el repo — es la brecha más grande que queda entre lo que
   dice la convención y lo que hay en disco.
4. **Escribir al menos un test unitario real** por módulo crítico (RLS/tenant scoping, cálculo de
   comisiones, idempotencia de `crearCita`) antes de seguir agregando funcionalidad — hoy una regresión
   silenciosa no la detectaría nada automatizado.
5. **Evaluar un MCP propio del proyecto** (ej. introspección de schema de Postgres) si el costo de
   "leer el estado real de la base a mano" se vuelve recurrente — hoy es manejable porque el equipo es
   una sola persona con este mismo Claude Code, pero escala mal si el equipo crece.

---

*Este documento es un diagnóstico puntual, no un checklist recurrente — si se actúa sobre las
recomendaciones, actualizar el "Resumen de cumplimiento" de arriba en vez de crear un documento nuevo.*
