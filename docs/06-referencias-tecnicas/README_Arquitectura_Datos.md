# Arquitectura de datos — ProyectoBarberias

Schema Drizzle + RLS multi-tenant para NestJS, basado en el ERD de 12 tablas.

## Instalación

```bash
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg
```

## Estructura generada

```
src/database/
├── schema/
│   ├── schema.ts          # Las 12 tablas + enums + relations
│   └── index.ts
├── migrations/
│   └── 0001_rls_policies.sql   # Políticas RLS (correr DESPUÉS del generate)
├── tenant/
│   ├── database.constants.ts
│   ├── tenant-context.ts       # AsyncLocalStorage: propaga la tx con RLS
│   └── tenant.interceptor.ts   # Abre tx, hace SET LOCAL, expone TenantContext
└── database.module.ts          # Provee el pool global de Postgres (@Global)

src/citas/
└── citas.service.ts            # Ejemplo de uso correcto del patrón
```

## Pasos para dejarlo funcionando

1. **Variables de entorno**: define `DATABASE_URL` apuntando a Postgres,
   con un rol de aplicación (`NOBYPASSRLS` — nunca el owner/superusuario).

2. **Generar y aplicar migraciones de tablas**:
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit push
   ```

3. **Aplicar las políticas RLS** (no las genera drizzle-kit automáticamente,
   es SQL manual porque son reglas de negocio, no estructura de tablas):
   ```bash
   psql $DATABASE_URL -f src/database/migrations/0001_rls_policies.sql
   ```

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
- 🕒 **PgBouncer**: Sigue pendiente confirmar el modo *transaction pooling* al momento de ir a producción para compatibilidad con `SET LOCAL`.
