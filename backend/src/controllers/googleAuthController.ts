import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { rawPrisma } from '../utils/prisma';
import logger from '../utils/logger';
import { JwtPayload } from '../middleware/auth';

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
const ACCESS_EXPIRES    = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_DAYS = 7;

function signAccess(p: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(p, process.env.JWT_SECRET!, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions);
}
function signRefresh(p: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(p, process.env.JWT_REFRESH_SECRET!, { expiresIn: `${REFRESH_EXPIRES_DAYS}d` } as jwt.SignOptions);
}
function hashToken(t: string): string {
  return crypto.createHash('sha256').update(t).digest('hex');
}

/**
 * POST /api/auth/google
 * Body: { accessToken: string }  — the Google OAuth access token from the frontend
 * Looks up the user by Google-verified email. Fails if no matching active user exists.
 */
export async function googleAuth(req: Request, res: Response): Promise<void> {
  const { accessToken: googleAccessToken } = req.body;

  if (!googleAccessToken) {
    res.status(400).json({ error: 'Google access token required' });
    return;
  }

  if (!process.env.VITE_GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID) {
    res.status(501).json({ error: 'Google SSO is not configured on this server' });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID!;

  try {
    // Use the access token to get user info from Google
    const client = new OAuth2Client(clientId);
    const tokenInfo = await client.getTokenInfo(googleAccessToken);

    if (!tokenInfo.email) {
      res.status(401).json({ error: 'Could not retrieve email from Google token' });
      return;
    }

    const email = tokenInfo.email.toLowerCase();

    // Find user in our DB by email
    const user = await rawPrisma.user.findFirst({
      where: { email },
      include: {
        dept: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!user || !user.active) {
      res.status(403).json({
        error: 'No active account found for this Google email. Contact your admin.',
      });
      return;
    }

    const tid = user.tenantId ?? DEFAULT_TENANT;
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tid,
    };

    const accessToken  = signAccess(payload);
    const refreshToken = signRefresh(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);

    await rawPrisma.refreshToken.create({
      data: { userId: user.id, tenantId: tid, tokenHash: hashToken(refreshToken), expiresAt },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        jobRole: user.jobRole,
        onboarded: user.onboarded,
        dept: user.dept,
        team: user.team,
        managerId: user.managerId,
      },
    });
  } catch (err) {
    logger.error('Google auth error', err);
    res.status(401).json({ error: 'Invalid Google token' });
  }
}
