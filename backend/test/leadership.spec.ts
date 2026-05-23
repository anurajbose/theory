import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Request, Response } from 'express';
import { als } from '../src/core/als';
import { rawPrisma } from '../src/utils/prisma';
import { cached, invalidate } from '../src/core/cache';
import { orgOverview } from '../src/controllers/leadershipController';
import { Role } from '@prisma/client';

const TP = '00000000-0000-0000-0000-00000000ld01';
const TQ = '00000000-0000-0000-0000-00000000ld02';

function mockRes() {
  const r: { body: { data?: unknown } } = { body: {} };
  const res = { status() { return res; }, json(b: unknown) { r.body = b as typeof r.body; return res; }, setHeader() { return res; } } as unknown as Response;
  return { res, r };
}
const run = <T>(tid: string, fn: () => Promise<T>) =>
  als.run({ tenantId: tid, userId: 'u', role: Role.ADMIN, requestId: 't' }, async () => fn());

describe('read-model cache', () => {
  it('returns producer value and is resilient with/without Redis', async () => {
    let calls = 0;
    const v = await run(TP, () => cached('t', 30, async () => { calls++; return { n: 1 }; }));
    expect(v).toEqual({ n: 1 });
    expect(calls).toBe(1);
  });

  it('cache keys are tenant-scoped (no cross-tenant leakage of producer identity)', async () => {
    const a = await run(TP, () => cached('iso', 30, async () => ({ t: 'P' })));
    const b = await run(TQ, () => cached('iso', 30, async () => ({ t: 'Q' })));
    // Different tenants must each get their own value, never the other's.
    expect(a).toEqual({ t: 'P' });
    expect(b).toEqual({ t: 'Q' });
  });
});

describe('leadership analytics — tenant scoped', () => {
  beforeAll(async () => {
    for (const id of [TP, TQ]) {
      await rawPrisma.tenant.upsert({ where: { id }, update: {}, create: { id, name: id, slug: id, status: 'ACTIVE', plan: 'ENTERPRISE' } });
    }
    const up = await rawPrisma.user.create({ data: { tenantId: TP, name: 'P', email: `lp-${Date.now()}@p.io`, passwordHash: 'x' } });
    const uq = await rawPrisma.user.create({ data: { tenantId: TQ, name: 'Q', email: `lq-${Date.now()}@q.io`, passwordHash: 'x' } });
    await rawPrisma.workItem.create({ data: { tenantId: TP, userId: up.id, sectionType: 'CR', title: 'p', status: 'BLOCKED' } });
    await rawPrisma.workItem.create({ data: { tenantId: TQ, userId: uq.id, sectionType: 'CR', title: 'q', status: 'BLOCKED' } });
    await run(TP, () => invalidate('overview')); // ensure cold compute (deterministic vs warm Redis)
  });
  afterAll(async () => {
    await rawPrisma.workItem.deleteMany({ where: { tenantId: { in: [TP, TQ] } } });
    await rawPrisma.user.deleteMany({ where: { tenantId: { in: [TP, TQ] } } });
    await rawPrisma.tenant.deleteMany({ where: { id: { in: [TP, TQ] } } });
    await rawPrisma.$disconnect();
  });

  it('orgOverview aggregates only the active tenant', async () => {
    const { res, r } = mockRes();
    // unique cache name per run to avoid a warm entry masking the compute
    await run(TP, () => orgOverview({} as Request, res));
    const d = r.body.data as { userCount: number; blockers: number };
    expect(d.userCount).toBe(1);
    expect(d.blockers).toBe(1); // tenant-Q blocker excluded by the guard
  });
});
