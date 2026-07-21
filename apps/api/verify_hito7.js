const assert = require('assert');
const crypto = require('crypto');

const API_URL = 'http://localhost:3000';

async function runTest() {
  console.log('--- Verificación Hito 7: Auditoría y Kill Switch ---');
  let adminToken = '';
  let tenantId = '';

  try {
    const hash = crypto.randomBytes(4).toString('hex');
    const email = `admin_${hash}@hito7.com`;
    const password = 'password123';
    
    console.log('Registrando tenant...');
    await fetch(`${API_URL}/auth/barberias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombreComercial: 'Barberia Hito 7',
        slug: `hito7-${hash}`,
        adminNombreCompleto: 'Admin Hito 7',
        adminEmail: email,
        adminPassword: password
      })
    });

    // 1. Login admin
    console.log('Autenticando admin...');
    const loginRes = await fetch(`${API_URL}/auth/login/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error('Login failed: ' + JSON.stringify(loginData));
    adminToken = loginData.accessToken;
    
    // Obtener tenantId del token
    const payload = JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64').toString());
    tenantId = payload.tenantId;
    console.log(`✅ Login OK (Tenant: ${tenantId})`);

    // 2. Activar Kill Switch
    console.log('\\n[TEST] Activando Kill Switch...');
    const killRes = await fetch(`${API_URL}/usuarios/configuracion/kill-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ activo: true })
    });
    const killData = await killRes.json();
    console.log('Respuesta:', killData);
    assert.strictEqual(killData.killSwitchActivo, true);

    // 3. Probar Operación GET (Lectura) - Debe FUNCIONAR
    console.log('\\n[TEST] Probando GET /usuarios (Lectura)...');
    const getRes = await fetch(`${API_URL}/usuarios`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ GET exitoso. Código: ${getRes.status}`);
    assert.strictEqual(getRes.status, 200);

    // 4. Probar Operación POST (Escritura) - Debe FALLAR (503)
    console.log('\\n[TEST] Probando POST /citas (Escritura)...');
    const postRes = await fetch(`${API_URL}/citas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        clienteNombre: 'Test',
        clienteTelefono: '1111111',
        barberoId: '00000000-0000-0000-0000-000000000000',
        servicioId: '00000000-0000-0000-0000-000000000000',
        inicio: new Date().toISOString()
      })
    });
    const postData = await postRes.json();
    console.log(`✅ POST bloqueado con éxito. Código: ${postRes.status}`);
    console.log('   Mensaje:', postData.message);
    assert.strictEqual(postRes.status, 503);

    // 5. Desactivar Kill Switch
    console.log('\\n[TEST] Desactivando Kill Switch...');
    await fetch(`${API_URL}/usuarios/configuracion/kill-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ activo: false })
    });
    console.log('✅ Kill Switch desactivado');

    // 6. Probar Caja Descuadrada y Log de Auditoría
    console.log('\\n[TEST] Probando Cierre de Caja con Descuadre (Auditoría)...');
    const cajaRes = await fetch(`${API_URL}/caja/cerrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ efectivoDeclarado: 50.00, notasAdmin: "Falta vuelto" })
    });
    const cajaData = await cajaRes.json();
    console.log('✅ Cierre de caja registrado. Estado:', cajaData.estado);
    assert.strictEqual(cajaData.estado, 'sobrante');
    
    console.log('\\n[TEST] Buscando registro en audit_logs...');
    const { Pool } = require('pg');
    const pool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'barberos',
      password: 'password',
      port: 5432,
    });

    const auditRes = await pool.query(
      "SELECT * FROM audit_logs WHERE tabla_afectada = 'cierres_de_caja' ORDER BY created_at DESC LIMIT 1"
    );
    
    if (auditRes.rows.length > 0) {
      const log = auditRes.rows[0];
      console.log(`✅ Registro de auditoría encontrado! Accion: ${log.accion}`);
      console.log(`   Payload Antes:`, log.payload_antes);
      console.log(`   Payload Despues:`, log.payload_despues);
      assert.strictEqual(log.accion, 'cierre_emergencia');
    } else {
      throw new Error('No se encontró registro de auditoría en audit_logs');
    }
    
    await pool.end();
    console.log('\\n✅✅✅ HITO 7 COMPLETO: Todas las pruebas pasaron ✅✅✅');
  } catch (err) {
    console.error('💥 ERROR:', err.message);
    process.exit(1);
  }
}

runTest();
