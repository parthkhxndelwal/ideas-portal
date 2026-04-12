import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.QR_ENCRYPTION_KEY || 'SOLESTA26SECRETKEY2026XXXX';
const ALGORITHM = 'aes-256-cbc';

export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyCode(code: string, hashedCode: string): Promise<boolean> {
  return bcrypt.compare(code, hashedCode);
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function encryptQR(data: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptQR(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 2) return encryptedData;
    const iv = Buffer.from(parts[0], 'hex');
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedData;
  }
}

export function generateReferenceId(): string {
  const uuid = uuidv4().replace(/-/g, '').toUpperCase();
  const short = uuid.slice(0, 5);
  return `SOL26-${short}`;
}

export function isReferenceIdUnique(collisions: string[]): (() => string) {
  return () => {
    let refId: string;
    do {
      refId = generateReferenceId();
    } while (collisions.includes(refId));
    collisions.push(refId);
    return refId;
  };
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateRollNumber(rollNumber: string): boolean {
  const pattern = /^\d{10}$/;
  return pattern.test(rollNumber);
}