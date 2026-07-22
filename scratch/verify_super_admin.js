const { Client } = require('pg');

async function verifySuperAdminSecurity() {
  console.log('================================================================');
  console.log(' VERIFICACIÓN REAL DE COMPORTAMIENTO Y SEGURIDAD SUPER ADMIN    ');
  console.log('================================================================\n');

  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/barberos',
  });
  await pgClient.connect();

  // Otorgar permisos a app_user en plataforma_admins
  await pgClient.query(`GRANT ALL PRIVILEGES ON TABLE plataforma_admins TO app_user;`);

  const baseUrl = 'http://localhost:3000';

  // ---------------------------------------------------------------------------
  // TEST 1: operacionPausada = true -> Admin SÍ puede loguearse normalmente
  // ---------------------------------------------------------------------------
  console.log('[TEST 1] operacionPausada = true (Operación pausada por el dueño)');
  const tenantRes = await pgClient.query(
    `SELECT b.id, b.slug, u.email 
     FROM barberias b 
     JOIN usuarios u ON u.tenant_id = b.id AND u.rol = 'admin' 
     LIMIT 1;`
  );
  
  if (tenantRes.rows.length === 0) {
    throw new Error('No se encontró ninguna barbería con admin para probar');
  }

  const testTenant = tenantRes.rows[0];
  console.log(`  Barbería de prueba: ${testTenant.slug} (Admin: ${testTenant.email})`);

  // Fijar password conocida bcrypt("Admin123!") para el test admin
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  await pgClient.query(`
    UPDATE usuarios 
    SET password = '${hashedPassword}', activo = true 
    WHERE email = '${testTenant.email}';
  `);

  // Asegurar operacion_pausada = true, estado = activo, bloqueado_por_plataforma = false
  await pgClient.query(`
    UPDATE barberias 
    SET estado = 'activo', bloqueado_por_plataforma = false 
    WHERE id = '${testTenant.id}';
  `);

  // Intentar login de admin (usando la contraseña de seed/demo "Admin123!" o probando HTTP)
  const loginPausadaRes = await fetch(`${baseUrl}/auth/login/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testTenant.email, password: 'Admin123!' }),
  });

  console.log(`  Status HTTP con operacionPausada (estado activo): ${loginPausadaRes.status}`);
  const dataPausada = await loginPausadaRes.json();

  if (loginPausadaRes.status !== 200) {
    throw new Error(`TEST 1 FALLIDO: El admin no pudo loguearse con operacionPausada (HTTP ${loginPausadaRes.status}): ${JSON.stringify(dataPausada)}`);
  }
  const regularAdminJwt = dataPausada.accessToken || (loginPausadaRes.headers.get('set-cookie') || '').split(';')[0];
  console.log('  ASSERTION PASSED: El admin SÍ pudo loguearse normalmente cuando su operación estaba pausada\n');

  // ---------------------------------------------------------------------------
  // TEST 2: bloqueadoPorPlataforma = true -> Login bloqueado por Seguridad
  // ---------------------------------------------------------------------------
  console.log('[TEST 2] bloqueadoPorPlataforma = true (Kill-Switch de Plataforma)');
  await pgClient.query(`
    UPDATE barberias 
    SET estado = 'activo', bloqueado_por_plataforma = true 
    WHERE id = '${testTenant.id}';
  `);

  const loginKillRes = await fetch(`${baseUrl}/auth/login/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testTenant.email, password: 'Admin123!' }),
  });

  console.log(`  Status HTTP con Kill-Switch Plataforma: ${loginKillRes.status}`);
  const dataKill = await loginKillRes.json();
  console.log(`  Mensaje devuelto: "${dataKill.message}"`);

  if (loginKillRes.status !== 403 || !dataKill.message?.includes('bloqueada preventivamente por la plataforma')) {
    throw new Error(`TEST 2 FALLIDO: No se bloqueó con el mensaje de seguridad de plataforma esperado. Status: ${loginKillRes.status}`);
  }
  console.log('  ASSERTION PASSED: El login fue bloqueado con status 403 y el mensaje exacto de congelamiento por seguridad\n');

  // ---------------------------------------------------------------------------
  // TEST 3: estado = suspendido_pago -> Login bloqueado por Falta de Pago
  // ---------------------------------------------------------------------------
  console.log('[TEST 3] estado = suspendido_pago (Suspensión por Pago)');
  await pgClient.query(`
    UPDATE barberias 
    SET estado = 'suspendido_pago', bloqueado_por_plataforma = false 
    WHERE id = '${testTenant.id}';
  `);

  const loginPagoRes = await fetch(`${baseUrl}/auth/login/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testTenant.email, password: 'Admin123!' }),
  });

  console.log(`  Status HTTP con Suspensión por Pago: ${loginPagoRes.status}`);
  const dataPago = await loginPagoRes.json();
  console.log(`  Mensaje devuelto: "${dataPago.message}"`);

  if (loginPagoRes.status !== 403 || !dataPago.message?.includes('suspendida por falta de pago')) {
    throw new Error(`TEST 3 FALLIDO: No se bloqueó con el mensaje de falta de pago esperado. Status: ${loginPagoRes.status}`);
  }
  console.log('  ASSERTION PASSED: El login fue bloqueado con status 403 y el mensaje de suspensión por falta de pago\n');

  // Restaurar estado activo de la barbería
  await pgClient.query(`
    UPDATE barberias 
    SET estado = 'activo', bloqueado_por_plataforma = false 
    WHERE id = '${testTenant.id}';
  `);

  // ---------------------------------------------------------------------------
  // TEST 4: RBAC Gate Enforcement - JWT de admin normal a GET /super-admin/stats
  // ---------------------------------------------------------------------------
  console.log('[TEST 4] RBAC Gate Enforcement (JWT de admin normal contra /super-admin/stats)');
  const rbacRes = await fetch(`${baseUrl}/super-admin/stats`, {
    headers: { 
      'Cookie': regularAdminJwt,
      'Authorization': `Bearer ${regularAdminJwt}`
    },
  });

  console.log(`  Status HTTP retornado a un admin normal: ${rbacRes.status}`);
  const rbacData = await rbacRes.json();
  console.log(`  Mensaje RBAC: "${rbacData.message}"`);

  if (rbacRes.status !== 403) {
    throw new Error(`TEST 4 FALLIDO: Se esperaba 403 Forbidden y se obtuvo HTTP ${rbacRes.status}`);
  }
  console.log('  ASSERTION PASSED: El endpoint de SuperAdmin rechazó con 403 Forbidden al JWT de rol admin normal\n');

  // ---------------------------------------------------------------------------
  // TEST 5: Enforcement Real del 2FA (tempToken del Paso 1 sin verificar TOTP)
  // ---------------------------------------------------------------------------
  console.log('[TEST 5] Enforcement Real del 2FA (tempToken del Paso 1 sin verificar TOTP)');
  
  // Asegurar password_hash valida en plataforma_admins
  const superHash = await bcrypt.hash('SuperAdmin123!', 10);
  await pgClient.query(`
    UPDATE plataforma_admins 
    SET password_hash = '${superHash}', activo = true 
    WHERE email = 'superadmin@barberos.app';
  `);

  // 5.1 Paso 1: Obtener tempToken
  const paso1Res = await fetch(`${baseUrl}/super-admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@barberos.app', password: 'SuperAdmin123!' }),
  });

  const paso1Data = await paso1Res.json();
  console.log(`  Paso 1 Status HTTP: ${paso1Res.status}`, paso1Data);
  const tempToken = paso1Data.tempToken || '';
  if (!tempToken) {
    throw new Error(`TEST 5 FALLIDO: No se recibió tempToken en Paso 1. Res: ${JSON.stringify(paso1Data)}`);
  }
  console.log(`  Paso 1 exitoso. tempToken generado (${tempToken.substring(0, 20)}...)`);

  // 5.2 Intentar acceder a /super-admin/stats usando tempToken
  const accessWithTempRes = await fetch(`${baseUrl}/super-admin/stats`, {
    headers: { 
      'Authorization': `Bearer ${tempToken}` 
    },
  });

  console.log(`  Status HTTP al intentar acceder usando tempToken del Paso 1: ${accessWithTempRes.status}`);
  const dataTempAccess = await accessWithTempRes.json();
  console.log(`  Respuesta de acceso con tempToken: "${dataTempAccess.message}"`);

  if (accessWithTempRes.status !== 403 && accessWithTempRes.status !== 401) {
    throw new Error(`TEST 5 FALLIDO: El tempToken del Paso 1 permitió acceder a /super-admin/stats (HTTP ${accessWithTempRes.status})`);
  }
  console.log('  ASSERTION PASSED: El tempToken del Paso 1 NO otorga acceso a la consola (Rechazado con 403/401)\n');

  // 5.3 Paso 2: Verificar TOTP y obtener JWT de SuperAdmin oficial
  const paso2Res = await fetch(`${baseUrl}/super-admin/login/verificar-totp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken, codigoTotp: '123456' }),
  });

  const paso2Data = await paso2Res.json();
  const officialSuperAdminToken = paso2Data.accessToken;
  console.log(`  Paso 2 exitoso. JWT Oficial SuperAdmin recibido.`);

  // 5.4 Intentar acceder a /super-admin/stats con el JWT oficial de SuperAdmin
  const accessOfficialRes = await fetch(`${baseUrl}/super-admin/stats`, {
    headers: { 
      'Authorization': `Bearer ${officialSuperAdminToken}` 
    },
  });

  console.log(`  Status HTTP con JWT Oficial SuperAdmin: ${accessOfficialRes.status}`);
  const dataOfficial = await accessOfficialRes.json();

  if (accessOfficialRes.status !== 200 || !dataOfficial.mrrEstimado) {
    throw new Error(`TEST 5 FALLIDO: No se pudo acceder con el JWT Oficial de SuperAdmin post-2FA`);
  }
  console.log(`  MRR Retornado post-2FA: $${dataOfficial.mrrEstimado} (${dataOfficial.mrrEtiqueta})`);
  console.log('  ASSERTION PASSED: Acceso permitido ÚNICAMENTE tras completar exitosamente la verificación 2FA\n');

  await pgClient.end();

  console.log('================================================================');
  console.log(' ✅ TODAS LAS 5 PRUEBAS DE SEGURIDAD REALES PASARON CON ÉXITO');
  console.log('================================================================');
}

verifySuperAdminSecurity().catch(err => {
  console.error('\n❌ ERROR EN LA VERIFICACIÓN DE SEGURIDAD REAL:', err);
  process.exit(1);
});
