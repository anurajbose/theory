import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authenticator } from 'otplib';
import { als } from '../src/core/als';
import { rawPrisma } from '../src/utils/prisma';
import {
  generateSecret, verifyTotp, encryptSecret, decryptSecret, otpauthUrl,
} from '../src/core/mfa';
import { signMfaChallenge, verifyMfaChallenge } from '../src/core/session';
import { revokeSession } from '../src/controllers/sessionController';
import { Role } from '@prisma/client';
import type { Request, Response } from 'express';

process.env.JWT_SECRET ||= 'test_secret';

const TA = '00000000-0000-0000-0000-00000000sa01';
const TB = '00000000-0000-0000-0000-00000000sa02';

function mockRes() {
  const r: { statusCode: number; body: unknown } = { statusCode: 200, body: undefined };
  const res = {
    status(c: number) { r.statusCode = c; return res; },
    json(b: unknown) { r.body = b; return res; },
    setHeader() { return res; },
  } as unknown as Response;
  return { res, r };
}

describe('MFA / TOTP', () => {
  it('verifies a valid TOTP and rejects a wrong one', () => {
    const secret = generateSecret();
    expect(otpauthUrl('a@b.io', secret)).toContain('otpauth://totp/');
    expect(verifyTotp(authenticator.generate(secret), secret)).toBe(true);
    expect(verifyTotp('000000', secret)).toBe(false);
  });

  it('encrypts/decrypts the secret at rest (round-trip, ciphertext differs)', () => {
    const s = generateSecret();
    const enc = encryptSecret(s);
    expect(enc).not.toBe(s);
    expect(decryptSecret(enc)).toBe(s);
  });

  it('MFA challenge token round-trips and rejects tampering', () => {
    const tok = signMfaChallenge('user-123');
    expect(verifyMfaChallenge(tok)).toBe('user-123');
    expect(verifyMfaChallenge(tok + 'x')).toBeNull();
  });
});

describe('session revoke — tenant + user scoped', () => {
  let uA: string;
  let uB: string;
  let sessB: string;

  beforeAll(async () => {
    for (const id of [TA, TB]) {
      await rawPrisma.tenant.upsert({
        where: { id }, update: {},
        create: { id, name: id, slug: id, status: 'ACTIVE', plan: 'ENTERPRISE' },
      });
    }
    const a = await rawPrisma.user.create({ data: { tenantId: TA, name: 'A', email: `sa-${Date.now()}@a.io`, passwordHash: 'x' } });
    const b = await rawPrisma.user.create({ data: { tenantId: TB, name: 'B', email: `sb-${Date.now()}@b.io`, passwordHash: 'x' } });
    uA = a.id; uB = b.id;
    const rt = await rawPrisma.refreshToken.create({
      data: { tenantId: TB, userId: uB, tokenHash: 'h', expiresAt: new Date(Date.now() + 8.64e7) },
    });
    sessB = rt.id;
  });

  afterAll(async () => {
    await rawPrisma.refreshToken.deleteMany({ where: { tenantId: { in: [TA, TB] } } });
    await rawPrisma.user.deleteMany({ where: { tenantId: { in: [TA, TB] } } });
    await rawPrisma.tenant.deleteMany({ where: { id: { in: [TA, TB] } } });
    await rawPrisma.$disconnect();
  });

  function callRevoke(tenantId: string, userId: string, sessionId: string) {
    const { res, r } = mockRes();
    const req = { user: { sub: userId, tid: tenantId }, params: { id: sessionId }, ip: '127.0.0.1', headers: {} } as unknown as Request;
    return als.run(
      { tenantId, userId, role: Role.ADMIN, requestId: 't' },
      async () => { await revokeSession(req, res); return r; },
    );
  }

  it('tenant A cannot revoke tenant B session', async () => {
    const r = await callRevoke(TA, uA, sessB);
    expect((r.body as { data: { revoked: number } }).data.revoked).toBe(0);
    const still = await rawPrisma.refreshToken.findUnique({ where: { id: sessB } });
    expect(still?.revoked).toBe(false);
  });

  it('tenant B owner revokes its own session', async () => {
    const r = await callRevoke(TB, uB, sessB);
    expect((r.body as { data: { revoked: number } }).data.revoked).toBe(1);
    const gone = await rawPrisma.refreshToken.findUnique({ where: { id: sessB } });
    expect(gone?.revoked).toBe(true);
  });
});
