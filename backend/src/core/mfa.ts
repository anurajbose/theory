import { authenticator } from 'otplib';
import { encrypt, decrypt } from '../services/encryption';

const ISSUER = process.env.MFA_ISSUER || 'THEORY';

// Allow ±1 step (30s) clock drift.
authenticator.options = { window: 1 };

export function generateSecret(): string {
  return authenticator.generateSecret();
}

/** otpauth:// URI the authenticator app encodes as a QR. */
export function otpauthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

export function verifyTotp(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: token.replace(/\s/g, ''), secret });
  } catch {
    return false;
  }
}

/** Secrets are stored AES-256-GCM encrypted, never in plaintext. */
export const encryptSecret = (s: string) => encrypt(s);
export const decryptSecret = (s: string) => decrypt(s);
