const assert = require('assert');
const crypto = require('crypto');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: 'postgresql://app_user:app_password@localhost:5432/barberos',
  });

  const slug = `test-hito8-${Date.now()}`;
  const adminEmail = `admin-${Date.now()}@test.com`;
  const adminPassword = 'password123';
  const wrongPassword = 'wrongpassword';

  try {
    console.log('--- Iniciando Verificación Hito 8: Seguridad y Anti-Spam ---');
    
    // 1. Crear Tenant
    const registerRes = await fetch('http://localhost:3000/auth/barberias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombreComercial: 'Barberia Hito 8',
        slug: slug,
        adminNombreCompleto: 'Admin Hito 8',
        adminEmail: adminEmail,
        adminPassword: adminPassword,
      }),
    });
    
    const registerData = await registerRes.json();
    assert.strictEqual(registerRes.status, 201, 'Registro exitoso');
    const tenantId = registerData.tenantId;

    console.log('✅ Tenant y Admin creados.');

    // 2. Suspender cuenta de Admin
    await pool.query('BEGIN');
    await pool.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    const updateResult = await pool.query(`UPDATE usuarios SET activo = false WHERE email = $1 RETURNING *`, [adminEmail]);
    await pool.query('COMMIT');
    console.log('Update Result:', updateResult.rowCount);

    // 3. Login con contraseña incorrecta (admin suspendido) -> Debe dar 401 Credenciales inválidas
    const loginWrongRes = await fetch('http://localhost:3000/auth/login/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: wrongPassword }),
    });
    const loginWrongData = await loginWrongRes.json();
    
    assert.strictEqual(loginWrongRes.status, 401, 'Debe dar 401');
    assert.strictEqual(loginWrongData.message, 'Credenciales inválidas.', 'No debe revelar que está suspendida');
    console.log('✅ Fuga de info evitada: contraseña incorrecta da 401.');

    // 4. Login con contraseña correcta (admin suspendido) -> Debe dar 403 Suspendida
    const loginSuspendedRes = await fetch('http://localhost:3000/auth/login/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const loginSuspendedData = await loginSuspendedRes.json();
    
    assert.strictEqual(loginSuspendedRes.status, 403, 'Debe dar 403');
    assert.strictEqual(loginSuspendedData.message, 'Esta cuenta está suspendida. Contacta a soporte para reactivarla.', 'Debe informar que está suspendida');
    console.log('✅ Validación correcta: contraseña correcta da 403.');

    // 5. Activar admin, suspender Tenant
    await pool.query('BEGIN');
    await pool.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    await pool.query(`UPDATE usuarios SET activo = true WHERE email = $1`, [adminEmail]);
    // barberias table RLS uses id = current_tenant_id()
    const updateBarb = await pool.query(`UPDATE barberias SET estado = 'suspendido_pago' WHERE id = $1 RETURNING *`, [tenantId]);
    await pool.query('COMMIT');
    console.log('Update Barberia Result:', updateBarb.rowCount);

    // 6. Login Admin con tenant suspendido -> Debe dar 403
    const loginTenantSuspendedRes = await fetch('http://localhost:3000/auth/login/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const loginTenantSuspendedData = await loginTenantSuspendedRes.json();
    
    assert.strictEqual(loginTenantSuspendedRes.status, 403, 'Debe dar 403 por tenant suspendido');
    assert.strictEqual(loginTenantSuspendedData.message, 'La suscripción de la barbería está inactiva.');
    console.log('✅ Validación correcta: admin activo, pero barbería suspendida da 403.');

    // Volver a activar tenant para las pruebas de whatsapp
    await pool.query('BEGIN');
    await pool.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    await pool.query(`UPDATE barberias SET estado = 'activo' WHERE id = $1`, [tenantId]);
    await pool.query('COMMIT');

    // 7. Simular Webhook de Mensaje Entrante
    console.log('Simulando recepción de mensaje (Webhook)...');
    
    // Create a dummy client
    const tel = '1234567890';
    await pool.query('BEGIN');
    await pool.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    const insertClient = await pool.query(`
      INSERT INTO clientes (id, telefono_whatsapp, nombre_completo, tenant_id) 
      VALUES ($2, $3, 'Cliente Test', $1) RETURNING *;
    `, [tenantId, crypto.randomUUID(), tel]);
    await pool.query('COMMIT');
    console.log('Insert Client Result:', insertClient.rowCount);

    const webhookPayload = {
      event: 'messages.upsert',
      data: {
        key: { remoteJid: `${tel}@s.whatsapp.net`, fromMe: false },
        message: { conversation: 'Hola' }
      }
    };

    const webhookRes = await fetch(`http://localhost:3000/whatsapp/webhook/${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });
    
    assert.strictEqual(webhookRes.status, 201, 'Webhook procesado exitosamente');

    // Wait a sec for background process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Ver que se actualizó ultimoMensajeRecibidoAt
    await pool.query('BEGIN');
    await pool.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    const clientResult = await pool.query(`SELECT ultimo_mensaje_recibido_at FROM clientes WHERE telefono_whatsapp = $1`, [tel]);
    await pool.query('COMMIT');
    console.log('Select Client Result:', clientResult.rowCount);
    const ultimoMensaje = clientResult.rows[0].ultimo_mensaje_recibido_at;
    
    assert.ok(ultimoMensaje, 'El último mensaje debe estar registrado');
    console.log('✅ Webhook actualizó correctamente "ultimoMensajeRecibidoAt".');

    console.log('--- Verificación Hito 8 completada exitosamente ---');

  } catch (error) {
    console.error('❌ Error en verificación:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
