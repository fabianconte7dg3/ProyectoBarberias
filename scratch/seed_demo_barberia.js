const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function seedDemoBarberia() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/barberos',
  });
  await client.connect();

  console.log('--- Asegurando Barbería de Prueba, Credenciales y Catálogo Público ---');

  // 1. Asegurar Planes
  await client.query(`
    INSERT INTO planes (id, nombre, precio_mensual, limite_barberos)
    VALUES ('basico', 'Plan Básico', 29.99, 3)
    ON CONFLICT (id) DO NOTHING
  `);

  // 2. Obtener o crear Tenant 'barberia-demo'
  let tenantRes = await client.query(`SELECT id FROM barberias WHERE slug = 'barberia-demo' LIMIT 1`);
  let tenantId;
  if (tenantRes.rows.length === 0) {
    const newTenant = await client.query(`
      INSERT INTO barberias (nombre_comercial, slug, plan_id, plan_suscripcion, estado)
      VALUES ('Barbería Demo Panamá', 'barberia-demo', 'basico', 'basico', 'activo')
      RETURNING id
    `);
    tenantId = newTenant.rows[0].id;
  } else {
    tenantId = tenantRes.rows[0].id;
  }

  // Inyectar contexto tenant en RLS
  await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
  await client.query(`SET LOCAL app.current_user_role = 'admin'`);

  // 3. Crear / Actualizar Usuario Propietario (Admin)
  const adminEmail = 'admin@barberiademo.com';
  const adminPass = 'Barberia123!';
  const adminPassHash = await bcrypt.hash(adminPass, 10);

  await client.query(`
    INSERT INTO usuarios (tenant_id, email, nombre_completo, password, rol, activo)
    VALUES ($1, $2, 'Carlos Admin Demo', $3, 'admin', true)
    ON CONFLICT (email) DO UPDATE
    SET password = $3, activo = true
  `, [tenantId, adminEmail, adminPassHash]);

  // 4. Crear / Actualizar Usuario Barbero Staff con PIN '1234'
  const barberoEmail = 'barbero@barberiademo.com';
  const barberoPin = '1234';
  const barberoPinHash = await bcrypt.hash(barberoPin, 10);

  await client.query(`
    INSERT INTO usuarios (tenant_id, email, nombre_completo, pin_acceso, rol, porcentaje_comision, porcentaje_comision_producto, activo)
    VALUES ($1, $2, 'Mateo Barbero Demo', $3, 'barbero', 50.00, 10.00, true)
    ON CONFLICT (email) DO UPDATE
    SET pin_acceso = $3, activo = true
  `, [tenantId, barberoEmail, barberoPinHash]);

  // 5. Crear Servicios Públicos de Ejemplo
  await client.query(`
    INSERT INTO servicios (tenant_id, nombre, duracion_minutos, precio_base, activo)
    VALUES 
      ($1, 'Corte Tradicional Panamá', 30, 15.00, true),
      ($1, 'Corte + Barba Perfilada', 45, 22.00, true),
      ($1, 'Ritual Completo Barba VIP', 40, 18.00, true)
    ON CONFLICT DO NOTHING
  `, [tenantId]);

  console.log('✅ Barbería, Servicios Públicos y Credenciales creadas exitosamente:');
  console.log(`- Slug Barbería: barberia-demo`);
  console.log(`- CLIENTE FINAL (Portal Web de Reservas Públicas):`);
  console.log(`  URL: http://localhost:3001/barberia-demo/reservar`);
  console.log(`- PROPIETARIO DE BARBERÍA (Admin Cliente):`);
  console.log(`  URL: http://localhost:3001/barberia-demo/admin/login`);
  console.log(`  Email: ${adminEmail} | Pass: ${adminPass}`);
  console.log(`- STAFF / BARBERO (Tablet Local):`);
  console.log(`  URL: http://localhost:3001/barberia-demo/operativo`);
  console.log(`  PIN Numpad: ${barberoPin}`);

  await client.end();
}

seedDemoBarberia().catch(err => {
  console.error('Error al sembrar barbería demo:', err);
  process.exit(1);
});
