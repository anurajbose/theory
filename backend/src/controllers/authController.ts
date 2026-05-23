import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { rawPrisma } from '../utils/prisma';
import logger from '../utils/logger';
import { JwtPayload } from '../middleware/auth';
import { verifyPassword, hashPassword } from '../core/password';
import { writeAudit } from '../core/audit';
import { sendMail } from '../core/mailer';
import { verifyCaptcha } from '../core/captcha';
import {
  issueSession, signMfaChallenge, hashToken, DEFAULT_TENANT,
} from '../core/session';

/* ── schemas ── */
export const registerSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8).max(128),
});
export const forgotSchema = z.object({ email: z.string().email() });
export const resetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(128),
});

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { name, email, password } = parsed.data;
  const ip = req.ip ?? null;
  const ua = (req.headers['user-agent'] as string) ?? null;
  try {
    const existing = await rawPrisma.user.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({ error: 'An account with that email already exists' });
      return;
    }

    // First registered user becomes ADMIN; everyone else gets EMPLOYEE.
    const count = await rawPrisma.user.count({ where: { tenantId: DEFAULT_TENANT } });
    const role = count === 0 ? 'ADMIN' : 'EMPLOYEE';

    const passwordHash = await hashPassword(password);
    const user = await rawPrisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        tenantId: DEFAULT_TENANT,
        active: true,
        onboarded: false,
      },
      include: {
        dept: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    await writeAudit({
      action: 'auth.register', entity: 'User', entityId: user.id,
      userId: user.id, tenantId: user.tenantId, ip, userAgent: ua,
    });

    const { accessToken, refreshToken } = await issueSession(user, req);
    res.status(201).json({
      accessToken, refreshToken,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        jobRole: user.jobRole, onboarded: user.onboarded,
        dept: user.dept, team: user.team, managerId: user.managerId,
      },
    });
  } catch (err) {
    logger.error('Register error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password, captchaToken } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }
  const ip = req.ip ?? null;
  const ua = (req.headers['user-agent'] as string) ?? null;

  if (!(await verifyCaptcha(captchaToken, ip))) {
    res.status(400).json({ error: 'Captcha verification failed', code: 'CAPTCHA_FAILED' });
    return;
  }
  try {
    const user = await rawPrisma.user.findFirst({
      where: { email: String(email).toLowerCase() },
      include: {
        dept: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!user || !user.active) {
      await writeAudit({ action: 'auth.login_failed', entity: 'User',
        after: { email: String(email).toLowerCase(), reason: 'no_user' }, ip, userAgent: ua });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const { valid, rehash } = await verifyPassword(user.passwordHash, password);
    if (!valid) {
      await writeAudit({ action: 'auth.login_failed', entity: 'User', entityId: user.id,
        userId: user.id, tenantId: user.tenantId, after: { reason: 'bad_password' }, ip, userAgent: ua });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    if (rehash) {
      await rawPrisma.user.update({ where: { id: user.id }, data: { passwordHash: rehash } });
    }

    // SSO enforcement — tenants with ssoEnforced cannot use password login.
    if (user.tenantId) {
      const tenant = await rawPrisma.tenant.findUnique({
        where: { id: user.tenantId }, select: { ssoEnforced: true },
      });
      if (tenant?.ssoEnforced) {
        await writeAudit({ action: 'auth.login_blocked_sso', entity: 'User', entityId: user.id,
          userId: user.id, tenantId: user.tenantId, ip, userAgent: ua });
        res.status(403).json({ error: 'Password login disabled — use SSO', code: 'SSO_REQUIRED' });
        return;
      }
    }

    // MFA gate — defer token issuance to the TOTP step.
    if (user.mfaEnabled) {
      res.json({ mfaRequired: true, mfaToken: signMfaChallenge(user.id) });
      return;
    }

    const { accessToken, refreshToken } = await issueSession(user, req);
    res.json({
      accessToken, refreshToken,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        jobRole: user.jobRole, onboarded: user.onboarded,
        dept: user.dept, team: user.team, managerId: user.managerId,
      },
    });
  } catch (err) {
    logger.error('Login error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as JwtPayload;
    const stored = await rawPrisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash: hashToken(refreshToken), revoked: false, expiresAt: { gt: new Date() } },
    });
    if (!stored) {
      res.status(401).json({ error: 'Invalid or revoked refresh token' });
      return;
    }
    await rawPrisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    const user = await rawPrisma.user.findFirst({ where: { id: payload.sub } });
    if (!user || !user.active) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const { accessToken, refreshToken: newRefresh } = await issueSession(user, req);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const payload = jwt.decode(refreshToken) as JwtPayload | null;
      if (payload?.sub) {
        await rawPrisma.refreshToken.updateMany({
          where: { userId: payload.sub, tokenHash: hashToken(refreshToken), revoked: false },
          data: { revoked: true },
        });
        await writeAudit({ action: 'auth.logout', entity: 'User', entityId: payload.sub,
          userId: payload.sub, tenantId: payload.tid ?? null,
          ip: req.ip ?? null, userAgent: (req.headers['user-agent'] as string) ?? null });
      }
    } catch { /* silent */ }
  }
  res.json({ message: 'Logged out' });
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = await rawPrisma.user.findFirst({
      where: { id: req.user!.sub, tenantId: req.user!.tid },
      select: {
        id: true, name: true, email: true, role: true, jobRole: true,
        onboarded: true, avatarUrl: true, managerId: true, createdAt: true,
        mfaEnabled: true,
        dept: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    logger.error('Me error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/* ── Password reset (no account enumeration) ── */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as z.infer<typeof forgotSchema>;
  if (!(await verifyCaptcha(req.body?.captchaToken, req.ip ?? null))) {
    res.status(400).json({ error: 'Captcha verification failed', code: 'CAPTCHA_FAILED' });
    return;
  }
  const user = await rawPrisma.user.findFirst({
    where: { email: email.toLowerCase(), active: true },
    select: { id: true, email: true },
  });
  if (user) {
    const raw = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000);
    await rawPrisma.user.update({
      where: { id: user.id },
      data: { pwResetTokenHash: hashToken(raw), pwResetExpiresAt: expires },
    });
    const link = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${raw}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your THEORY password',
      html: `<p>Reset your password (valid 30 min):</p><p><a href="${link}">${link}</a></p>`,
    });
    await writeAudit({ action: 'auth.password_reset_requested', entity: 'User', entityId: user.id,
      userId: user.id, ip: req.ip ?? null });
  }
  // Always 200 — never reveal whether the email exists.
  res.json({ ok: true });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as z.infer<typeof resetSchema>;
  const user = await rawPrisma.user.findFirst({
    where: { pwResetTokenHash: hashToken(token), pwResetExpiresAt: { gt: new Date() }, active: true },
  });
  if (!user) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
    return;
  }
  await rawPrisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      pwResetTokenHash: null,
      pwResetExpiresAt: null,
    },
  });
  // Invalidate every existing session on password change.
  await rawPrisma.refreshToken.updateMany({
    where: { userId: user.id, revoked: false },
    data: { revoked: true },
  });
  await writeAudit({ action: 'auth.password_reset', entity: 'User', entityId: user.id,
    userId: user.id, tenantId: user.tenantId, ip: req.ip ?? null });
  res.json({ ok: true });
}
