const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');

const API_URL = 'http://localhost:3000';

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

async function main() {
  console.log('=== INICIANDO PRUEBAS DEL HITO 4 ===');

  try {
    // 1. Setup inicial standalone
    console.log('\n[Prep] Creando Barbería...');
    const rand = crypto.randomBytes(4).toString('hex');
    const email = `admin_${rand}@hito4.com`;
    const bReq = await request('POST', '/auth/barberias', {
      nombreComercial: "Barbería Hito 4",
      slug: `hito4-${rand}`,
      adminNombreCompleto: "Admin Hito4",
      adminEmail: email,
      adminPassword: "password123"
    });
    if (bReq.status !== 201) throw new Error("Fallo crear barbería");
    
    console.log('[Prep] Login Admin...');
    const loginRes = await request('POST', '/auth/login/admin', { email, password: 'password123' });
    const adminToken = loginRes.data.accessToken;
    
    console.log('[Prep] Crear Barbero, Servicio y Cliente...');
    const bBarbero = await request('POST', '/usuarios/invite', { nombreCompleto: "Barbero 4", rol: "barbero" }, adminToken);
    const actReq = await request('POST', '/usuarios/activar', { token: bBarbero.data.activationToken, pin: "1234" });
    const loginBarbero = await request('POST', '/auth/login/staff', { slug: `hito4-${rand}`, pin: "1234" });
    const barberoId = JSON.parse(Buffer.from(loginBarbero.data.accessToken.split('.')[1], 'base64').toString()).sub;
    
    const s1 = await request('POST', '/servicios', { nombre: "Corte", duracionMinutos: 30, precioBase: 15 }, adminToken);
    const servicioId = s1.data.id;
    
    const c1 = await request('POST', '/clientes', { telefonoWhatsapp: "61234567", nombreCompleto: "Jose" }, adminToken);
    
    const clientesRes = await request('GET', '/clientes?q=61234567', null, adminToken);
    const clienteId = clientesRes.data[0].id;

    // FECHA TEST
    const inicio = new Date();
    inicio.setUTCHours(10, 0, 0, 0);
    const fin = new Date(inicio.getTime() + 30 * 60000);

    // PRUEBA 1: Bloqueo Optimista y Concurrencia (Promise.all)
    console.log('\n=== PRUEBA 1: Concurrencia de Bloqueo Optimista ===');
    const promisesBloqueo = [];
    for(let i=0; i<3; i++) {
      promisesBloqueo.push(request('POST', '/citas/bloquear', {
        barberoId,
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        notas: `Intento ${i+1}`
      }));
    }

    const bloqueoResponses = await Promise.all(promisesBloqueo);
    let bloqueosExitosos = 0;
    let bloqueosConflictos = 0;

    for (let res of bloqueoResponses) {
      if (res.status === 201) bloqueosExitosos++;
      else if (res.status === 409) bloqueosConflictos++;
      else console.log('Bloqueo estado raro:', res.status, res.data);
    }
    console.log(`Bloqueos exitosos: ${bloqueosExitosos} (esperado 1)`);
    console.log(`Bloqueos conflictos: ${bloqueosConflictos} (esperado 2)`);
    if (bloqueosExitosos !== 1) throw new Error("EXCLUDE constraint en bloqueos_temporales falló.");

    // PRUEBA 2: Idempotencia en Citas
    console.log('\n=== PRUEBA 2: Idempotencia ===');
    const idempotencyKey = `reserva-doble-click-${rand}`;
    const citaBody = {
      clienteId,
      barberoId,
      servicioId,
      inicioEstimado: inicio.toISOString(),
      origen: 'walk_in'
    };

    console.log('2.1. Enviando request 1...');
    const req1 = await request('POST', '/citas', citaBody, adminToken, { 'idempotency-key': idempotencyKey });
    console.log('Status req1:', req1.status);

    console.log('2.2. Enviando request 2 (Doble click)...');
    const req2 = await request('POST', '/citas', citaBody, adminToken, { 'idempotency-key': idempotencyKey });
    console.log('Status req2:', req2.status);

    if (req1.status !== 201 || req2.status !== 200 || req1.data.id !== req2.data.id) {
      throw new Error("Fallo la validación de idempotencia.");
    }
    console.log('✅ Éxito: El sistema retornó HTTP 200 con la misma cita en el doble clic.');

    // PRUEBA 3: Concurrencia EXCLUDE en Citas
    console.log('\n=== PRUEBA 3: Solapamiento Duro EXCLUDE ===');
    const inicio2 = new Date(inicio.getTime() + 15 * 60000); 
    const reqSolape = await request('POST', '/citas', { ...citaBody, inicioEstimado: inicio2.toISOString() }, adminToken, { 'idempotency-key': 'otro-key' });
    console.log('Status Solape:', reqSolape.status);
    if (reqSolape.status !== 409) {
      throw new Error("El sistema permitió solapamiento de citas o no retornó 409.");
    }
    console.log('✅ Éxito: Solapamiento rechazado con 409 Conflict.');

    // PRUEBA 4: Atomicidad de Strikes
    console.log('\n=== PRUEBA 4: Transición a No-Show y Strikes ===');
    const prevCliente = await request('GET', '/clientes?q=61234567', null, adminToken);
    const prevStrikes = prevCliente.data[0].ausenciasStrikes;
    
    console.log(`Strikes antes: ${prevStrikes}`);
    const noShowReq = await request('PATCH', `/citas/${req1.data.id}/estado`, { estado: 'ausente_strike' }, adminToken);
    console.log('Status No-Show:', noShowReq.status);

    const postCliente = await request('GET', '/clientes?q=61234567', null, adminToken);
    const postStrikes = postCliente.data[0].ausenciasStrikes;
    console.log(`Strikes después: ${postStrikes}`);

    if (postStrikes !== prevStrikes + 1) {
      throw new Error("No se incrementó atómicamente el strike del cliente.");
    }
    console.log('✅ Éxito: Strike automático sumado.');

    // PRUEBA 5: Auto-Almuerzo
    console.log('\n=== PRUEBA 5: Auto-Almuerzo Dinámico ===');
    const inicioRealStr = new Date(inicio.getTime() + 45 * 60000).toISOString();
    execSync(`docker exec barberos_postgres psql -U postgres -d barberos -c "UPDATE citas SET inicio_real = '${inicioRealStr}', estado = 'en_curso' WHERE id = '${req1.data.id}';"`);
    
    const fecha = inicio.toISOString().split('T')[0];
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaActual = dias[inicio.getDay()];
    
    await request('POST', `/horarios/barbero/${barberoId}`, {
      dias: [{
        diaSemana: diaActual,
        horaInicio: '09:00',
        horaFin: '18:00',
        horaAlmuerzoInicio: '12:00',
        horaAlmuerzoFin: '13:00'
      }]
    }, adminToken);

    const dispReq = await request('GET', `/horarios/disponibilidad?barberoId=${barberoId}&fecha=${fecha}`);
    const disponibilidad = dispReq.data;
    
    console.log('Retraso calculado (min):', disponibilidad.retrasoActualMinutos);
    console.log('Almuerzo ajustado:', disponibilidad.almuerzo);
    if (disponibilidad.retrasoActualMinutos !== 45) {
      throw new Error("El sistema no detectó el retraso de 45 minutos.");
    }
    if (disponibilidad.almuerzo.strInicio !== '12:45' || disponibilidad.almuerzo.strFin !== '13:45') {
      throw new Error("El auto-almuerzo no se desplazó 45 minutos.");
    }
    console.log('✅ Éxito: El almuerzo se auto-desplazó en función del inicio real de la cita.');

    console.log('\n=== PRUEBAS FINALIZADAS CON ÉXITO ===');
  } catch (err) {
    console.error('\n❌ ERROR DURANTE LAS PRUEBAS:', err);
  }
}

main();
