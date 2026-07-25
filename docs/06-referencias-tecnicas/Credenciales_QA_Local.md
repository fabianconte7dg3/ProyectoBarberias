# Credenciales de Prueba (QA Local)

> Solo para el entorno de desarrollo local (Docker `volumetrix_postgres`). **Nunca usar este patrón
> contra producción.**

## Por qué existe esto

Verificar manualmente el panel de admin o el login requería antes resetear credenciales de cuentas
reales (dev data con nombres/emails de personas reales) a ciegas. Este seed crea un tenant y usuarios
dedicados, exclusivamente de prueba, con credenciales fijas y documentadas — así no hace falta tocar
cuentas reales para verificar algo.

## Cómo aplicarlo

```bash
docker exec -i volumetrix_postgres psql -U postgres -d volumetrix \
  -f - < apps/api/src/database/seeds/seed-qa-test.sql
```

Es idempotente (usa `ON CONFLICT`), seguro correrlo cuantas veces haga falta.

## Credenciales

| Campo | Valor |
|---|---|
| Tenant (slug) | `qa-test` |
| URL local | `http://localhost:3000/qa-test/...` |
| **Admin** — email | `qa-admin@test.local` |
| **Admin** — contraseña | `QaTest1234!` |
| **Empleado** — nombre | `QA Empleado` (seleccionar desde el selector de perfil en `/admin/login`) |
| **Empleado** — PIN | `1234` |

El admin entra por `/[slug]/admin/login` → "Iniciar Sesión como Administrador (Email / Contraseña)".
El empleado entra por el mismo login → selecciona su perfil en la lista → ingresa el PIN.

## Cómo usarlo para probar multi-industria

El tenant `qa-test` arranca con `industria='barberia'`. Para probar cómo se ve otra vertical (sin tocar
código ni reiniciar nada):

```sql
UPDATE barberias
SET industria = 'veterinaria',
    terminologia_empleado = 'Veterinario',
    terminologia_servicio = 'Consulta',
    terminologia_cliente = 'Dueño de mascota'
WHERE slug = 'qa-test';
```

Recargar la página del navegador (o navegar dentro de la app) y el panel de admin y el portal de
reserva público van a mostrar la terminología nueva de inmediato — así se verificó la
[Fase 2-D](../02-arquitectura-y-db/Plan_Multi_Industria_Fase2D_TerminologiaDinamica.md).

## Nota histórica: bug de recarga dura ya corregido

Hasta el 2026-07-25, navegar directo por URL (recarga dura) a una página protegida como
`/[slug]/admin/barberos` podía redirigir incorrectamente a `/admin/login` aunque la cookie de sesión
siguiera siendo válida — una carrera de hidratación del store de Zustand (`adminStore`, persistido en
`localStorage`) contra el guard de `useAdminAuth`. Corregido en
[`useAdminAuth.ts`](../../apps/web/src/hooks/useAdminAuth.ts): el guard ya no decide "no hay sesión" en
base a que el store local esté momentáneamente vacío — solo confía en la respuesta real del servidor
(`GET /auth/me`, validado contra la cookie httpOnly). Verificado con este mismo tenant de QA: sesión
válida sobrevive la recarga dura, sesión inexistente redirige a login, y rol incorrecto redirige a
`/agenda` — los tres casos correctos en recarga dura.
