const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigration0009() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/barberos',
  });

  await client.connect();

  const migrationPath = path.join(__dirname, '../apps/api/src/database/migrations/0009_observabilidad_y_alertas.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Ejecutando migración 0009_observabilidad_y_alertas.sql...');
  await client.query(sql);
  console.log('✅ Migración 0009 ejecutada exitosamente.');

  await client.end();
}

runMigration0009().catch(err => {
  console.error('❌ Error ejecutando la migración 0009:', err);
  process.exit(1);
});
