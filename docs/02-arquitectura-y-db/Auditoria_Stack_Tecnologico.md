# Auditoría del Stack Tecnológico — Hallazgos y Remediación

> **Fecha:** 2026-07-24
> **Estado:** ✅ Ejecutado y verificado (no es solo diagnóstico — esta vez se aplicaron los fixes)
> **Contexto:** el usuario pidió una crítica honesta de todo el stack (funcional, escalable, que no se
> rompa a futuro, necesario) y luego autorizó ejecutar lo que correspondiera sin esperar aprobación
> punto por punto, salvo lo que realmente necesitara una decisión de negocio.

## 1. Resumen para quien no es de software

Se auditaron las dependencias de todo el proyecto (backend y frontend) contra la base de datos pública
de vulnerabilidades de npm (`npm audit`, la misma fuente que usan herramientas como Dependabot/Snyk).
Se encontraron **56 vulnerabilidades en total** (39 en el backend, 17 en el frontend). Después de la
remediación quedan **6**, todas de bajo riesgo real y explicadas una por una en la sección 4 — ninguna
es explotable a través del uso normal de la aplicación.

**Importante — lo que NO se hizo:** no se aplicó `npm audit fix --force` a ciegas. Esa opción, en varios
casos, sugería *bajar de versión* librerías que sí usamos activamente (ej. la que genera los reportes en
Excel, o el motor de la API), lo cual habría "arreglado" la vulnerabilidad rompiendo una función real del
sistema. En su lugar, donde fue seguro, se forzó solo la pieza interna vulnerable a una versión más nueva
sin tocar la librería que el proyecto realmente usa (técnica llamada `overrides` en npm) — y cada cambio
se verificó de verdad (compilación, arranque del servidor, y una prueba en vivo del portal de reserva),
no solo "el contador bajó".

## 2. Backend (`apps/api`) — de 39 a 0 vulnerabilidades

| Antes | Causa raíz | Acción |
|---|---|---|
| 32 (moderadas/altas) | Cadena `minimatch`/`brace-expansion`/`glob`, anidada dentro de `eslint` y `jest` — **herramientas de desarrollo, nunca corren en producción** | `overrides` forzando `brace-expansion` a la versión parchada (`5.0.8`), sin tocar eslint/jest |
| 5 (`@esbuild-kit`/`esbuild`/`drizzle-kit`) | `drizzle-kit` estaba instalado pero el propio `CLAUDE.md` del proyecto **prohíbe usarlo** (`db:generate`/`db:push` desincronizados del estado real) | Se eliminó `drizzle-kit` del proyecto por completo — cero beneficio, solo superficie de ataque. Se borró también `drizzle.config.ts` (ya no lo consume nadie) |
| 1 (`js-yaml`, vía `@nestjs/swagger`) | `npm audit fix --force` sugería *bajar* `@nestjs/swagger` de `11.4.6` a `11.4.5` — no es un parche real, solo la versión donde la dependencia vulnerable no aparece | `overrides` forzando `js-yaml` a `^5.2.2`, manteniendo `@nestjs/swagger` en su versión actual |
| 1 (`uuid`, vía `exceljs`) | `npm audit fix --force` sugería bajar `exceljs` de `^4.4.0` a `3.4.0` (versión mayor anterior, rompería la exportación a Excel) | `overrides` forzando `uuid` a `^11.1.1`. **Verificado en vivo:** se generó un archivo `.xlsx` de prueba con la librería después del cambio — funciona igual |
| 1 (`fast-uri`) | Fix directo disponible, sin cambios de versión mayor | `npm audit fix` normal |

**Resultado:** `npm audit` → `found 0 vulnerabilities`. `npx tsc --noEmit` limpio. Servidor arrancado en
vivo, todas las rutas registradas correctamente, canario de RLS corrió y confirmó aislamiento íntegro.

## 3. Frontend (`apps/web`) — de 17 a 6 vulnerabilidades (las 6 restantes son bajo riesgo real, ver sección 4)

| Antes | Causa raíz | Acción |
|---|---|---|
| Next.js con **9 CVEs de severidad alta** — incluyendo SSRF en Server Actions, confusión de caché entre requests (relevante para un SaaS multi-tenant), y exposición no autenticada de endpoints internos | `next@16.2.10` estaba **exactamente un patch atrás** del parche real (`16.2.11`) | `next` → `16.2.11` (patch, no cambio mayor). El `package.json` lo tenía fijado sin `^`, por eso `npm audit fix` no lo agarraba solo |
| `sharp` (procesamiento de imágenes, usado internamente por Next para su API de optimización) | Next `16.2.11` sigue empaquetando internamente una versión vieja de `sharp` — Next todavía no publicó su propio parche para esto | `overrides` forzando el `sharp` interno de Next a `^0.35.0`. **Verificado:** sin marcar "invalid", servidor arranca normal |
| `postcss` (vía Next, 3 CVEs) | Igual que `sharp` — empaquetado internamente por Next | Se intentó forzar con `overrides`, pero **rompió la resolución de dependencias** ("invalid" — Next tiene su pipeline de CSS acoplado a esa versión exacta). Se revirtió — ver sección 4 para el riesgo real aceptado |
| Cadena `minimatch`/`brace-expansion`/`js-yaml` en `eslint`/`openapi-typescript`/`shadcn` (herramientas de desarrollo) | Igual que en el backend | `overrides` para `js-yaml` y `brace-expansion` a versiones parchadas |
| `@tanstack/react-query` | **Instalada, cero archivos la usan en todo el proyecto.** Peso muerto puro | **Eliminada.** Si en el futuro se construye el calendario en tiempo real (ya diseñado, ver `Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md`), se puede reinstalar con una integración real — hoy no aportaba nada |
| `zod` | Se sospechaba peso muerto (1 solo archivo) — **se verificó antes de tocar nada** y resultó ser validación real y activa del flujo de reserva pública (UUID, teléfono, fecha/hora) | **Se mantiene, sin cambios** — corrección de mi propia crítica anterior |
| `shadcn` en `dependencies` | Es una herramienta de CLI (copia componentes al proyecto una vez), no debería vivir como dependencia de runtime | Movida a `devDependencies` |

**Resultado:** `npx tsc --noEmit` limpio. Servidor de desarrollo levantado en vivo con `next@16.2.11`,
sin errores de consola. **Prueba end-to-end real:** `/barberiajose/reservar` cargó el catálogo de
servicios y la lista de empleados con terminología dinámica ("Elige a tu barbero") correctamente,
confirmando que ni el upgrade de Next ni la eliminación de TanStack Query rompieron nada.

## 4. Lo que queda sin resolver — y por qué es aceptable

| Paquete | Por qué sigue vulnerable | Riesgo real para este proyecto |
|---|---|---|
| `postcss` (interno de Next 16.2.11) | Next no ha publicado su propio parche todavía; forzarlo rompe el pipeline de CSS de Next | Las 3 vulnerabilidades son sobre procesar CSS **no confiable** (XSS al convertir CSS a texto, lectura de archivos vía comentarios `sourceMappingURL`). Este proyecto solo procesa su propio CSS de Tailwind, escrito por el equipo — no hay ningún flujo donde un usuario final suba o controle CSS que el servidor procese. Exposición real: muy baja |
| `@hono/node-server` (vía la integración MCP de `shadcn`, ahora en devDependencies) | Solo se resuelve bajando `shadcn` 3+ versiones mayores | `shadcn` es una herramienta de CLI que el equipo invoca manualmente (`npx shadcn add ...`) para copiar componentes — nunca corre como parte de la aplicación real ni en producción |
| Resto de la cadena `eslint`/`jest`/`@redocly` que no se pudo forzar sin romper versiones | Requieren bajar `eslint` o `jest` a versiones de hace varios años | Son herramientas de desarrollo (lint/test), nunca se ejecutan en el servidor que atiende usuarios reales |

**Ninguno de estos 6 restantes corre en el código que atiende a un cliente real reservando una cita** —
todos son herramientas de desarrollo/build, o funcionalidad de Next.js que procesa únicamente contenido
del propio equipo, no contenido de terceros/usuarios.

## 5. Otros hallazgos del stack, aplicados

- **`engines.node` fijado** (`>=20.0.0`) en `apps/api` y `apps/web` — antes no existía en ningún
  `package.json` del proyecto, riesgo real dado lo reciente del stack (Next 16, React 19.2).
- **`drizzle-kit` eliminado por completo** del backend — herramienta prohibida por la propia convención
  del proyecto, que solo aportaba superficie de vulnerabilidad sin ningún uso real.

## 6. Lo que se decidió NO tocar en esta pasada (fuera de alcance, no es parte de "seguridad")

- Versión de Next.js/React (bajar a una línea más madura) — es una decisión de producto/esfuerzo, no un
  fix de seguridad; ya está documentada como riesgo a monitorear en la crítica de stack original.
- Caché con Redis para endpoints públicos de solo lectura — mejora de rendimiento, no de seguridad.
- El trade-off de multi-tenancy en una sola base de datos compartida — decisión arquitectónica ya
  tomada y correcta para el tamaño actual, no algo a "arreglar".

## 7. Verificación realizada (no solo `npm audit`)

1. `npm audit` → 0 (backend) / 6 de bajo riesgo documentado (frontend).
2. `npx tsc --noEmit` limpio en ambos paquetes.
3. `exceljs` probado en vivo generando un `.xlsx` real después de cambiar su `uuid` interno.
4. Backend arrancado en vivo — todas las rutas registradas, canario de RLS confirmó aislamiento íntegro.
5. Frontend arrancado en vivo con `next@16.2.11` — `/barberiajose/reservar` renderizó el catálogo real
   de servicios y empleados sin errores de consola.
