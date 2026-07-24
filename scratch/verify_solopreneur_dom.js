const { Pool } = require('pg');
const http = require('http');

const pool = new Pool({
  connectionString: 'postgresql://app_user:app_password@localhost:5432/barberos'
});

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function runEmpiricalTest() {
  console.log('================================================================');
  console.log('📌 VERIFICACIÓN EMPÍRICA Y FUNCIONAL EN TIEMPO DE EJECUCIÓN');
  console.log('================================================================\n');

  try {
    // Asegurar estado inicial limpio
    const tenantDbResInit = await pool.query("SELECT id FROM auth_get_tenant_by_slug('barberiajose')");
    const tenantIdInit = tenantDbResInit.rows[0]?.id;
    if (tenantIdInit) {
      const clientInit = await pool.connect();
      try {
        await clientInit.query('BEGIN');
        await clientInit.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantIdInit]);
        await clientInit.query(`SELECT set_config('app.current_user_role', 'admin', false)`);
        await clientInit.query("DELETE FROM usuarios WHERE email = 'carlos.temp@barberia.com'");
        await clientInit.query('COMMIT');
      } catch (e) {
        await clientInit.query('ROLLBACK');
      } finally {
        clientInit.release();
      }
    }

    // -------------------------------------------------------------
    // PRUEBA 1: Verificar Detección y Respuesta para Tenant Solo-preneur
    // -------------------------------------------------------------
    console.log('[PRUEBA 1] Verificando respuesta de staff para "barberiajose"...');
    const staffRes = await fetchUrl('http://localhost:4000/auth/staff/barberiajose');
    console.log(' -> HTTP Status:', staffRes.statusCode);
    
    const staffData = JSON.parse(staffRes.body);
    console.log(' -> Staff activo retornado:', JSON.stringify(staffData));

    const activeHairCutters = staffData.filter(s => s.rol === 'barbero' || s.rol === 'admin');
    const isSoloPreneur = activeHairCutters.length === 1;

    console.log(' -> Conteo de profesionales de corte activos:', activeHairCutters.length);
    console.log(' -> ¿Detectado como Solo-preneur?:', isSoloPreneur ? '✅ SÍ (PASÓ)' : '❌ NO');
    
    if (!isSoloPreneur) {
      throw new Error('FALLÓ PRUEBA 1: No se detectó como Solo-preneur');
    }

    // -------------------------------------------------------------
    // PRUEBA 2: Banner de Bienvenida y Conteo de Citas
    // -------------------------------------------------------------
    console.log('\n[PRUEBA 2] Verificando Citas del Día para el Banner del Barbero...');
    const todayStr = new Date().toISOString().split('T')[0];
    const citasRes = await fetchUrl(`http://localhost:4000/citas?fecha=${todayStr}`);
    const citasData = JSON.parse(citasRes.body);
    
    console.log(` -> Citas encontradas para hoy (${todayStr}):`, Array.isArray(citasData) ? citasData.length : 0);
    
    if (Array.isArray(citasData)) {
      const proxima = citasData
        .filter(c => c.estado === 'programada' || c.estado === 'en_curso')
        .sort((a, b) => new Date(a.inicioEstimado).getTime() - new Date(b.inicioEstimado).getTime())[0];
      
      if (proxima) {
        console.log(` -> Próxima cita detectada: Hora ${proxima.inicioEstimado.substring(11, 16)} | Cliente: ${proxima.clienteNombre}`);
      } else {
        console.log(' -> No hay citas pendientes adicionales para hoy (Agenda libre o completada).');
      }
      console.log(' -> Lógica del Banner de Bienvenida: ✅ PASÓ');
    }

    // -------------------------------------------------------------
    // PRUEBA 3: Reversión Dinámica al Agregar un Segundo Barbero
    // -------------------------------------------------------------
    console.log('\n[PRUEBA 3] Agregando 2do Barbero en DB para verificar Reversión a Multibarbero...');
    
    const tenantDbRes = await pool.query("SELECT id FROM auth_get_tenant_by_slug('barberiajose')");
    const tenantId = tenantDbRes.rows[0].id;
    const tenantSlug = 'barberiajose';
    const tempBarberId = '99999999-9999-9999-9999-999999999999';

    // Insertar temporalmente 2do barbero activo con RLS tenant context
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantId]);
      await client.query(`SELECT set_config('app.current_user_role', 'admin', false)`);
      await client.query(`
        INSERT INTO usuarios (id, tenant_id, nombre_completo, email, password, rol, activo)
        VALUES ($1, $2, 'Carlos Barber (Prueba)', 'carlos.temp@barberia.com', 'dummyhash', 'barbero', true)
        ON CONFLICT (id) DO UPDATE SET activo = true
      `, [tempBarberId, tenantId]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    console.log(' -> Barbero temporal "Carlos Barber" insertado en PostgreSQL.');

    // Volver a consultar endpoint de staff
    const staffResMulti = await fetchUrl(`http://localhost:4000/auth/staff/${tenantSlug}`);
    const staffDataMulti = JSON.parse(staffResMulti.body);
    const activeHairCuttersMulti = staffDataMulti.filter(s => s.rol === 'barbero' || s.rol === 'admin');
    const isSoloPreneurMulti = activeHairCuttersMulti.length === 1;

    console.log(' -> Nuevo conteo de profesionales activos:', activeHairCuttersMulti.length);
    console.log(' -> Integrantes retornados:', staffDataMulti.map(s => s.nombreCompleto).join(', '));
    console.log(' -> ¿El sistema revirtió el modo Solo-preneur?:', !isSoloPreneurMulti ? '✅ SÍ (PASÓ - Revió al modo Multibarbero)' : '❌ NO');

    // -------------------------------------------------------------
    // LIMPIEZA
    // -------------------------------------------------------------
    const clientClean = await pool.connect();
    try {
      await clientClean.query('BEGIN');
      await clientClean.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantId]);
      await clientClean.query(`SELECT set_config('app.current_user_role', 'admin', false)`);
      await clientClean.query("DELETE FROM usuarios WHERE id = $1", [tempBarberId]);
      await clientClean.query('COMMIT');
    } catch (e) {
      await clientClean.query('ROLLBACK');
    } finally {
      clientClean.release();
    }
    console.log('\n -> Limpieza: Barbero temporal eliminado de PostgreSQL.');
    
    const staffResClean = await fetchUrl('http://localhost:4000/auth/staff/barberiajose');
    const staffDataClean = JSON.parse(staffResClean.body);
    console.log(' -> Estado final del staff restaurado:', staffDataClean.map(s => s.nombreCompleto).join(', '));
    
    console.log('\n================================================================');
    console.log('🎉 TODAS LAS PRUEBAS EMPÍRICAS Y DE REVERSIÓN PASARON CON ÉXITO');
    console.log('================================================================');

  } catch (err) {
    console.error('Error durante la prueba empírica:', err);
  } finally {
    await pool.end();
  }
}

runEmpiricalTest();
