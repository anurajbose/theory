import { Request } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { rawPrisma } from '../utils/prisma';
import { JwtPayload } from '../middleware/auth';
import { writeAudit } from './audit';

const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_DAYS = 7;
export const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

type Claims = Omit<JwtPayload, 'iat' | 'exp'>;

export const signAccess = (p: Claims) =>
  jwt.sign(p, process.env.JWT_SECRET!, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions);
export const signRefresh = (p: Claims) =>
  jwt.sign(p, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: `${REFRESH_EXPIRES_DAYS}d`,
  } as jwt.SignOptions);
export const hashToken = (t: string) =>
  crypto.createHash('sha256').update(t).digest('hex');

/** Short-lived MFA challenge token (issued between password + TOTP step). */
export const signMfaChallenge = (userId: string) =>
  jwt.sign({ sub: userId, purpose: 'mfa' }, process.env.JWT_SECRET!, { expiresIn: '5m' });
export function verifyMfaChallenge(token: string): string | null {
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; purpose?: string };
    return p.purpose === 'mfa' ? p.sub : null;
  } catch {
    return null;
  }
}

interface SessionUser {
  id: string;
  email: string;
  role: JwtPayload['role'];
  tenantId: string | null;
}

/** Single source of truth for issuing an authenticated session. */
export async function issueSession(user: SessionUser, req: Request) {
  const tid = user.tenantId ?? DEFAULT_TENANT;
  const payload: Claims = { sub: user.id, email: user.email, role: user.role, tid };
  const accessToken = signAccess(payload);
  const refreshToken = signRefresh(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);

  await rawPrisma.refreshToken.create({
    data: {
      userId: user.id,
      tenantId: tid,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      ip: req.ip ?? null,
      userAgent: (req.headers['user-agent'] as string) ?? null,
      lastUsedAt: new Date(),
    },
  });

  await writeAudit({
    action: 'auth.login', entity: 'User', entityId: user.id,
    userId: user.id, tenantId: tid,
    ip: req.ip ?? null, userAgent: (req.headers['user-agent'] as string) ?? null,
  });

  return { accessToken, refreshToken, tid };
}
