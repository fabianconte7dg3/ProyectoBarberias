# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Volumetrix (rebranded from BarberOS 2026-07-25) — a Panama-focused multi-tenant SaaS (originally for
barbershops, now expanding to other service industries — see `docs/01-vision-y-plan/`). Monorepo with
two apps:

- `apps/api` — NestJS 11 + Drizzle ORM + PostgreSQL (RLS-based multi-tenancy) + Redis/BullMQ.
- `apps/web` — Next.js 16 (App Router) + React 19 + Zustand + Tailwind 4.

There is no root build tool (no Turborepo/Nx) — each app is run and built independently from its own
directory.

`apps/web` has its own `AGENTS.md`/`CLAUDE.md` with a critical warning: **this Next.js version has
breaking changes vs. training data.** Before writing Next.js code, check `node_modules/next/dist/docs/`
for the real, currently-installed API rather than relying on prior knowledge.

## Commands

Infra (Postgres 16 + Redis), from repo root:
```bash
docker compose -f infrastructure/docker-compose.yml up -d
```
Container names: `volumetrix_postgres` (db `volumetrix`, user `postgres`), `volumetrix_redis`.

Backend (`apps/api`):
```bash
npm run start:dev      # nest start --watch, port 4000
npm run build           # nest build
npm run lint             # eslint --fix
npx tsc --noEmit          # type-check only, no test compilation needed for this
npm test                   # jest unit tests (*.spec.ts) — currently red, see docs/plan.md Fase 3
npm test -- citas.service  # run a single spec by name pattern
npm run test:e2e             # jest against test/jest-e2e.json
npm run test:integration       # real integration tests (RLS, idempotencia, comisiones) against a
                                 # dedicated volumetrix_test DB — auto-bootstraps it first, needs Docker
                                 # up. See docs/02-arquitectura-y-db/Plan_Fase3_Suite_Tests.md
```

Frontend (`apps/web`):
```bash
npm run dev       # next dev --webpack, port 3000
npm run build       # next build
npm run lint          # eslint
npx tsc --noEmit        # type-check
npm test                 # vitest run — unit tests (vitest + @testing-library/react + jsdom)
npm run test:watch          # vitest watch mode
```

Preview/dev servers should be launched via `.claude/launch.json` configs (`api`, `web`) rather than raw
`npm run dev` in Bash, when working through the browser preview tooling.

### Database migrations — hand-written SQL, not drizzle-kit

`apps/api/src/database/migrations/` contains 21 SQL files. **Do not run `drizzle-kit generate` or
`drizzle-kit push`** against this database — the `meta/_journal.json` history is desynced from the real
schema (only 4 journal entries exist for 24 real tables), so those commands would try to reconcile
accumulated drift instead of just your change. The established team convention is:

1. Hand-edit `apps/api/src/database/schema/schema.ts` first.
2. Write a new, idempotent SQL file: `NNNN_description.sql` using `ADD COLUMN IF NOT EXISTS`,
   `DO $$ IF NOT EXISTS ... $$`, `CREATE INDEX IF NOT EXISTS`, etc. — safe to re-run.
3. Apply it directly to the running container:
   ```bash
   docker exec -i volumetrix_postgres psql -U postgres -d volumetrix -f - < apps/api/src/database/migrations/NNNN_description.sql
   ```
4. Verify with `psql` (`\d table_name`, `enum_range`) — don't trust `schema.ts` alone, since declared
   indexes/constraints sometimes were never actually materialized in the live DB. The inverse also
   happens: `detalles_transaccion`, `productos`, and a handful of columns (`clientes.acepta_marketing`,
   `transacciones.idempotency_key`, etc.) exist in the live `volumetrix` DB with **no migration file at
   all** — found while building a from-scratch test DB, see
   [`Plan_Fase3_Suite_Tests.md`](./docs/02-arquitectura-y-db/Plan_Fase3_Suite_Tests.md).

One-off idempotent data seeds (not schema changes) live separately in
`apps/api/src/database/seeds/*.sql` (`ON CONFLICT ... DO UPDATE`), applied the same way via `psql`.

## Architecture

### Multi-tenancy via Postgres RLS

Tenant isolation is enforced at the database level via Row-Level Security, not just application-level
`WHERE tenant_id = ...` filters. The pattern, used everywhere data is read or written:

- Every RLS-protected table has a policy keyed on `current_tenant_id()`, a SQL function reading
  `current_setting('app.current_tenant_id', true)` (see `migrations/0001_rls_policies.sql`).
- For normal authenticated HTTP requests, `apps/api/src/database/tenant/tenant.interceptor.ts` reads
  `request.user.tenantId` (from the JWT), opens a transaction, runs
  `SET LOCAL ROLE app_user; SELECT set_config('app.current_tenant_id', <uuid>, true)`, and stores the
  scoped tx in `TenantContext` (an `AsyncLocalStorage`-backed context) for the duration of the request.
  Requests marked `@Public()` or made by a `superadmin` skip this.
- For code that runs outside an HTTP request context (webhooks, BullMQ jobs, public endpoints that must
  resolve a tenant from a slug before RLS applies), use
  `runInTenantScope(db, tenantId, callback)` (`apps/api/src/database/tenant/tenant.utils.ts`) — it does
  the same `SET LOCAL` + `TenantContext.run` dance manually.
- Public/unauthenticated endpoints that need to resolve a tenant by slug before any RLS context exists
  call the `SECURITY DEFINER` SQL function `auth_get_tenant_by_slug(slug)` (filters `estado='activo'`
  itself) to get a `tenantId`, then wrap the actual read/write in `runInTenantScope`. Look at
  `tenants.service.ts` or `servicios.service.ts:findPublicBySlug` as the reference implementation before
  adding a new public-by-slug endpoint.
- Inside request-scoped service code, prefer `TenantContext.getDb()` / `TenantContext.getTenantId()` over
  re-deriving the tenant from the request.

### NestJS module & auth conventions

- Each domain is a standard `*.module.ts` + `*.controller.ts` + `*.service.ts` triple (see `citas/`,
  `tenants/`, `productos/`, etc.).
- `@Public()` (`common/decorators/public.decorator.ts`) marks unauthenticated routes — checked by both
  the JWT guard and the tenant interceptor.
- `@Roles(...)` (`common/decorators/roles.decorator.ts`) takes role literals typed as
  `Rol = (typeof rolUsuarioEnum.enumValues)[number]`, derived directly from the Drizzle enum. This means
  a typo'd or renamed role string is a compile error, not a silent runtime bug — keep this pattern when
  adding role checks rather than typing roles as `string`.
- Two login flows, not interchangeable: admin (`rol='admin'`) logs in with email + bcrypt-hashed
  password via `/auth/login/admin`; staff (`rol IN ('empleado','recepcion')`, never `admin`) logs in with
  a 4-digit bcrypt-hashed PIN via `/auth/login/staff`.
- DTOs use `class-validator`. Note `@IsUUID()` requires actual v4-format UUIDs — hand-written
  "readable" sequential UUIDs in fixtures/seeds will fail validation; use `gen_random_uuid()` instead.

### Frontend: server-resolved tenant data via React Context

`apps/web/src/app/[tenantSlug]/layout.tsx` (a Server Component) fetches the tenant's public profile from
`GET /tenants/publico/:slug` (`cache: 'no-store'` — a tenant's terminology/plan can change live via
SuperAdmin) and wraps `{children}` in `TenantProvider` (`lib/tenant-context.tsx`). Descendant Client
Components read it via `useTenant()`. This is deliberately Context, not Zustand — the data resolves once
server-side per request and doesn't need cross-tab persistence, unlike the booking flow (`lib/store.ts`,
Zustand + `sessionStorage`) or the admin session (`lib/adminStore.ts`, Zustand + `localStorage`).

Client Components cannot read data resolved in a Server Component ancestor directly — if a page/layout
needs `useTenant()`, it must be (or be nested under) a `'use client'` component under the tenant layout;
`admin/layout.tsx` already inherits the Provider, so any admin page can call `useTenant()` without
further structural changes.

### Dynamic terminology (multi-industry)

`barberias` has `industria` + `terminologia_empleado/servicio/cliente` columns (defaults:
`'barberia'`/`'Barbero'`/`'Servicio'`/`'Cliente'`). UI copy that names a role/service/client should read
these via `useTenant()` rather than hardcoding "Barbero"/"Servicio" — that's the mechanism that lets a
non-barbershop tenant (e.g. veterinary) see its own vocabulary without a rebuild. `clientes` also has a
`datos_adicionales` (jsonb) column intended for vertical-specific data capture — as of the last audit
this still has zero UI/API wiring, so don't assume it's populated anywhere. `citas.notas` (motivo of the
visit), by contrast, is wired end-to-end since Fase 2.3: required at the application level for
`industria` in `veterinaria`/`clinica_medica`, surfaced in both the public booking wizard and the admin
walk-in modal.

Naming note: the staff role and related columns were renamed `barbero` → `empleado` throughout (backend,
DB, frontend) in a dedicated pass. `transacciones.comisionBarbero`/`propinaBarbero` were initially
excluded from that rename (append-only fiscal columns, handled with extra care) but were renamed to
`comisionEmpleado`/`propinaEmpleado` in a dedicated Fase 2.4 pass after confirming they have no
connection to the DGI module or any external contract — the whole codebase is consistent now, nothing
still uses the old `Barbero` names.

### Workflow — read before starting non-trivial work

@.agents/AGENTS.md

That file defines the Planificar → Ejecutar → Verificar flow, commit conventions, and the second-reviewer
role. In short: check [`docs/plan.md`](docs/plan.md) first — it is the **single live source of truth**
for what's done and what's next (phased, checkbox tasks). Don't start a new roadmap doc or re-derive the
plan from scratch; update `docs/plan.md` in place instead, so it doesn't drift into needing another
reorg like the one on 2026-07-24 (see `docs/README.md` for what that fixed).

### Docs

`docs/` is organized by numbered category (`01-vision-y-plan`, `02-arquitectura-y-db`,
`03-integraciones`, `04-hitos-y-changelogs`, `05-diseno-y-ux`, `06-referencias-tecnicas`) with an index at
[`docs/README.md`](docs/README.md) — start there for anything not covered below. Three docs matter most:

- [`docs/spec.md`](docs/spec.md) — product spec (verticals, actors, modules, known gaps, test status).
- [`docs/plan.md`](docs/plan.md) — the living roadmap (see Workflow above).
- [`docs/04-hitos-y-changelogs/walkthrough.md`](docs/04-hitos-y-changelogs/walkthrough.md) — 15-minute
  tour of the architecture and what's actually built, for onboarding into a cold context.

Superseded/historical docs live in `docs/archives/` (each has a banner naming its replacement) — if
something you remember reading isn't in the active index anymore, check there before assuming it's gone.

Check `docs/02-arquitectura-y-db/` before making schema or RLS changes (in particular the
`Plan_Multi_Industria_Fase*.md` and `Plan_Sistema_Agenda_*.md` docs — several approved-but-unimplemented
designs already exist there; don't redesign from scratch without checking first), and
`docs/06-referencias-tecnicas/Credenciales_QA_Local.md` for a dedicated QA tenant/credentials to use for
manual testing instead of touching real dev accounts.

### `docs/` is also an Obsidian vault — keep it connected, not just updated

`docs/.obsidian/` (config committed: `app.json`, `graph.json`, `core-plugins.json` — `workspace.json`/
`workspace-mobile.json` are gitignored, per-machine panel layout) makes `docs/` a real Obsidian vault, so
the graph/backlinks view is only useful if notes actually reference each other. Rules for any session that
touches `docs/`:

1. **Review it for context first.** Before non-trivial work, check whether a relevant doc already exists
   (`docs/README.md` index, or grep) rather than re-deriving design decisions from scratch — this was
   already the convention (see Workflow above), the vault just makes it navigable via backlinks/graph too.
2. **Never leave a new doc orphaned.** Every new file under `docs/` must get at least one inbound link:
   add it to `docs/README.md`'s index (correct numbered category) **and** link it from the specific
   existing doc it's most related to (e.g. a new design doc gets linked from the `docs/plan.md` phase that
   implements it, not just from the README). A doc reachable only from README is a weak, hub-only graph —
   real topical cross-links are what make the graph (and Claude's own future context-gathering) useful.
3. **Keep standard relative markdown links** (`[text](../folder/Doc.md)`), never `[[wikilinks]]` — this
   repo's docs are read on GitHub as much as in Obsidian, and wikilinks render as literal brackets there.
   Obsidian's graph, backlinks, and rename-safety (`alwaysUpdateLinks` is on) all work fine with regular
   relative links; there's no functional reason to switch syntax.
4. **When mentioning another doc by name in prose, link it** (`` `matriz-permisos-y-bloqueos.md` `` →
   `[`matriz-permisos-y-bloqueos.md`](./06-referencias-tecnicas/matriz-permisos-y-bloqueos.md)`) instead of
   a bare filename in backticks — a bare mention reads fine to a human but is invisible to the graph.
5. **Before ending a session that added/moved docs**, a quick orphan check is cheap and catches this
   class of mistake: a new file under `docs/**/*.md` with zero other files linking to it is a graph dead
   end, fix it before finishing.
