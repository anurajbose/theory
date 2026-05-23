import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma'; // guarded → tenant-scoped automatically
import { ok } from '../core/http';
import { writeAudit } from '../core/audit';

export const sessionIdParam = z.object({ id: z.string().uuid() });

/** GET /auth/sessions — active devices/sessions for the current user. */
export async function listSessions(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const sessions = await prisma.refreshToken.findMany({
    where: { userId, revoked: false, expiresAt: { gt: new Date() } },
    select: { id: true, ip: true, userAgent: true, createdAt: true, lastUsedAt: true },
    orderBy: { lastUsedAt: 'desc' },
  });
  ok(res, { sessions });
}

/** DELETE /auth/sessions/:id — revoke a specific session (tenant+user scoped). */
export async function revokeSession(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { id } = req.params as z.infer<typeof sessionIdParam>;
  // guarded updateMany → cannot touch other tenants; userId pins it to caller.
  const { count } = await prisma.refreshToken.updateMany({
    where: { id, userId, revoked: false },
    data: { revoked: true },
  });
  await writeAudit({ action: 'auth.session_revoked', entity: 'RefreshToken', entityId: id,
    userId, tenantId: req.user!.tid, ip: req.ip ?? null, after: { count } });
  ok(res, { revoked: count });
}

/** POST /auth/sessions/revoke-all — sign out everywhere. */
export async function revokeAllSessions(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { count } = await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
  await writeAudit({ action: 'auth.sessions_revoked_all', entity: 'User', entityId: userId,
    userId, tenantId: req.user!.tid, ip: req.ip ?? null, after: { count } });
  ok(res, { revoked: count });
}
