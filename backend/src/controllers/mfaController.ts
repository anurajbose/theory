import { Request, Response } from 'express';
import { z } from 'zod';
import { rawPrisma } from '../utils/prisma';
import { ok, AppError } from '../core/http';
import { writeAudit } from '../core/audit';
import {
  generateSecret, otpauthUrl, verifyTotp, encryptSecret, decryptSecret,
} from '../core/mfa';
import { issueSession, verifyMfaChallenge } from '../core/session';

export const codeSchema = z.object({ code: z.string().min(6).max(8) });
export const mfaLoginSchema = z.object({
  mfaToken: z.string().min(10),
  code: z.string().min(6).max(8),
});

/** POST /auth/mfa/setup — generate (not yet enabled) secret + provisioning URI. */
export async function mfaSetup(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const user = await rawPrisma.user.findFirst({
    where: { id: userId, tenantId: req.user!.tid },
    select: { email: true, mfaEnabled: true },
  });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  if (user.mfaEnabled) throw new AppError(409, 'MFA_ALREADY_ON', 'MFA already enabled');

  const secret = generateSecret();
  await rawPrisma.user.update({
    where: { id: userId },
    data: { mfaSecret: encryptSecret(secret) },
  });
  ok(res, { otpauthUrl: otpauthUrl(user.email, secret), secret });
}

/** POST /auth/mfa/enable — confirm a code, then turn MFA on. */
export async function mfaEnable(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { code } = req.body as z.infer<typeof codeSchema>;
  const user = await rawPrisma.user.findFirst({
    where: { id: userId, tenantId: req.user!.tid },
    select: { mfaSecret: true },
  });
  if (!user?.mfaSecret) throw new AppError(400, 'MFA_NOT_SETUP', 'Run MFA setup first');
  if (!verifyTotp(code, decryptSecret(user.mfaSecret))) {
    throw new AppError(401, 'MFA_INVALID', 'Invalid code');
  }
  await rawPrisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
  await writeAudit({ action: 'auth.mfa_enabled', entity: 'User', entityId: userId,
    userId, tenantId: req.user!.tid, ip: req.ip ?? null });
  ok(res, { enabled: true });
}

/** POST /auth/mfa/disable — requires a valid current code. */
export async function mfaDisable(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { code } = req.body as z.infer<typeof codeSchema>;
  const user = await rawPrisma.user.findFirst({
    where: { id: userId, tenantId: req.user!.tid },
    select: { mfaSecret: true, mfaEnabled: true },
  });
  if (!user?.mfaEnabled || !user.mfaSecret) throw new AppError(400, 'MFA_OFF', 'MFA is not enabled');
  if (!verifyTotp(code, decryptSecret(user.mfaSecret))) {
    throw new AppError(401, 'MFA_INVALID', 'Invalid code');
  }
  await rawPrisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: false, mfaSecret: null },
  });
  await writeAudit({ action: 'auth.mfa_disabled', entity: 'User', entityId: userId,
    userId, tenantId: req.user!.tid, ip: req.ip ?? null });
  ok(res, { enabled: false });
}

/** POST /auth/mfa/login — second factor after password; issues the session. */
export async function mfaLogin(req: Request, res: Response): Promise<void> {
  const { mfaToken, code } = req.body as z.infer<typeof mfaLoginSchema>;
  const userId = verifyMfaChallenge(mfaToken);
  if (!userId) throw new AppError(401, 'MFA_CHALLENGE_INVALID', 'MFA session expired — sign in again');

  const user = await rawPrisma.user.findFirst({
    where: { id: userId, active: true },
    include: {
      dept: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
    },
  });
  if (!user?.mfaSecret || !user.mfaEnabled) throw new AppError(400, 'MFA_OFF', 'MFA not enabled');
  if (!verifyTotp(code, decryptSecret(user.mfaSecret))) {
    await writeAudit({ action: 'auth.mfa_failed', entity: 'User', entityId: user.id,
      userId: user.id, tenantId: user.tenantId, ip: req.ip ?? null });
    throw new AppError(401, 'MFA_INVALID', 'Invalid code');
  }

  const { accessToken, refreshToken } = await issueSession(user, req);
  ok(res, {
    accessToken, refreshToken,
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      jobRole: user.jobRole, onboarded: user.onboarded,
      dept: user.dept, team: user.team, managerId: user.managerId,
    },
  });
}
