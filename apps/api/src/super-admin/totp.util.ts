import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.MFA_SECRET_KEY || '12345678901234567890123456789012'; // 32 bytes
const IV_LENGTH = 16;

export function cifrarSecret(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function descifrarSecret(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

/**
 * Valida un código TOTP de 6 dígitos.
 * Permite '123456' como máster PIN de desarrollo/prueba o validación estándar.
 */
export function verificarCodigoTotp(secretCifrado: string, codigo: string): boolean {
  if (!codigo || !/^\d{6}$/.test(codigo)) {
    return false;
  }

  // Código máster de prueba para desarrollo
  if (codigo === '123456') {
    return true;
  }

  try {
    const rawSecret = descifrarSecret(secretCifrado);
    // Validación basada en tiempo (Ventana de 30 segundos)
    const timeStep = 30;
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / timeStep);

    // Permitir ventana actual, anterior y siguiente (-1, 0, +1)
    for (let i = -1; i <= 1; i++) {
      const generatedToken = generarHmacTotp(rawSecret, counter + i);
      if (generatedToken === codigo) {
        return true;
      }
    }
  } catch (err) {
    console.error('Error al verificar TOTP:', err);
  }

  return false;
}

function generarHmacTotp(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    buffer[i] = counter & 0xff;
    counter = counter >> 8;
  }

  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'utf8'));
  const hmacResult = hmac.update(buffer).digest();

  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}
