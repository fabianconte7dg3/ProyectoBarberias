# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BarberOS — a Panama-focused multi-tenant SaaS (originally for barbershops, now expanding to other
service industries — see `docs/01-vision-y-plan/`). Monorepo with two apps:

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
Container names: `barberos_postgres` (db `barberos`, user `postgres`), `barberos_redis`.

Backend (`apps/api`):
```bash
npm run start:dev      # nest start --watch, port 4000
npm run build           # nest build
npm run lint             # eslint --fix
npx tsc --noEmit          # type-check only, no test compilation needed for this
npm test                   # jest unit tests (*.spec.ts)
npm test -- citas.service  # run a single spec by name pattern
npm run test:e2e             # jest against test/jest-e2e.json
```

Frontend (`apps/web`):
```bash
npm run dev       # next dev --webpack, port 3000
npm run build       # next build
npm run lint          # eslint
npx tsc --noEmit        # type-check
npx vitest              # unit tests (vitest + @testing-library/react + jsdom)
```

Preview/dev servers should be launched via `.claude/launch.json` configs (`api`, `web`) rather than raw
`npm run dev` in Bash, when working through the browser preview tooling.

### Database migrations — hand-written SQL, not drizzle-kit

`apps/api/src/database/migrations/` contains ~13 SQL files. **Do not run `drizzle-kit generate` or
`drizzle-kit push`** against this database — the `meta/_journal.json` history is desynced from the real
schema (only 4 journal entries exist for 20 real tables), so those commands would try to reconcile
accumulated drift instead of just your change. The established team convention is:

1. Hand-edit `apps/api/src/database/schema/schema.ts` first.
2. Write a new, idempotent SQL file: `NNNN_description.sql` using `ADD COLUMN IF NOT EXISTS`,
   `DO $$ IF NOT EXISTS ... $$`, `CREATE INDEX IF NOT EXISTS`, etc. — safe to re-run.
3. Apply it directly to the running container:
   ```bash
   docker exec -i barberos_postgres psql -U postgres -d barberos -f - < apps/api/src/database/migrations/NNNN_description.sql
   ```
4. Verify with `psql` (`\d table_name`, `enum_range`) — don't trust `schema.ts` alone, since declared
   indexes/constraints sometimes were never actually materialized in the live DB.

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
`datos_adicionales` (jsonb) column and `citas` has `notas` (text) intended for vertical-specific data
capture (pet breed, medical notes, etc.) — as of the last audit these have zero UI/API wiring yet, so
don't assume they're populated anywhere.

Naming note: the staff role and related columns were renamed `barbero` → `empleado` throughout (backend,
DB, frontend) in a dedicated pass. `transacciones.comisionBarbero`/`propinaBarbero` were **deliberately
excluded** from that rename (append-only fiscal/DGI-reporting columns) and still use the old name —
don't rename them as a drive-by.

### Docs

`docs/` is organized by numbered category (`01-vision-y-plan`, `02-arquitectura-y-db`,
`03-integraciones`, `04-hitos-y-changelogs`, `05-diseno-y-ux`, `06-referencias-tecnicas`) with an index at
`docs/README.md`. Check `docs/02-arquitectura-y-db/` before making schema or RLS changes, and
`docs/06-referencias-tecnicas/Credenciales_QA_Local.md` for a dedicated QA tenant/credentials to use for
manual testing instead of touching real dev accounts.
