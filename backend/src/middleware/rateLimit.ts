import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';

/** Tenant bucket from the bearer token (decode only — bucketing, not auth). */
function tenantKey(req: Request): string {
  const ipPart = req.ip ?? 'unknown';
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) {
    try {
      const p = jwt.decode(h.slice(7)) as { tid?: string } | null;
      if (p?.tid) return `t:${p.tid}|${ipPart}`;
    } catch {
      /* fall through to ip */
    }
  }
  return ipPart;
}

const envelope = (msg: string) => ({
  success: false,
  data: null,
  meta: {},
  error: { code: 'RATE_LIMITED', message: msg, details: null },
});

// Pre-auth: brute-force shield, strictly per-IP.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: envelope('Too many attempts. Try again in 15 minutes.'),
});

// Wrong-input cooling period for /login: only FAILED attempts count
// (skipSuccessfulRequests), so a correct login never burns the budget.
// 6 bad attempts per IP → 15-minute lockout with a clear message.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: envelope(
    'Too many incorrect sign-in attempts. For your security sign-in is locked for 15 minutes — wait and try again, or use "Forgot password?".',
  ),
});

// Global API: per-tenant + per-IP fairness so one tenant cannot starve others.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: tenantKey,
  message: envelope('Rate limit exceeded.'),
});
