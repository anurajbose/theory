import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

/**
 * Storage abstraction. Local filesystem now (EXPORT_DIR, default tmp);
 * an S3 driver can replace put/get behind this same interface later
 * (documented follow-up — no caller change needed).
 */
const ROOT = process.env.EXPORT_DIR || path.join(os.tmpdir(), 'theory-exports');
const SIGN_SECRET = process.env.EXPORT_SIGN_SECRET || process.env.JWT_SECRET || 'dev';

function safeKey(key: string): string {
  // prevent path traversal — keys are opaque (tenant/job scoped) ids only
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function putObject(key: string, data: string | Buffer): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(path.join(ROOT, safeKey(key)), data);
}

export async function getObject(key: string): Promise<Buffer> {
  return fs.readFile(path.join(ROOT, safeKey(key)));
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await fs.access(path.join(ROOT, safeKey(key)));
    return true;
  } catch {
    return false;
  }
}

/* ── Signed short-lived download tokens (HMAC, no external dep) ── */
function hmac(payload: string): string {
  return crypto.createHmac('sha256', SIGN_SECRET).update(payload).digest('base64url');
}

/** token = base64url(jobId).expEpoch.sig — defence-in-depth atop auth+ownership. */
export function signDownload(jobId: string, ttlSeconds = 300): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = `${Buffer.from(jobId).toString('base64url')}.${exp}`;
  return `${body}.${hmac(body)}`;
}

export function verifyDownload(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [b64, expStr, sig] = parts;
  const body = `${b64}.${expStr}`;
  const expected = hmac(body);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(expStr) < Math.floor(Date.now() / 1000)) return null; // expired
  return Buffer.from(b64, 'base64url').toString();
}
