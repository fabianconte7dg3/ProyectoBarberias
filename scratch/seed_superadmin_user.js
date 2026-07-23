const { Client } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.MFA_SECRET_KEY || '12345678901234567890123456789012';

function cifrarSecret(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

async function seedSuperAdminUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/barberos',
  });
  await client.connect();

  const email = 'superadmin@barberos.app';
  const password = 'SuperAdmin123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const totpSecretCifrado = cifrarSecret('JBSWY3DPEHPK3PXP');

  // Insertar o actualizar superadmin en plataforma_admins
  await client.query(`
    INSERT INTO plataforma_admins (email, password_hash, totp_secret_cifrado, totp_habilitado, activo)
    VALUES ($1, $2, $3, true, true)
    ON CONFLICT (email) DO UPDATE 
    SET password_hash = $2, totp_secret_cifrado = $3, activo = true
  `, [email, passwordHash, totpSecretCifrado]);

  console.log('✅ Usuario SuperAdmin asegurado en la base de datos:');
  console.log(`- Email: ${email}`);
  console.log(`- Password: ${password}`);
  console.log('- 2FA Código (Master PIN Dev): 123456');

  await client.end();
}

seedSuperAdminUser().catch(err => {
  console.error('Error asegurando usuario superadmin:', err);
  process.exit(1);
});
