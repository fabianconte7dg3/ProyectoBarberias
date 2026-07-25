# Arquitectura de datos — ProyectoBarberias

> **Corregido 2026-07-24:** este documento originalmente instruía correr `drizzle-kit generate`/`push` —
> **eso está prohibido en este proyecto** (ver `CLAUDE.md`, sección "Database migrations"). El
> `meta/_journal.json` de Drizzle está desincronizado del esquema real, así que esos comandos intentarían
> reconciliar todo el drift acumulado en vez de aplicar solo un cambio puntual. `drizzle-kit` ya fue
> **eliminado del proyecto por completo** (ver `Auditoria_Stack_Tecnologico.md`) — ni siquiera está
> instalado. También corregido: el esquema real tiene **19 tablas**, no 12 — la referencia de campo por
> campo vive en `apps/api/src/database/schema/schema.ts`, no en este documento (para no duplicar algo que
> se desincroniza solo).

Schema Drizzle + RLS multi-tenant para NestJS.

## Instalación

```bash
npm install
```

## Estructura real

```
src/database/
├── schema/
│   ├── schema.ts          # Las 19 tablas + enums + relations — fuente de verdad
│   └── index.ts
├── migrations/
│   └── 0001_rls_policies.sql, 0002_..., ... 0011_...   # SQL escrito a mano, uno por cambio
├── seeds/
│   └── *.sql               # Datos de prueba idempotentes (ON CONFLICT DO UPDATE)
├── tenant/
│   ├── database.constants.ts
│   ├── tenant-context.ts       # AsyncLocalStorage: propaga la tx con RLS
│   ├── tenant.interceptor.ts   # Abre tx, hace SET LOCAL, expone TenantContext
│   └── tenant.utils.ts         # runInTenantScope() — mismo patrón para webhooks/BullMQ
└── database.module.ts          # Provee el pool global de Postgres (@Global)

src/citas/
└── citas.service.ts            # Ejemplo de uso correcto del patrón
```

## Pasos para dejarlo funcionando

1. **Variables de entorno**: define `DATABASE_URL` apuntando a Postgres,
   con un rol de aplicación (`NOBYPASSRLS` — nunca el owner/superusuario).

2. **Aplicar el esquema y las migraciones — a mano, en orden, vía `psql`** (no `drizzle-kit`):
   ```bash
   for f in apps/api/src/database/migrations/*.sql; do
     docker exec -i volumetrix_postgres psql -U postgres -d volumetrix -f - < "$f"
   done
   ```
   Cada archivo es idempotente (`ADD COLUMN IF NOT EXISTS`, etc.) — seguro de re-correr. Para un cambio
   nuevo: hand-editar `schema.ts` primero, después escribir un archivo `NNNN_descripcion.sql` nuevo. Ver
   `CLAUDE.md` para el flujo completo.

3. **Las políticas RLS ya están incluidas** en `0001_rls_policies.sql` — no es un paso aparte, es una
   migración más del bucle anterior.

4. **Registrar el módulo global** en `app.module.ts`:
   ```typescript
   @Module({
     imports: [DatabaseModule, /* ...resto de módulos */],
   })
   export class AppModule {}
   ```

5. **Aplicar el `TenantInterceptor` globalmente** (o por controller, si
   algunas rutas son públicas y no deben abrir contexto de tenant):
   ```typescript
   // main.ts o app.module.ts con APP_INTERCEPTOR
   app.useGlobalInterceptors(app.get(TenantInterceptor));
   ```
   Ojo: rutas de auth/login (donde aún no hay tenant resuelto) deben quedar
   **excluidas** de este interceptor — ahí sí usas el pool global sin RLS
   (o una política separada para la tabla `usuarios` en el login).

6. **En cualquier service sincronico (con HTTP Request)**, usa `TenantContext.getDb()` en vez de inyectar el pool de Drizzle directamente.

7. **Procesos Asíncronos o Webhooks (NUEVO - Hito 5)**:
   Cuando no se cuenta con un JWT (ej. webhooks públicos, colas de BullMQ, funciones setTimeout simuladas), el ciclo de vida del Request Interceptor de NestJS no funciona. Para esto se introdujo un helper arquitectónico central en `src/database/tenant/`:
   ```typescript
   export async function runInTenantScope<T>(tenantId: string, callback: () => Promise<T>): Promise<T>
   ```
   Esta función abre internamente su propia transacción con Drizzle, hace `SET LOCAL app.current_tenant_id` y `SET ROLE app_user`, y envuelve la ejecución del callback dentro del `TenantContext.run()`. Todo el sistema debe utilizar esto para operaciones Multi-Tenant en segundo plano.

## Puntos resueltos (Hito 4 y 5)

- ✅ **Rol de Postgres y Privilegios Seguros**: Los permisos de `app_user` fueron corregidos (migración `0003` y `0004`). Tienen permisos exactos granulares, asegurando el diseño Append-Only en `transacciones` (UPDATE permitido solo a nivel de columnas específicas). El rol está creado sin BYPASSRLS.
- ✅ **Bypass RLS para Autenticación**: Se introdujeron funciones `SECURITY DEFINER` seguras (`auth_get_tenant_by_slug` y `auth_get_user_by_token`) con `SET search_path = public` y `REVOKE EXECUTE FROM PUBLIC`, permitiendo el acceso en login y activación de personal antes de que el `current_tenant_id` esté seteado.
- ✅ **`idempotency_key` en `citas`**: Resuelto (Hito 4). La función `agendarCita` atrapa el conflicto de violación de unicidad `23505` y devuelve un `200 OK` con la cita pre-existente, erradicando el "Error #12" de doble cobro.
- ✅ **Aislamiento de Webhooks (Yappy, WhatsApp)**: Resuelto a través del patrón `runInTenantScope` descrito arriba.
- 🕒 **PgBouncer**: sigue sin implementarse (ver `docs/plan.md`, Fase 4). El patrón elegido (`SET LOCAL`
  dentro de una transacción, no `SET` de sesión) **sí es compatible** con el modo *transaction pooling* —
  es justamente el patrón recomendado para ese caso, no un riesgo. Verificar antes de activarlo: que el
  driver `node-postgres` no esté usando prepared statements con nombre (esos sí tienen problemas
  conocidos con transaction pooling); Drizzle con este driver no los usa por defecto, pero vale la pena
  confirmarlo contra la versión real instalada antes de ir a producción.
