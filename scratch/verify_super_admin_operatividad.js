const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function verifySuperAdminOperatividad() {
  console.log('================================================================');
  console.log(' AUDITORÍA Y VERIFICACIÓN DE OPERATIVIDAD Y ONBOARDING ASISTIDO');
  console.log('================================================================\n');

  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/barberos',
  });
  await pgClient.connect();

  const baseUrl = 'http://localhost:3000';

  // 1. Obtener SuperAdmin JWT
  const login1Res = await fetch(`${baseUrl}/super-admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@barberos.app', password: 'SuperAdmin123!' }),
  });
  const data1 = await login1Res.json();

  const login2Res = await fetch(`${baseUrl}/super-admin/login/verificar-totp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken: data1.tempToken, codigoTotp: '123456' }),
  });
  const data2 = await login2Res.json();
  const superJwt = data2.accessToken;

  // ---------------------------------------------------------------------------
  // TEST 0: Verificar Rechazo de Bypass 2FA con tempToken (type: mfa_pending)
  // ---------------------------------------------------------------------------
  console.log('[TEST 0] Verificar Rechazo de Bypass 2FA con tempToken (mfa_pending)');
  const bypassRes = await fetch(`${baseUrl}/super-admin/stats`, {
    headers: { 'Authorization': `Bearer ${data1.tempToken}` },
  });
  console.log(`  Status HTTP al usar tempToken en endpoint protegido: ${bypassRes.status}`);
  if (bypassRes.status !== 401) {
    throw new Error(`TEST 0 FALLIDO: SuperAdminGuard debió rechazar tempToken con 401. Status: ${bypassRes.status}`);
  }
  console.log('  ASSERTION PASSED: SuperAdminGuard rechazó exitosamente el tempToken de 2FA pendiente\n');

  const testSlug = 'barberia-master-' + Math.random().toString(36).substring(2, 7);
  const testEmail = `owner_${Math.random().toString(36).substring(2, 7)}@mastertech.com`;

  // ---------------------------------------------------------------------------
  // TEST 1: Onboarding Asistido (POST /super-admin/tenants) con runInTenantScope
  // ---------------------------------------------------------------------------
  console.log('[TEST 1] Onboarding Asistido (Creación manual de barbería)');
  const createRes = await fetch(`${baseUrl}/super-admin/tenants`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${superJwt}`
    },
    body: JSON.stringify({
      nombreComercial: 'Barbería Master Tech',
      slug: testSlug,
      adminNombre: 'Carlos Master',
      adminEmail: testEmail,
      planId: 'basico',
    }),
  });

  console.log(`  Status HTTP de creación asistida: ${createRes.status}`);
  const createData = await createRes.json();

  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(`TEST 1 FALLIDO: No se pudo crear la barbería (HTTP ${createRes.status}): ${JSON.stringify(createData)}`);
  }

  const { tenantId, activationToken, activationUrl } = createData;
  console.log(`  Barbería Creada: ID=${tenantId}, Slug=${testSlug}`);
  console.log(`  Activation Token: ${activationToken}`);
  console.log(`  Activation URL: ${activationUrl}`);

  // Verificar en BD que el admin nació inactivo (activo = false)
  const userCheck = await pgClient.query(`SELECT id, activo, token_activacion FROM usuarios WHERE email = $1;`, [testEmail]);
  if (userCheck.rows[0].activo !== false || !userCheck.rows[0].token_activacion) {
    throw new Error('TEST 1 FALLIDO: El usuario admin debe nacer con activo = false y token_activacion seteadas.');
  }

  // Intento de login del dueño ANTES de activar -> Debe ser rechazado
  const preLoginRes = await fetch(`${baseUrl}/auth/login/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'CualquierPassword!' }),
  });
  console.log(`  Status HTTP al intentar loguearse sin activar: ${preLoginRes.status}`);
  if (preLoginRes.status !== 401) {
    throw new Error('TEST 1 FALLIDO: El login de una cuenta no activada debió ser rechazado con 401');
  }
  console.log('  ASSERTION PASSED: Barbería creada en RLS scope y cuenta de admin nace inactiva sin contraseña expuesta\n');

  // ---------------------------------------------------------------------------
  // TEST 2: Prueba de Token Expirado (72h)
  // ---------------------------------------------------------------------------
  console.log('[TEST 2] Token de Activación Expirado (> 72 horas)');
  // Forzar fecha de expiración en el pasado
  await pgClient.query(`UPDATE usuarios SET token_expira_en = NOW() - INTERVAL '1 hour' WHERE email = $1;`, [testEmail]);

  const expiredRes = await fetch(`${baseUrl}/super-admin/activar-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: activationToken, passwordNueva: 'MiPasswordSecreta123!' }),
  });

  console.log(`  Status HTTP con token expirado: ${expiredRes.status}`);
  const expiredData = await expiredRes.json();
  console.log(`  Mensaje devuelto: "${expiredData.message}"`);

  if (expiredRes.status !== 400 || !expiredData.message?.includes('expirado')) {
    throw new Error(`TEST 2 FALLIDO: Se esperaba 400 Bad Request por token expirado. Status: ${expiredRes.status}`);
  }
  console.log('  ASSERTION PASSED: Un token con más de 72h es rechazado automáticamente por expiración\n');

  // ---------------------------------------------------------------------------
  // TEST 3: Activación Exitosa del Dueño y Login con Contraseña Privada
  // ---------------------------------------------------------------------------
  console.log('[TEST 3] Activación Exitosa con Token Válido');
  // Restaurar token válido en BD
  const validToken = 'valid_token_' + Math.random().toString(36).substring(2, 7);
  await pgClient.query(`UPDATE usuarios SET token_activacion = $1, token_expira_en = NOW() + INTERVAL '72 hours' WHERE email = $2;`, [validToken, testEmail]);

  const activateRes = await fetch(`${baseUrl}/super-admin/activar-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: validToken, passwordNueva: 'MiPasswordSuperPrivada123!' }),
  });

  console.log(`  Status HTTP de activación válida: ${activateRes.status}`);
  const activateData = await activateRes.json();
  if (activateRes.status !== 200 && activateRes.status !== 201) {
    throw new Error(`TEST 3 FALLIDO: No se pudo activar la cuenta: ${JSON.stringify(activateData)}`);
  }

  // Verificar que ahora SÍ logra iniciar sesión con su contraseña privada
  const postLoginRes = await fetch(`${baseUrl}/auth/login/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'MiPasswordSuperPrivada123!' }),
  });

  console.log(`  Status HTTP de login del dueño post-activación: ${postLoginRes.status}`);
  const postLoginData = await postLoginRes.json();
  console.log(`  postLoginData devuelto:`, postLoginData);
  if (postLoginRes.status !== 200 || !postLoginData.accessToken) {
    throw new Error(`TEST 3 FALLIDO: El dueño no pudo iniciar sesión tras activar su cuenta (HTTP ${postLoginRes.status}): ${JSON.stringify(postLoginData)}`);
  }
  const ownerJwt = postLoginData.accessToken;
  console.log('  ASSERTION PASSED: El dueño estableció su propia contraseña y activó su cuenta exitosamente\n');

  // ---------------------------------------------------------------------------
  // TEST 4: Enforcement Real de limiteBarberos por Plan (Plan Básico = 3)
  // ---------------------------------------------------------------------------
  console.log('[TEST 4] Enforcement Real de limiteBarberos por Plan');
  // En Plan Básico el límite es 3 barberos. Vamos a agregar barberos hasta superar el cupo.
  for (let i = 1; i <= 3; i++) {
    const inviteRes = await fetch(`${baseUrl}/usuarios/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerJwt}`
      },
      body: JSON.stringify({
        nombreCompleto: `Barbero ${i}`,
        rol: 'barbero',
      }),
    });
    console.log(`  Invitando barbero ${i}: HTTP ${inviteRes.status}`);
  }

  // Intentar invitar el 4to barbero (Supera el límite de 3 del plan básico)
  const inviteExcessRes = await fetch(`${baseUrl}/usuarios/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerJwt}`
    },
    body: JSON.stringify({
      nombreCompleto: 'Barbero 4 Excesivo',
      rol: 'barbero',
    }),
  });

  console.log(`  Status HTTP al intentar invitar barbero en exceso: ${inviteExcessRes.status}`);
  const excessData = await inviteExcessRes.json();
  console.log(`  Mensaje devuelto: "${excessData.message}"`);

  if (inviteExcessRes.status !== 400 || !excessData.message?.includes('límite')) {
    throw new Error(`TEST 4 FALLIDO: Se esperaba rechazo 400 Bad Request por cupo alcanzado. Status: ${inviteExcessRes.status}`);
  }
  console.log('  ASSERTION PASSED: El sistema rechazó la invitación al alcanzar el limiteBarberos del plan\n');

  // ---------------------------------------------------------------------------
  // TEST 5: Inspección de Detalle por Tenant con RLS Scope & Audit Logs
  // ---------------------------------------------------------------------------
  console.log('[TEST 5] Inspección de Detalle por Tenant con Audit Logs');
  
  // Ejecutar cambios de plan/estado por SuperAdmin para generar audit logs
  const resPlan = await fetch(`${baseUrl}/super-admin/tenants/${tenantId}/plan`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superJwt}` },
    body: JSON.stringify({ plan: 'premium' }),
  });
  console.log(`  Status PATCH plan: ${resPlan.status}`);

  const resEstado = await fetch(`${baseUrl}/super-admin/tenants/${tenantId}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superJwt}` },
    body: JSON.stringify({ estado: 'suspendido_pago' }),
  });
  console.log(`  Status PATCH estado: ${resEstado.status}`);

  // Consultar la vista de detalle
  const detailRes = await fetch(`${baseUrl}/super-admin/tenants/${tenantId}`, {
    headers: { 'Authorization': `Bearer ${superJwt}` },
  });

  console.log(`  Status HTTP de consulta de detalle: ${detailRes.status}`);
  const detailData = await detailRes.json();

  if (detailRes.status !== 200 || !detailData.barberia || !detailData.staff) {
    throw new Error('TEST 5 FALLIDO: No se pudo consultar la vista de detalle del tenant.');
  }

  console.log(`  Nombre Barbería: "${detailData.barberia.nombreComercial}"`);
  console.log(`  Staff Listado: ${detailData.staff.length} integrantes`);
  console.log(`  Estado WhatsApp: "${detailData.whatsappConfig.estado}"`);
  console.log(`  Audit Logs Registrados: ${detailData.auditLogs.length} eventos`);

  if (detailData.auditLogs.length === 0) {
    throw new Error('TEST 5 FALLIDO: Los audit logs del tenant deben contener los eventos de cambio de estado y plan.');
  }

  console.log('  ASSERTION PASSED: La inspección detallada retornó el staff, WhatsApp status y el historial de auditoría inmutable\n');

  await pgClient.end();

  console.log('================================================================');
  console.log(' ✅ TODAS LAS 5 PRUEBAS DE OPERATIVIDAD REAL PASARON CON ÉXITO');
  console.log('================================================================');
}

verifySuperAdminOperatividad().catch(err => {
  console.error('\n❌ ERROR EN LA VERIFICACIÓN DE OPERATIVIDAD:', err);
  process.exit(1);
});
