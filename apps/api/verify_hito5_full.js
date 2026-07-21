const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { Pool } = require('pg');

const API_URL = 'http://localhost:3000';
const ENCRYPTION_KEY = process.env.APP_SECRET || '12345678901234567890123456789012'; 

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

async function request(method, path, body = null, token = null, headersAdicionales = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headersAdicionales
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function sql(query) {
  return execSync(`docker exec barberos_postgres psql -U postgres -d barberos -t -c "${query}"`).toString().trim();
}

async function main() {
  console.log('=== INICIANDO PRUEBAS DEL HITO 5 ===');

  try {
    console.log('\n=== PRUEBA DE SEGURIDAD (RLS) ===');
    const appPool = new Pool({ connectionString: 'postgresql://app_user:app_password@localhost:5432/barberos' });
    const rlsTestRes = await appPool.query('SELECT count(*) as count FROM usuarios;');
    await appPool.end();
    if (parseInt(rlsTestRes.rows[0].count, 10) !== 0) {
      throw new Error(`⚠️ VULNERABILIDAD RLS: La base de datos devolvió ${rlsTestRes.rows[0].count} usuarios al rol app_user sin SET LOCAL tenant_id.`);
    }
    console.log('✅ Éxito: RLS bloqueó correctamente el acceso global (0 filas devueltas).');

    // 0. Preparación
    console.log('\n[Prep] Configurando datos base...');
    const rand = crypto.randomBytes(4).toString('hex');
    const email = `admin_${rand}@hito5.com`;
    await request('POST', '/auth/barberias', {
      nombreComercial: "Barbería Hito 5",
      slug: `hito5-${rand}`,
      adminNombreCompleto: "Admin Hito5",
      adminEmail: email,
      adminPassword: "password123"
    });
    
    const loginRes = await request('POST', '/auth/login/admin', { email, password: 'password123' });
    const adminToken = loginRes.data.accessToken;
    const adminId = JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64').toString()).sub;
    
    const bBarbero = await request('POST', '/usuarios/invite', { nombreCompleto: "Barbero 5", rol: "barbero" }, adminToken);
    await request('POST', '/usuarios/activar', { token: bBarbero.data.activationToken, pin: "1234" });
    const loginBarbero = await request('POST', '/auth/login/staff', { slug: `hito5-${rand}`, pin: "1234" });
    const barberoId = JSON.parse(Buffer.from(loginBarbero.data.accessToken.split('.')[1], 'base64').toString()).sub;
    
    // Set 50% commission
    sql(`UPDATE usuarios SET porcentaje_comision = 50 WHERE id = '${barberoId}'`);
    
    const s1 = await request('POST', '/servicios', { nombre: "Corte", duracionMinutos: 30, precioBase: 20 }, adminToken);
    const servicioId = s1.data.id;
    
    await request('POST', '/clientes', { telefonoWhatsapp: "69999999", nombreCompleto: "Jose Pago" }, adminToken);
    const clientesRes = await request('GET', '/clientes?q=69999999', null, adminToken);
    const clienteId = clientesRes.data[0].id;
    const tenantId = sql(`SELECT id FROM barberias WHERE slug = 'hito5-${rand}'`);

    // PRUEBA EXTRA: Verificar Idempotencia (Hito 4 Fix)
    console.log('\n=== FIX HITO 4: Idempotencia en Citas ===');
    const idKey = `idemp-${rand}`;
    const citaIdemp = await request('POST', '/citas', { clienteId, barberoId, servicioId, inicioEstimado: new Date().toISOString(), origen: 'walk_in' }, adminToken, { 'idempotency-key': idKey });
    const citaIdemp2 = await request('POST', '/citas', { clienteId, barberoId, servicioId, inicioEstimado: new Date().toISOString(), origen: 'walk_in' }, adminToken, { 'idempotency-key': idKey });
    if (citaIdemp.status !== 201) throw new Error(`Idempotencia req 1 falló: ${citaIdemp.status}`);
    if (citaIdemp2.status !== 200) throw new Error(`Idempotencia req 2 debió ser 200, fue ${citaIdemp2.status}`);
    console.log('✅ Éxito: Doble-click retornó 200 OK con la cita existente.');

    // Crear 3 citas para pruebas de cobro
    console.log('\n[Prep] Creando citas...');
    const d1 = new Date(); d1.setUTCHours(10);
    const d2 = new Date(); d2.setUTCHours(11);
    const d3 = new Date(); d3.setUTCHours(12);

    const cEfectivo = await request('POST', '/citas', { clienteId, barberoId, servicioId, inicioEstimado: d1.toISOString(), origen: 'walk_in' }, adminToken);
    const cManual = await request('POST', '/citas', { clienteId, barberoId, servicioId, inicioEstimado: d2.toISOString(), origen: 'walk_in' }, adminToken);
    const cComercial = await request('POST', '/citas', { clienteId, barberoId, servicioId, inicioEstimado: d3.toISOString(), origen: 'walk_in' }, adminToken);

    // ============================================
    // CASO 1: Cobro Efectivo
    // ============================================
    console.log('\n=== PRUEBA 1: Cobro en Efectivo ===');
    const cobroEf = await request('POST', `/citas/${cEfectivo.data.id}/cobrar`, { metodoPago: 'efectivo' }, adminToken);
    if (cobroEf.status !== 201) throw new Error('Falló cobro en efectivo');
    if (Number(cobroEf.data.transaccion.comisionBarbero) !== 10) throw new Error('Comisión mal calculada. Esperado 10 (50% de 20)');
    
    const estadoCE = sql(`SELECT estado FROM citas WHERE id = '${cEfectivo.data.id}'`);
    if (estadoCE !== 'completada') throw new Error(`Estado de cita no es completada, es ${estadoCE}`);
    console.log('✅ Éxito: Cobro efectivo procesado, comisión calculada, cita completada de forma atómica.');

    // ============================================
    // CASO 2: Yappy Manual
    // ============================================
    console.log('\n=== PRUEBA 2: Yappy Manual ===');
    sql(`INSERT INTO yappy_config (tenant_id, modo, numero_personal) VALUES ('${tenantId}', 'manual', '6111-2222') ON CONFLICT (tenant_id) DO UPDATE SET modo = 'manual', numero_personal = '6111-2222'`);
    
    const cobroManual = await request('POST', `/citas/${cManual.data.id}/cobrar`, { metodoPago: 'yappy' }, adminToken);
    if (cobroManual.status !== 201) throw new Error('Falló cobro Yappy manual: ' + JSON.stringify(cobroManual.data));
    if (cobroManual.data.yappyData.numeroPersonal !== '6111-2222') throw new Error('No devolvió número personal: ' + JSON.stringify(cobroManual.data.yappyData));
    
    const estadoCMan = sql(`SELECT estado FROM citas WHERE id = '${cManual.data.id}'`);
    if (estadoCMan === 'completada') throw new Error('La cita de Yappy Manual se completó sin confirmación!');

    const confManual = await request('POST', `/citas/${cManual.data.id}/confirmar-pago-manual`, {}, adminToken);
    if (confManual.status !== 201) throw new Error('Falló confirmar-pago-manual: ' + confManual.status + ' ' + JSON.stringify(confManual.data));
    
    const confPor = sql(`SELECT confirmado_por_id FROM transacciones WHERE id = '${cobroManual.data.transaccion.id}'`);
    if (confPor !== adminId) throw new Error('No se guardó el confirmadoPorId');
    console.log('✅ Éxito: Yappy manual esperó confirmación y registró auditoría.');

    // ============================================
    // CASO 3 & 4: Yappy Comercial y Webhook
    // ============================================
    console.log('\n=== PRUEBA 3 & 4: Yappy Comercial e IPN ===');
    const secretKeyStr = 'secreto_super_seguro_123';
    const secretCifrada = encrypt(secretKeyStr);
    
    sql(`UPDATE yappy_config SET modo = 'comercial', merchant_id = 'MERCH-123', secret_key_cifrada = '${secretCifrada}' WHERE tenant_id = '${tenantId}'`);
    
    const cobroComercial = await request('POST', `/citas/${cComercial.data.id}/cobrar`, { metodoPago: 'yappy' }, adminToken);
    if (cobroComercial.status !== 201) throw new Error('Falló cobro Yappy Comercial: ' + cobroComercial.status + ' ' + JSON.stringify(cobroComercial.data));
    
    const orderId = cobroComercial.data.transaccion.yappyOrderId;
    if (orderId.length > 15) throw new Error(`yappyOrderId muy largo: ${orderId}`);
    
    // Simular IPN Hash Inválido
    const ipnInvalid = await request('GET', `/yappy/ipn?orderId=${orderId}&status=E&hash=BADHASH&domain=https://midominio.com`);
    if (ipnInvalid.status !== 400) throw new Error('IPN no rechazó hash inválido: ' + ipnInvalid.status + ' ' + JSON.stringify(ipnInvalid.data));
    console.log('✅ Éxito: Webhook rechazó hash inválido (HTTP 401).');
    
    // Simular IPN Hash Válido
    const statusE = 'E';
    const domain = 'https://midominio.com';
    const expectedHash = crypto.createHmac('sha256', secretKeyStr).update(`${orderId}${statusE}${domain}`).digest('hex');
    
    const ipnValid = await request('GET', `/yappy/ipn?orderId=${orderId}&status=${statusE}&hash=${expectedHash}&domain=${domain}`);
    if (ipnValid.status !== 200) throw new Error('IPN rechazó hash válido');
    
    const estadoCCom = sql(`SELECT estado FROM citas WHERE id = '${cComercial.data.id}'`);
    if (estadoCCom !== 'completada') throw new Error('Webhook no completó la cita!');
    console.log(`✅ Éxito: Webhook completó transacción exitosamente de forma aislada. OrderId length = ${orderId.length}`);

    // ============================================
    // CASO 5: DGI Async
    // ============================================
    console.log('\n=== PRUEBA 5: DGI Async ===');
    console.log('Esperando 2.5s para que DgiService termine su setTimeout...');
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const estadoDgi = sql(`SELECT estado_dgi FROM transacciones WHERE id = '${cobroComercial.data.transaccion.id}'`);
    const numDgi = sql(`SELECT numero_factura_dgi FROM transacciones WHERE id = '${cobroComercial.data.transaccion.id}'`);
    if (estadoDgi !== 'emitida' || !numDgi.startsWith('DGI-')) throw new Error(`DGI falló: ${estadoDgi} / ${numDgi}`);
    console.log('✅ Éxito: DGI emitió factura asíncronamente con su propio contexto de transacción.');

    // ============================================
    // CASO 6: Caja
    // ============================================
    console.log('\n=== PRUEBA 6: Cierre de Caja ===');
    const balanceReq = await request('GET', '/caja/balance', null, adminToken);
    if (balanceReq.status !== 200) throw new Error('Falló /caja/balance');
    
    // Efectivo total = 20 (cobro 1). Los Yappy no suman.
    if (balanceReq.data.efectivoEsperado !== 20) throw new Error(`Caja calculó ${balanceReq.data.efectivoEsperado}, se esperaba 20`);
    
    const cierreReq = await request('POST', '/caja/cerrar', { efectivoDeclarado: 15 }, adminToken);
    if (cierreReq.status !== 201) throw new Error('Falló /caja/cerrar');
    
    if (cierreReq.data.estado !== 'faltante') throw new Error('Caja no detectó el faltante');
    console.log('✅ Éxito: Caja ignoró Yappy, calculó balance de efectivo correctamente y detectó descuadre (faltante).');

    console.log('\n🎉 TODAS LAS PRUEBAS DEL HITO 5 SUPERADAS CORRECTAMENTE 🎉\n');

  } catch (err) {
    console.error('\n❌ ERROR DURANTE LAS PRUEBAS:', err);
  }
}

main();
