/**
 * SECURITY — OWASP Top-10-aligned auditable pass over THEORY's guarantees.
 * Deterministic, no live server. Each block cites the OWASP category it covers.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { als } from '../src/core/als';
import prisma, { rawPrisma } from '../src/utils/prisma';
import { authenticate } from '../src/middleware/auth';
import { hashPassword, verifyPassword } from '../src/core/password';
import { sanitizeForAI } from '../src/core/ai/redaction';
import { authLimiter, apiLimiter } from '../src/middleware/rateLimit';
import { createBody } from '../src/controllers/workItemController';
import { Role } from '@prisma/client';

const TX = '00000000-0000-0000-0000-0000000sec01';
const TY = '00000000-0000-0000-0000-0000000sec02';

describe('A01 Broken Access Control — tenant isolation', () => {
  let uY: string;
  beforeAll(async () => {
    for (const id of [TX, TY]) {
      await rawPrisma.tenant.upsert({ where: { id }, update: {},
        create: { id, name: id, slug: id, status: 'ACTIVE', plan: 'ENTERPRISE' } });
    }
    uY = (await rawPrisma.user.create({ data: { tenantId: TY, name: 'Y', email: `secy-${Date.now()}@y.io`, passwordHash: 'x' } })).id;
  });
  afterAll(async () => {
    await rawPrisma.user.deleteMany({ where: { tenantId: { in: [TX, TY] } } });
    await rawPrisma.tenant.deleteMany({ where: { id: { in: [TX, TY] } } });
    await rawPrisma.$disconnect();
  });

  it('tenant X cannot read tenant Y users via the guarded client', async () => {
    const seen = await als.run(
      { tenantId: TX, userId: 'x', role: Role.ADMIN, requestId: 't' },
      async () => prisma.user.findMany({}),
    );
    expect(seen.find((u) => u.id === uY)).toBeUndefined();
  });
});

describe('A03 Injection — input is schema-validated (Prisma also parameterises)', () => {
  it('Zod rejects malformed / oversized input before it reaches the ORM', () => {
    expect(() => createBody.parse({ title: '', sectionType: '' })).toThrow();
    expect(() => createBody.parse({ title: 'x'.repeat(9999), sectionType: 'CR' })).toThrow();
    expect(createBody.parse({ title: 'ok', sectionType: 'CR' }).title).toBe('ok');
  });
});

describe('A07 Auth Failures — bearer required & verified', () => {
  function harness(authHeader?: string) {
    const r: { status: number; nexted: boolean } = { status: 0, nexted: false };
    const res = {
      status(c: number) { r.status = c; return res; },
      json() { return res; },
      setHeader() { return res; },
    } as unknown as Response;
    const next: NextFunction = () => { r.nexted = true; };
    authenticate({ headers: authHeader ? { authorization: authHeader } : {} } as unknown as Request, res, next);
    return r;
  }
  it('rejects missing and invalid tokens with 401, never calls next', () => {
    expect(harness()).toMatchObject({ status: 401, nexted: false });
    expect(harness('Bearer not-a-jwt')).toMatchObject({ status: 401, nexted: false });
  });
});

describe('A02 Cryptographic Failures — Argon2id at rest', () => {
  it('passwords hash with Argon2id and verify; tampered fails', async () => {
    const h = await hashPassword('S3cret!pw');
    expect(h.startsWith('$argon2id$')).toBe(true);
    expect((await verifyPassword(h, 'S3cret!pw')).valid).toBe(true);
    expect((await verifyPassword(h, 'wrong')).valid).toBe(false);
  });
  it('legacy bcrypt hashes verify AND are flagged for rehash to Argon2id', async () => {
    const bcrypt = (await import('bcrypt')).default;
    const legacy = await bcrypt.hash('old', 10);
    const r = await verifyPassword(legacy, 'old');
    expect(r.valid).toBe(true);
    expect(r.rehash?.startsWith('$argon2id$')).toBe(true);
  });
});

describe('A08/A02 Sensitive data — secrets never leave for AI', () => {
  it('redaction strips journals/credentials recursively', () => {
    const { clean, redacted } = sanitizeForAI({ ok: 1, journal: 'J', user: { passwordHash: 'h' } });
    expect(JSON.stringify(clean)).not.toMatch(/"J"|"h"/);
    expect(redacted).toEqual(expect.arrayContaining(['journal', 'user.passwordHash']));
  });
});

describe('A04/A05 Rate limiting & misconfig — limiters wired', () => {
  it('auth + api limiters are configured middleware', () => {
    expect(typeof authLimiter).toBe('function');
    expect(typeof apiLimiter).toBe('function');
  });
});
