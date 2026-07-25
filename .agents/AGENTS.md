# AGENTS.md — Convenciones de Desarrollo Asistido por IA · ProyectoBarberias

Este archivo es leído automáticamente por Antigravity y Claude al iniciar cualquier sesión en este repositorio.
Define el rol del agente, las reglas de flujo de trabajo y las convenciones esperadas. 

---

## 🤝 Rol de Antigravity en Este Proyecto

**Antigravity actúa como Segundo Revisor obligatorio en cada cambio de código.**

Esto significa que antes de dar por finalizado cualquier bloque de trabajo (feat, fix, refactor),
Antigravity debe:

1. **Revisar semánticamente los cambios** — ¿El código hace lo que dice el commit/plan? ¿Hay efectos secundarios silenciosos?
2. **Revisar seguridad activa** — ¿Se expone algún dato sensible? ¿El RLS sigue intacto? ¿Se validan todos los inputs con class-validator?
3. **Revisar tipos** — Ejecutar `npx tsc --noEmit` en `apps/api` y `apps/web` y confirmar 0 errores antes de hacer commit.
4. **Hacer el commit y push** — No dejar cambios pendientes sin versionar al finalizar la sesión.

> Este rol reemplaza la necesidad de un segundo agente externo o revisión manual para los cambios
> cotidianos. Para cambios masivos (> 20 archivos), se evaluará adicionalmente `/code-review ultra`.

---

## 📝 Convenciones de Commits

### Reglas Obligatorias

| Regla | Detalle |
|---|---|
| **Sin emojis** | 0 emojis en el subject del commit. El historial de 105 commits cumple esto; mantenerlo. |
| **Conventional Commits** | Prefijo obligatorio: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `perf:`, `test:` |
| **Commits pequeños y atómicos** | Preferir 1 a 10 archivos por commit. Cambios de naturaleza diferente van en commits separados. |
| **Renames mecánicos en commits aislados** | Si se renombra un símbolo en > 20 archivos (ej. `barbero` → `empleado`), separar: (1) cambio de schema/BD, (2) cambio de código consumidor. Nunca mezclar con lógica de negocio. |
| **Sin commits de dist/ o node_modules** | El `.gitignore` de raíz excluye `dist/`, `node_modules/`, `*.tsbuildinfo`, `.env*`. No deben trackearse. |

### Formato del Subject
```
<tipo>(<scope opcional>): <descripción en español, imperativo, sin punto final>

Ejemplos correctos:
  feat(citas): agregar campo notas para consultorios médicos
  fix(auth): no cerrar sesión de admin por carrera de hidratación de Zustand
  docs: actualizar matriz de permisos y kill-switches
  chore: eliminar node_modules del control de versiones

Ejemplos incorrectos:
  ✨ feat: nueva feature  (emoji prohibido)
  FIX: arreglé el bug.   (mayúsculas + punto final)
  fix stuff               (sin tipo ni scope)
```

---

## 🔄 Flujo de Trabajo Esperado

```
1. PLANIFICAR  → Escribir o actualizar implementation_plan.md antes de tocar código.
               → Para tareas > 3 archivos, documentar en docs/ antes de ejecutar.

2. EJECUTAR    → Cambios pequeños y atómicos.
               → Ejecutar `npx tsc --noEmit` tras cada bloque de cambios.
               → Antigravity revisa como segundo revisor (ver sección anterior).

3. VERIFICAR   → Commit con mensaje Conventional Commits en español.
               → Push a origin/master antes de finalizar la sesión.
               → Actualizar walkthrough.md o el checklist correspondiente en docs/.
```

---

## 🏗️ Arquitectura — Recordatorios Clave

Leer [CLAUDE.md](../CLAUDE.md) para la guía completa. Puntos críticos:

- **Migraciones:** Hand-written SQL en `apps/api/src/database/migrations/`. **No usar `drizzle-kit generate` ni `drizzle-kit push`** — el journal está desincronizado.
- **RLS Multi-Tenant:** Todo acceso a datos debe pasar por `TenantContext.getDb()` o `runInTenantScope()`. Nunca bypassear con queries sin contexto.
- **Terminología Dinámica:** UI copy de roles/servicios/clientes debe leer de `useTenant()`, nunca hardcoded como `"Barbero"` o `"Servicio"`.
- **Rename `barbero` → `empleado`:** Completado. Las columnas fiscales `comisionBarbero`/`propinaBarbero` en `transacciones` fueron excluidas intencionalmente del rename; no renombrarlas.

---

## 🔴 Deuda Técnica Conocida (Pendientes de Decisión)

| # | Hallazgo | Riesgo | Prioridad |
|---|---|---|---|
| 1 | ~~`apps/api/node_modules/` y `apps/api/dist/` trackeados en git~~ | — | ✅ Resuelto (`0f52ba55`, `ac27f95e`, 2026-07-24) |
| 2 | ~~`apps/api/.env` trackeado (credenciales de dev local)~~ | — | ✅ Resuelto (`0f52ba55`, 2026-07-24) |
| 3 | 13 `*.spec.ts` son boilerplate sin tocar de `nest generate` (cobertura real = 0) | Alto (regresiones silenciosas) | Media |
| 4 | No hay archivos `*.test.tsx` en `apps/web` a pesar de Vitest+Testing Library instalados | Alto | Media |
| 5 | No existen `spec.md`/`implementation_plan.md`/`walkthrough.md` pese a estar mencionados como parte del flujo esperado en este archivo | Medio (convención documentada pero no seguida aún) | Media |

> Nota post-resolución de 1: `git rm --cached` no borra del disco, pero en este repo `apps/api/node_modules/`
> terminó eliminado físicamente igual — cualquier clon nuevo (o si te pasa a ti) necesita `npm install`
> en `apps/api` antes de poder correr `start:dev`. Ver
> [Auditoria_Metodologia_Desarrollo_IA.md](../docs/01-vision-y-plan/Auditoria_Metodologia_Desarrollo_IA.md)
> para el detalle completo de la re-verificación.
