const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/barberias_db',
  });

  await client.connect();
  console.log('Conectado a PostgreSQL...');

  const sqlPath = path.join(__dirname, '../apps/api/src/database/migrations/0006_import_export.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  await client.query(sql);
  console.log('Migración 0006_import_export.sql aplicada con éxito.');

  await client.end();
}

main().catch(err => {
  console.error('Error aplicando migración:', err);
  process.exit(1);
});
