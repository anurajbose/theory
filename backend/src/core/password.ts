import argon2 from 'argon2';
import bcrypt from 'bcrypt';

/**
 * Argon2id is the standard. Legacy bcrypt hashes are still verified, then
 * transparently re-hashed to Argon2id on next successful login (lazy migration).
 */
const ARGON_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB (OWASP)
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON_OPTS);
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<{ valid: boolean; rehash?: string }> {
  const isBcrypt = hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
  if (isBcrypt) {
    const valid = await bcrypt.compare(plain, hash);
    return valid ? { valid, rehash: await hashPassword(plain) } : { valid };
  }
  const valid = await argon2.verify(hash, plain);
  return { valid };
}
