-- Elimina el SuperAdmin con credenciales hardcodeadas y públicamente conocidas
-- (superadmin@barberos.app / SuperAdmin123!, TOTP fijo 'JBSWY3DPEHPK3PXP') que
-- 0007_superadmin.sql sembraba antes vía INSERT directo, y que scratch/seed_superadmin_user.js
-- podía re-sembrar con un hash distinto (bcrypt salado) pero la misma password en texto plano.
-- Ese seed neutralizaba el wizard de primer arranque en cualquier instalación nueva (ver nota
-- en 0007_superadmin.sql). Match por email solamente (no por hash exacto): la password en
-- texto plano de esta cuenta es pública (está en el historial de git y en el script de
-- scratch/), así que cualquier fila con este email es una cuenta comprometida sin importar el
-- salt del hash vigente. Idempotente: no falla si la fila ya no existe.
DELETE FROM plataforma_admins
WHERE email = 'superadmin@barberos.app';
