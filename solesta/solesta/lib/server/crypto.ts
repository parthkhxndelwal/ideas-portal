import crypto from 'crypto';

const SECRET_KEY = process.env.CRYPTO_SECRET || 'solesta-secret-key-change-in-production';

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function hashCode(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = SECRET_KEY;
    crypto.pbkdf2(code, salt, 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

export async function verifyCode(code: string, hash: string): Promise<boolean> {
  const codeHash = await hashCode(code);
  return crypto.timingSafeEqual(Buffer.from(codeHash), Buffer.from(hash));
}

export function generateReferenceId(existing: string[]): string {
  // Use UUID-based generation like the Telegram bot for consistency
  const uuid = crypto.randomUUID().replace(/-/g, '').toUpperCase();
  const short = uuid.slice(0, 5);
  const id = `SOL26-${short}`;
  
  if (existing.includes(id)) {
    return generateReferenceId(existing);
  }
  return id;
}

export function isReferenceIdUnique(existing: string[]): () => string {
  return () => generateReferenceId(existing);
}

export function encryptQR(data: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}