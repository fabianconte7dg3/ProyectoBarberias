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

6. **En cualquier service**, usa `TenantContext.getDb()` en vez de inyectar
   el pool de Drizzle directamente. Ver `citas.service.ts` como ejemplo.

## Puntos de atención pendientes

- **Rol de Postgres**: crear el `app_user` con `NOBYPASSRLS` y revocar
  `UPDATE`/`DELETE` en `transacciones` y `audit_logs` (son append-only según
  tu ERD) — el `DO NOT` está comentado al final de `0001_rls_policies.sql`,
  falta ejecutarlo con las credenciales reales.
- **`idempotency_key` en `citas`**: ya está como `UNIQUE` en el schema, pero
  falta la lógica de servicio que la genere y maneje el conflicto (Error #12
  de tu documentación: doble cobro por doble-click).
- **PgBouncer**: confirmar modo *transaction pooling* al configurarlo — es
  compatible con `SET LOCAL`, pero *session pooling* no lo es de forma segura.
- **Endpoints del bot de WhatsApp**: si el bot llama al backend sin JWT de
  usuario (webhook de Evolution API), el `tenantId` deberá resolverse por
  otro medio (ej. el número de WhatsApp de destino → `whatsapp_config`) antes
  de entrar al mismo patrón de `TenantContext.run(...)`.
