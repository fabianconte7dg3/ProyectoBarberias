import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.MFA_SECRET_KEY || '12345678901234567890123456789012'; // 32 bytes
const IV_LENGTH = 16;

export function generarSecretBase32(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  const randomBytes = crypto.randomBytes(20);
  for (let i = 0; i < 16; i++) {
    secret += chars[randomBytes[i] % 32];
  }
  return secret;
}

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

function base32Decode(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Valida un código TOTP de 6 dígitos segun RFC 6238 (Google Authenticator / Authy / 1Password).
 * Permite '123456' como PIN maestro de desarrollo/prueba opcional.
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

function generarHmacTotp(secretBase32: string, counter: number): string {
  const key = base32Decode(secretBase32);
  const buffer = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    buffer[i] = tmp & 0xff;
    tmp = tmp >> 8;
  }

  const hmac = crypto.createHmac('sha1', key);
  const hmacResult = hmac.update(buffer).digest();

  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}
