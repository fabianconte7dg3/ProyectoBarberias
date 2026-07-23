const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/barberos',
  });
  await pgClient.connect();

  const sqlPath = path.join(__dirname, '../apps/api/src/database/migrations/0008_superadmin_operatividad.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('Ejecutando migración 0008_superadmin_operatividad.sql...');
  await pgClient.query(sqlContent);
  console.log('✅ Migración 0008 ejecutada exitosamente.');

  await pgClient.end();
}

runMigration().catch(err => {
  console.error('❌ Error aplicando migración 0008:', err);
  process.exit(1);
});
