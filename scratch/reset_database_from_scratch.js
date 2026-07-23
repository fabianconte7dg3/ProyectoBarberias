const { Client } = require('pg');

async function resetDatabaseFromScratch() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/barberos',
  });
  await client.connect();

  console.log('================================================================');
  console.log(' REINICIO TOTAL DE BASE DE DATOS A ESTADO VIRGEN (DESDE CERO)');
  console.log('================================================================\n');

  // Limpiar todas las tablas relacionales de la base de datos
  await client.query(`
    TRUNCATE TABLE 
      plataforma_admins,
      alertas_seguridad,
      audit_logs,
      detalles_transaccion,
      transacciones,
      cierres_de_caja,
      citas,
      horarios,
      bloqueos_temporales,
      productos,
      servicios,
      clientes,
      usuarios,
      barberias
    CASCADE;
  `);

  console.log('✨ Base de datos 100% limpia en estado VIRGEN (0 barberías, 0 usuarios, 0 superadmins).');
  console.log('🚀 Todo el sistema está listo para la INSTALACIÓN Y SETUP DESDE CERO.');

  await client.end();
}

resetDatabaseFromScratch().catch(err => {
  console.error('Error durante el reinicio de la BD:', err);
  process.exit(1);
});
