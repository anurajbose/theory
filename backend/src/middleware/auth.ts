import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { als } from '../core/als';
import { clerkAuthenticate, clerkEnabled } from './clerkAuth';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  tid: string; // tenant id — drives all tenant isolation
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantId?: string;
      requestId?: string;
    }
  }
}

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false, data: null, meta: { requestId: req.requestId },
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions', details: null },
      });
      return;
    }
    next();
  };
}

/**
 * Verifies the access token AND establishes the per-request tenant context
 * (AsyncLocalStorage). All downstream handlers + Prisma calls are tenant-scoped
 * automatically — no route or controller changes required.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Dual-mode: when CLERK_SECRET_KEY is configured, trust Clerk session
  // tokens and JIT-provision our rows. Otherwise fall back to the legacy
  // JWT path so existing dev/demo flows keep working unchanged.
  if (clerkEnabled()) {
    void clerkAuthenticate(req, res, next);
    return;
  }

  const header = req.headers.authorization;
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false, data: null, meta: { requestId },
      error: { code: 'UNAUTHENTICATED', message: 'Missing token', details: null },
    });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as JwtPayload;
    if (!payload.tid) {
      res.status(401).json({
        success: false, data: null, meta: { requestId },
        error: { code: 'NO_TENANT', message: 'Token missing tenant claim', details: null },
      });
      return;
    }
    req.user = payload;
    req.tenantId = payload.tid;
    als.run(
      { tenantId: payload.tid, userId: payload.sub, role: payload.role, requestId },
      () => next(),
    );
  } catch {
    res.status(401).json({
      success: false, data: null, meta: { requestId },
      error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token', details: null },
    });
  }
}
