import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { rawPrisma } from '../src/utils/prisma';
import { PLAN_RANK, requirePlan, requireActiveTenant } from '../src/core/billing/plan';
import { verifyRazorpaySignature, applyBillingEvent } from '../src/core/billing/webhook';
import { login } from '../src/controllers/authController';
import { hashPassword } from '../src/core/password';
import { TenantPlan, TenantStatus } from '@prisma/client';

const T = '00000000-0000-0000-0000-00000000bl01';

function mw() {
  const r: { status: number; body: unknown; nexted: boolean } = { status: 0, body: null, nexted: false };
  const res = {
    status(c: number) { r.status = c; return res; },
    json(b: unknown) { r.body = b; return res; },
  } as unknown as Response;
  const next: NextFunction = () => { r.nexted = true; };
  return { res, next, r };
}
const reqFor = (tid: string) => ({ user: { tid } } as unknown as Request);
const setTenant = (plan: TenantPlan, status: TenantStatus, ssoEnforced = false) =>
  rawPrisma.tenant.upsert({
    where: { id: T },
    update: { plan, status, ssoEnforced },
    create: { id: T, name: T, slug: T, plan, status, ssoEnforced },
  });

describe('Sprint 19 — billing + SSO (single lifecycle)', () => {
  beforeAll(() => setTenant('PRO', 'ACTIVE'));
  afterAll(async () => {
    await rawPrisma.subscription.deleteMany({ where: { tenantId: T } });
    await rawPrisma.user.deleteMany({ where: { tenantId: T } });
    await rawPrisma.tenant.deleteMany({ where: { id: T } });
    await rawPrisma.$disconnect();
  });

  it('ranks plans FREE < PRO < ENTERPRISE', () => {
    expect(PLAN_RANK.FREE).toBeLessThan(PLAN_RANK.PRO);
    expect(PLAN_RANK.PRO).toBeLessThan(PLAN_RANK.ENTERPRISE);
  });

  it('requirePlan(PRO): allows PRO tenant, denies FREE (402)', async () => {
    await setTenant('PRO', 'ACTIVE');
    const ok = mw();
    await requirePlan('PRO')(reqFor(T), ok.res, ok.next);
    expect(ok.r.nexted).toBe(true);

    await setTenant('FREE', 'ACTIVE');
    const denied = mw();
    await requirePlan('PRO')(reqFor(T), denied.res, denied.next);
    expect(denied.r.nexted).toBe(false);
    expect(denied.r.status).toBe(402);
  });

  it('requireActiveTenant blocks SUSPENDED (403)', async () => {
    await setTenant('PRO', 'SUSPENDED');
    const s = mw();
    await requireActiveTenant(reqFor(T), s.res, s.next);
    expect(s.r.nexted).toBe(false);
    expect(s.r.status).toBe(403);
  });

  it('webhook HMAC verify: valid passes, tamper/secret-mismatch fails', () => {
    const raw = Buffer.from('{"x":1}');
    const sig = crypto.createHmac('sha256', 'whsec').update(raw).digest('hex');
    expect(verifyRazorpaySignature(raw, sig, 'whsec')).toBe(true);
    expect(verifyRazorpaySignature(raw, sig, 'wrong')).toBe(false);
    expect(verifyRazorpaySignature(raw, 'deadbeef', 'whsec')).toBe(false);
  });

  it('applyBillingEvent upserts subscription + reflects plan/status on tenant', async () => {
    await setTenant('FREE', 'TRIAL');
    await applyBillingEvent({ tenantId: T, provider: 'razorpay', externalId: 'sub_1', plan: 'ENTERPRISE', status: 'active' });
    const sub = await rawPrisma.subscription.findUnique({ where: { tenantId: T } });
    const ten = await rawPrisma.tenant.findUnique({ where: { id: T } });
    expect(sub?.plan).toBe('ENTERPRISE');
    expect(ten?.plan).toBe('ENTERPRISE');
    expect(ten?.status).toBe('ACTIVE');
  });

  it('password login is blocked when the tenant enforces SSO', async () => {
    await setTenant('ENTERPRISE', 'ACTIVE', true);
    const email = `sso-${Date.now()}@bl.io`;
    await rawPrisma.user.create({
      data: { tenantId: T, name: 'S', email, passwordHash: await hashPassword('Secret@123'), active: true },
    });
    const r: { status: number; body: { code?: string } } = { status: 0, body: {} };
    const res = {
      status(c: number) { r.status = c; return res; },
      json(b: unknown) { r.body = b as { code?: string }; return res; },
    } as unknown as Response;
    await login(
      { body: { email, password: 'Secret@123' }, ip: '127.0.0.1', headers: {} } as unknown as Request,
      res,
    );
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('SSO_REQUIRED');
  });
});
