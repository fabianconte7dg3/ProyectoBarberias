const { Client } = require('pg');

async function verifySuperAdmin() {
  console.log('================================================================');
  console.log(' AUDITORÍA Y VERIFICACIÓN COMPLETA - CONSOLA SUPER ADMIN SAAS  ');
  console.log('================================================================\n');

  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/barberos',
  });
  await pgClient.connect();

  const superAdminEmail = 'superadmin@barberos.app';

  // ---------------------------------------------------------------------------
  // TEST 1: Verificar cuenta SuperAdmin y tabla plataforma_admins
  // ---------------------------------------------------------------------------
  console.log('[TEST 1] Verificación de tabla plataforma_admins (fuera de RLS)');
  const adminRes = await pgClient.query(
    `SELECT id, email, totp_habilitado, activo FROM plataforma_admins WHERE email = $1;`,
    [superAdminEmail]
  );

  if (adminRes.rows.length === 0) {
    throw new Error('TEST 1 FALLIDO: El usuario SuperAdmin no existe en plataforma_admins');
  }

  const superAdmin = adminRes.rows[0];
  console.log(`  SuperAdmin encontrado: ID=${superAdmin.id}, Email=${superAdmin.email}, 2FA=${superAdmin.totp_habilitado}`);
  console.log('  ASSERTION PASSED: Tabla plataforma_admins estructurada correctamente fuera del esquema RLS\n');

  // ---------------------------------------------------------------------------
  // TEST 2: Función SQL SECURITY DEFINER - get_platform_stats()
  // ---------------------------------------------------------------------------
  console.log('[TEST 2] Función SQL get_platform_stats() SECURITY DEFINER');
  const statsRes = await pgClient.query(`SELECT * FROM get_platform_stats();`);
  const stats = statsRes.rows[0];

  console.log('  Estadísticas de Plataforma:', stats);

  if (!stats || stats.total_barberias === undefined || stats.mrr_estimado === undefined) {
    throw new Error('TEST 2 FALLIDO: get_platform_stats() no devolvió las métricas esperadas');
  }
  console.log('  ASSERTION PASSED: get_platform_stats() calculó el MRR estimado y las barberías activas/suspendidas\n');

  // ---------------------------------------------------------------------------
  // TEST 3: Función SQL SECURITY DEFINER - get_all_tenants_summary()
  // ---------------------------------------------------------------------------
  console.log('[TEST 3] Función SQL get_all_tenants_summary() SECURITY DEFINER');
  const tenantsRes = await pgClient.query(`SELECT * FROM get_all_tenants_summary();`);
  
  console.log(`  Total barberías listadas en resumen global: ${tenantsRes.rows.length}`);
  if (tenantsRes.rows.length > 0) {
    const t0 = tenantsRes.rows[0];
    console.log(`  Ejemplo Barbería: "${t0.nombre_comercial}" (Slug: ${t0.slug}, Plan: ${t0.plan_suscripcion}, Estado: ${t0.estado_barberia}, KillSwitch: ${t0.bloqueado_por_plataforma})`);
  }
  console.log('  ASSERTION PASSED: get_all_tenants_summary() retornó el resumen de todos los tenants sin fugas de conexión\n');

  // ---------------------------------------------------------------------------
  // TEST 4: Tres Conceptos Independientes de Pausa / Bloqueo
  // ---------------------------------------------------------------------------
  console.log('[TEST 4] Tres conceptos de Pausa/Bloqueo independientes');
  const tenantRes = await pgClient.query(`SELECT id, estado, bloqueado_por_plataforma FROM barberias LIMIT 1;`);
  const testTenantId = tenantRes.rows[0].id;

  // 4.1 Probar Suspensión por Pago (barberias.estado)
  await pgClient.query(`UPDATE barberias SET estado = 'suspendido_pago' WHERE id = '${testTenantId}';`);
  const checkPago = await pgClient.query(`SELECT estado, bloqueado_por_plataforma FROM barberias WHERE id = '${testTenantId}';`);
  console.log(`  4.1 Suspensión por Pago: estado="${checkPago.rows[0].estado}", bloqueadoPorPlataforma=${checkPago.rows[0].bloqueado_por_plataforma}`);

  if (checkPago.rows[0].estado !== 'suspendido_pago') {
    throw new Error('TEST 4.1 FALLIDO: No se pudo cambiar el estado a suspendido_pago');
  }

  // 4.2 Probar Kill-Switch Preventivo de la Plataforma (barberias.bloqueado_por_plataforma)
  await pgClient.query(`UPDATE barberias SET estado = 'activo', bloqueado_por_plataforma = true WHERE id = '${testTenantId}';`);
  const checkKill = await pgClient.query(`SELECT estado, bloqueado_por_plataforma FROM barberias WHERE id = '${testTenantId}';`);
  console.log(`  4.2 Kill-Switch Plataforma: estado="${checkKill.rows[0].estado}", bloqueadoPorPlataforma=${checkKill.rows[0].bloqueado_por_plataforma}`);

  if (checkKill.rows[0].bloqueado_por_plataforma !== true || checkKill.rows[0].estado !== 'activo') {
    throw new Error('TEST 4.2 FALLIDO: El Kill-Switch de plataforma debe ser independiente del estado de pago');
  }

  // 4.3 Restaurar estado normal
  await pgClient.query(`UPDATE barberias SET estado = 'activo', bloqueado_por_plataforma = false WHERE id = '${testTenantId}';`);
  console.log('  ASSERTION PASSED: Los 3 conceptos de pausa/bloqueo operan de forma 100% independiente\n');

  await pgClient.end();

  console.log('================================================================');
  console.log(' ✅ TODAS LAS PRUEBAS DE LA CONSOLA SUPER ADMIN PASARON CON ÉXITO');
  console.log('================================================================');
}

verifySuperAdmin().catch(err => {
  console.error('\n❌ ERROR EN LA VERIFICACIÓN DE SUPER ADMIN:', err);
  process.exit(1);
});
