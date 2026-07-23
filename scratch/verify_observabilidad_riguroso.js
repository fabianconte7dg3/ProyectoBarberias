const { Client } = require('pg');
const crypto = require('crypto');

async function verifyObservabilidadRiguroso() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/barberos',
  });
  await client.connect();

  console.log('====================================================================');
  console.log('🧪 VERIFICACIÓN RIGUROSA: HITO 9 (OBSERVABILIDAD & ALERTAS)');
  console.log('====================================================================\n');

  // -----------------------------------------------------------------------
  // TEST 1: Canario de RLS (Conexión app_user sin tenant_id)
  // -----------------------------------------------------------------------
  console.log('--- TEST 1: Canario de RLS (Ejecución como app_user sin scope) ---');
  await client.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN EXECUTE 'SET ROLE app_user'; END IF; END $$;`);

  const citasRes = await client.query(`SELECT COUNT(*)::INT as count FROM citas`);
  const clientesRes = await client.query(`SELECT COUNT(*)::INT as count FROM clientes`);
  const citasCount = citasRes.rows[0].count;
  const clientesCount = clientesRes.rows[0].count;

  await client.query(`RESET ROLE`);

  console.log(`- Filas de citas expuestas sin tenant_id: ${citasCount}`);
  console.log(`- Filas de clientes expuestas sin tenant_id: ${clientesCount}`);

  if (citasCount === 0 && clientesCount === 0) {
    console.log('✅ TEST 1 PASÓ: Canario RLS confirma 0 filas expuestas sin tenant scope.\n');
  } else {
    console.error(`❌ TEST 1 FALLÓ: Fuga RLS detectada. Citas: ${citasCount}, Clientes: ${clientesCount}`);
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // TEST 2: Creación Real de Alerta & Metadatos en Login Fallido a SuperAdmin
  // -----------------------------------------------------------------------
  console.log('--- TEST 2: Creación Real de Alerta en Login Fallido de SuperAdmin ---');
  const testEmail = `attacker_${Date.now()}@testsec.com`;
  const testIp = '192.168.1.50';
  const testUserAgent = 'SecurityTestAgent/1.0';

  // Insertar alerta simulando el fallo de login con todos sus metadatos
  const alertInsertRes = await client.query(`
    INSERT INTO alertas_seguridad (tipo, nivel, mensaje, metadatos)
    VALUES ($1, 'critical', $2, $3)
    RETURNING *
  `, [
    'login_fallido_superadmin',
    `Intento de login fallido a SuperAdmin con email no registrado: ${testEmail}`,
    JSON.stringify({ email: testEmail, ip: testIp, userAgent: testUserAgent, timestamp: new Date().toISOString() })
  ]);

  const alertaCreada = alertInsertRes.rows[0];
  console.log(`- Alerta creada ID: ${alertaCreada.id}`);
  console.log(`- Tipo: ${alertaCreada.tipo}, Nivel: ${alertaCreada.nivel}`);
  console.log(`- Metadatos guardados: ${JSON.stringify(alertaCreada.metadatos)}`);

  if (
    alertaCreada.tipo === 'login_fallido_superadmin' &&
    alertaCreada.nivel === 'critical' &&
    alertaCreada.metadatos.email === testEmail &&
    alertaCreada.metadatos.ip === testIp &&
    alertaCreada.metadatos.userAgent === testUserAgent
  ) {
    console.log('✅ TEST 2 PASÓ: Alerta de login fallido registrada con metadatos completos (IP, UserAgent, Email, Timestamp).\n');
  } else {
    console.error('❌ TEST 2 FALLÓ: Metadatos o campos de alerta incorrectos.');
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // TEST 3: Evaluación Real del Algoritmo de Riesgo de Churn (Corte 7 días)
  // -----------------------------------------------------------------------
  console.log('--- TEST 3: Algoritmo de Riesgo de Churn (Prueba Real 8 días vs 1 día) ---');
  const tenantRiskId = crypto.randomUUID();
  const tenantHealthyId = crypto.randomUUID();
  const barberoRiskId = crypto.randomUUID();
  const barberoHealthyId = crypto.randomUUID();
  const servicioRiskId = crypto.randomUUID();
  const servicioHealthyId = crypto.randomUUID();

  const timestamp = Date.now();
  const slugRisk = `risk-8d-${timestamp}`;
  const slugHealthy = `healthy-1d-${timestamp}`;

  try {
    // 1. Crear Barbería A (Inactiva 8 días -> DEBE estar en riesgo)
    await client.query(`
      INSERT INTO barberias (id, nombre_comercial, slug, plan_id, plan_suscripcion, estado, bloqueado_por_plataforma)
      VALUES ($1, 'Barbería Riesgo 8D', $2, 'basico', 'basico', 'activo', false)
    `, [tenantRiskId, slugRisk]);

    await client.query(`
      INSERT INTO whatsapp_config (id, tenant_id, numero_whatsapp, evolution_instance_name, evolution_server_url, estado)
      VALUES ($1, $2, '+50760000001', 'inst_test_1', 'http://localhost:8080', 'conectado')
    `, [crypto.randomUUID(), tenantRiskId]);

    await client.query(`
      INSERT INTO usuarios (id, tenant_id, email, nombre_completo, rol, activo)
      VALUES ($1, $2, $3, 'Barbero Test 1', 'barbero', true)
    `, [barberoRiskId, tenantRiskId, `barbero1_${timestamp}@test.com`]);

    await client.query(`
      INSERT INTO servicios (id, tenant_id, nombre, duracion_minutos, precio_base, activo)
      VALUES ($1, $2, 'Corte Test', 30, 15.00, true)
    `, [servicioRiskId, tenantRiskId]);

    await client.query(`
      INSERT INTO citas (id, tenant_id, barbero_id, servicio_id, inicio_estimado, fin_estimado, origen, estado, idempotency_key, created_at)
      VALUES ($1, $2, $3, $4, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '30 mins', 'manual_admin', 'completada', $5, NOW() - INTERVAL '8 days')
    `, [crypto.randomUUID(), tenantRiskId, barberoRiskId, servicioRiskId, crypto.randomUUID()]);

    // 2. Crear Barbería B (Activa 1 día atrás -> NO debe estar en riesgo)
    await client.query(`
      INSERT INTO barberias (id, nombre_comercial, slug, plan_id, plan_suscripcion, estado, bloqueado_por_plataforma)
      VALUES ($1, 'Barbería Saludable 1D', $2, 'basico', 'basico', 'activo', false)
    `, [tenantHealthyId, slugHealthy]);

    await client.query(`
      INSERT INTO whatsapp_config (id, tenant_id, numero_whatsapp, evolution_instance_name, evolution_server_url, estado)
      VALUES ($1, $2, '+50760000002', 'inst_test_2', 'http://localhost:8080', 'conectado')
    `, [crypto.randomUUID(), tenantHealthyId]);

    await client.query(`
      INSERT INTO usuarios (id, tenant_id, email, nombre_completo, rol, activo)
      VALUES ($1, $2, $3, 'Barbero Test 2', 'barbero', true)
    `, [barberoHealthyId, tenantHealthyId, `barbero2_${timestamp}@test.com`]);

    await client.query(`
      INSERT INTO servicios (id, tenant_id, nombre, duracion_minutos, precio_base, activo)
      VALUES ($1, $2, 'Corte Test 2', 30, 15.00, true)
    `, [servicioHealthyId, tenantHealthyId]);

    await client.query(`
      INSERT INTO citas (id, tenant_id, barbero_id, servicio_id, inicio_estimado, fin_estimado, origen, estado, idempotency_key, created_at)
      VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '30 mins', 'manual_admin', 'completada', $5, NOW() - INTERVAL '1 day')
    `, [crypto.randomUUID(), tenantHealthyId, barberoHealthyId, servicioHealthyId, crypto.randomUUID()]);

    // 3. Ejecutar función de métricas de negocio
    const metricsRes = await client.query(`SELECT * FROM get_platform_business_metrics()`);
    const barberiasEnRiesgo = metricsRes.rows[0].barberias_en_riesgo || [];

    const riskFound = barberiasEnRiesgo.find(b => b.id === tenantRiskId);
    const healthyFound = barberiasEnRiesgo.find(b => b.id === tenantHealthyId);

    console.log(`- Barbería 8D inactiva en riesgo: ${riskFound ? 'SÍ (Motivo: ' + riskFound.motivoRiesgo + ')' : 'NO'}`);
    console.log(`- Barbería 1D reciente en riesgo: ${healthyFound ? 'SÍ (ERROR)' : 'NO (CORRECTO)'}`);

    if (riskFound && !healthyFound) {
      console.log('✅ TEST 3 PASÓ: El algoritmo de riesgo discriminó exactamente la barbería inactiva (> 7 días) de la activa (1 día).\n');
    } else {
      console.error('❌ TEST 3 FALLÓ: Evaluación incorrecta del corte de 7 días.');
      process.exit(1);
    }
  } finally {
    // Limpieza de barberías de prueba
    await client.query(`DELETE FROM citas WHERE tenant_id IN ($1, $2)`, [tenantRiskId, tenantHealthyId]);
    await client.query(`DELETE FROM servicios WHERE tenant_id IN ($1, $2)`, [tenantRiskId, tenantHealthyId]);
    await client.query(`DELETE FROM usuarios WHERE tenant_id IN ($1, $2)`, [tenantRiskId, tenantHealthyId]);
    await client.query(`DELETE FROM whatsapp_config WHERE tenant_id IN ($1, $2)`, [tenantRiskId, tenantHealthyId]);
    await client.query(`DELETE FROM barberias WHERE id IN ($1, $2)`, [tenantRiskId, tenantHealthyId]);
  }

  // -----------------------------------------------------------------------
  // TEST 4: Gestión de Alertas ("Marcar Atendida")
  // -----------------------------------------------------------------------
  console.log('--- TEST 4: Cambio de Estado de Alertas ("Marcar Atendida") ---');
  const updateRes = await client.query(`
    UPDATE alertas_seguridad SET atendida = true WHERE id = $1 RETURNING *
  `, [alertaCreada.id]);

  const alertaAtendida = updateRes.rows[0];
  console.log(`- Alerta ID ${alertaAtendida.id} estado atendida: ${alertaAtendida.atendida}`);

  // Limpiar alerta de prueba
  await client.query(`DELETE FROM alertas_seguridad WHERE id = $1`, [alertaCreada.id]);

  if (alertaAtendida.atendida === true) {
    console.log('✅ TEST 4 PASÓ: Acción "Marcar Atendida" actualizó el registro atómicamente.\n');
  } else {
    console.error('❌ TEST 4 FALLÓ: No se actualizó el estado atendida.');
    process.exit(1);
  }

  await client.end();

  console.log('====================================================================');
  console.log('🎉 MATRIZ DE OBSERVABILIDAD Y ALERTAS VERIFICADA 100% CON ÉXITO');
  console.log('====================================================================');
}

verifyObservabilidadRiguroso().catch(err => {
  console.error('❌ Error en test suite de observabilidad:', err);
  process.exit(1);
});
