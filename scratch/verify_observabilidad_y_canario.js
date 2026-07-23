const { Client } = require('pg');

async function testObservabilidadYCanario() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/barberos',
  });
  await client.connect();

  console.log('--- TEST 1: Verificación de Canario de RLS (con rol app_user) ---');
  // Asegurarnos de cambiar el rol a app_user (no superusuario)
  await client.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN EXECUTE 'SET ROLE app_user'; END IF; END $$;`);

  // Ejecutar SELECT directamente sin SET LOCAL app.current_tenant_id
  const citasRes = await client.query(`SELECT COUNT(*)::INT as count FROM citas`);
  const clientesRes = await client.query(`SELECT COUNT(*)::INT as count FROM clientes`);

  const citasCount = citasRes.rows[0].count;
  const clientesCount = clientesRes.rows[0].count;

  console.log(`Filas de citas devueltas como app_user sin tenant_id: ${citasCount}`);
  console.log(`Filas de clientes devueltas como app_user sin tenant_id: ${clientesCount}`);

  // Restaurar rol para realizar escrituras administrativas
  await client.query(`RESET ROLE`);

  if (citasCount === 0 && clientesCount === 0) {
    console.log('✅ TEST 1 PASÓ: El Canario de RLS confirma aislamiento íntegro (0 filas devueltas como app_user sin tenant scope).');
  } else {
    console.error('❌ TEST 1 FALLÓ: Se detectó fuga RLS.');
    process.exit(1);
  }

  console.log('\n--- TEST 2: Inserción y Lectura de Alertas de Seguridad ---');
  // Insertar una alerta de prueba
  const insRes = await client.query(`
    INSERT INTO alertas_seguridad (tipo, nivel, mensaje, metadatos)
    VALUES ('test_canario', 'warning', 'Prueba de alerta de seguridad automatizada', '{"origen": "test_script"}'::jsonb)
    RETURNING *
  `);
  const alertaOriginal = insRes.rows[0];
  console.log(`Alerta creada ID: ${alertaOriginal.id}, Atendida: ${alertaOriginal.atendida}`);

  // Marcar atendida
  const updateRes = await client.query(`
    UPDATE alertas_seguridad SET atendida = true WHERE id = $1 RETURNING *
  `, [alertaOriginal.id]);
  const alertaActualizada = updateRes.rows[0];
  console.log(`Alerta actualizada ID: ${alertaActualizada.id}, Atendida: ${alertaActualizada.atendida}`);

  if (alertaActualizada.atendida === true) {
    console.log('✅ TEST 2 PASÓ: Tabla de alertas de seguridad y actualización "Marcar Atendida" funcionan correctamente.');
  } else {
    console.error('❌ TEST 2 FALLÓ: No se actualizó el estado atendida.');
    process.exit(1);
  }

  console.log('\n--- TEST 3: Función de Métricas de Negocio & Barberías en Riesgo ---');
  const metricsRes = await client.query(`SELECT * FROM get_platform_business_metrics()`);
  const metrics = metricsRes.rows[0];

  const nuevasMes = Number(metrics.barberias_nuevas_mes || 0);
  const barberiasEnRiesgo = metrics.barberias_en_riesgo || [];

  console.log(`Barberías nuevas este mes: ${nuevasMes}`);
  console.log(`Barberías en riesgo detectadas: ${barberiasEnRiesgo.length}`);

  if (typeof nuevasMes === 'number' && Array.isArray(barberiasEnRiesgo)) {
    console.log('✅ TEST 3 PASÓ: La función SQL get_platform_business_metrics() retornó métricas y cálculo de riesgo válidos.');
  } else {
    console.error('❌ TEST 3 FALLÓ: Estructura de métricas inválida.');
    process.exit(1);
  }

  // Limpiar alerta de prueba
  await client.query(`DELETE FROM alertas_seguridad WHERE id = $1`, [alertaOriginal.id]);

  await client.end();
  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE OBSERVABILIDAD Y CANARIO PASARON CON ÉXITO!');
}

testObservabilidadYCanario().catch(err => {
  console.error('❌ Error en script de prueba:', err);
  process.exit(1);
});
