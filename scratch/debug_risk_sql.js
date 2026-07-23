const { Client } = require('pg');
const crypto = require('crypto');

async function debugRisk() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/barberos',
  });
  await client.connect();

  const tenantRiskId = crypto.randomUUID();

  await client.query(`
    INSERT INTO barberias (id, nombre_comercial, slug, plan_id, plan_suscripcion, estado, bloqueado_por_plataforma)
    VALUES ($1, 'Barbería Riesgo 8D', 'barberia-riesgo-8d', 'basico', 'basico', 'activo', false)
  `, [tenantRiskId]);

  await client.query(`
    INSERT INTO whatsapp_config (id, tenant_id, numero_whatsapp, evolution_instance_name, evolution_server_url, estado)
    VALUES ($1, $2, '+50760000001', 'inst_test_1', 'http://localhost:8080', 'conectado')
  `, [crypto.randomUUID(), tenantRiskId]);

  const barberoId = crypto.randomUUID();
  const servicioId = crypto.randomUUID();

  await client.query(`
    INSERT INTO usuarios (id, tenant_id, email, nombre_completo, rol, activo)
    VALUES ($1, $2, 'barbero1@test.com', 'Barbero Test 1', 'barbero', true)
  `, [barberoId, tenantRiskId]);

  await client.query(`
    INSERT INTO servicios (id, tenant_id, nombre, duracion_minutos, precio_base, activo)
    VALUES ($1, $2, 'Corte Test', 30, 15.00, true)
  `, [servicioId, tenantRiskId]);

  const citaRes = await client.query(`
    INSERT INTO citas (id, tenant_id, barbero_id, servicio_id, inicio_estimado, fin_estimado, origen, estado, idempotency_key, created_at)
    VALUES ($1, $2, $3, $4, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '30 mins', 'manual_admin', 'completada', $5, NOW() - INTERVAL '8 days')
    RETURNING created_at
  `, [crypto.randomUUID(), tenantRiskId, barberoId, servicioId, crypto.randomUUID()]);

  console.log('Cita created_at:', citaRes.rows[0].created_at);

  const queryRes = await client.query(`
    SELECT 
        b.id,
        b.nombre_comercial,
        w.estado AS estado_whatsapp,
        MAX(c.created_at) AS max_created_at,
        NOW() - INTERVAL '7 days' AS threshold,
        MAX(c.created_at) < NOW() - INTERVAL '7 days' AS is_older_than_7_days
    FROM barberias b
    LEFT JOIN whatsapp_config w ON w.tenant_id = b.id
    LEFT JOIN citas c ON c.tenant_id = b.id
    WHERE b.id = $1
    GROUP BY b.id, b.nombre_comercial, w.estado
  `, [tenantRiskId]);

  console.log('QueryResult:', queryRes.rows[0]);

  // Clean up
  await client.query(`DELETE FROM citas WHERE tenant_id = $1`, [tenantRiskId]);
  await client.query(`DELETE FROM servicios WHERE tenant_id = $1`, [tenantRiskId]);
  await client.query(`DELETE FROM usuarios WHERE tenant_id = $1`, [tenantRiskId]);
  await client.query(`DELETE FROM whatsapp_config WHERE tenant_id = $1`, [tenantRiskId]);
  await client.query(`DELETE FROM barberias WHERE id = $1`, [tenantRiskId]);

  await client.end();
}

debugRisk().catch(console.error);
