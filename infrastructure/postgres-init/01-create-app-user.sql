-- Provisiona el rol de aplicacion `app_user` en un Postgres nuevo (volumen vacio).
--
-- Postgres solo ejecuta los scripts de /docker-entrypoint-initdb.d en el primer
-- arranque de un volumen de datos vacio (mecanismo nativo de la imagen oficial) —
-- no corre de nuevo en el volumen local ya existente del equipo, y no reemplaza
-- ninguna migracion real.
--
-- Por que hace falta: CREATE ROLE app_user esta documentado (comentado, nunca
-- ejecutado) en apps/api/src/database/migrations/0001_rls_policies.sql:94 — se
-- corrio a mano una sola vez contra el Postgres local hace tiempo, y por eso
-- `docker exec volumetrix_postgres psql ...` funciona en dev, pero cualquier
-- Postgres realmente nuevo (runner de CI, o un volumen de produccion recien
-- creado) no tiene el rol: cualquier GRANT ... TO app_user de las migraciones
-- (ej. 0003_financiero.sql) falla con "role app_user does not exist".
--
-- Password identica a la ya versionada en infrastructure/pgbouncer-test/userlist.txt
-- y usada por apps/api/.env / apps/api/test/integration/setup/test-db.ts — no es un
-- secreto nuevo, es la credencial de dev/test que ya vive en el repo.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_password' NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;
