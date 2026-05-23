import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Request, Response } from 'express';
import { als } from '../src/core/als';
import { rawPrisma } from '../src/utils/prisma';
import { managerOverview, managerActivity } from '../src/controllers/managerController';
import { Role } from '@prisma/client';

const TM = '00000000-0000-0000-0000-00000000mg01';
const TN = '00000000-0000-0000-0000-00000000mg02';

function mockRes() {
  const r: { body: { data?: unknown } } = { body: {} };
  const res = {
    status() { return res; },
    json(b: unknown) { r.body = b as typeof r.body; return res; },
    setHeader() { return res; },
  } as unknown as Response;
  return { res, r };
}
const run = <T>(tid: string, uid: string, role: Role, fn: () => Promise<T>) =>
  als.run({ tenantId: tid, userId: uid, role, requestId: 't' }, async () => fn());

describe('manager console — tenant + RBAC scoped', () => {
  let mgr: string;
  let rep: string;
  let other: string; // tenant N user — must never appear

  beforeAll(async () => {
    for (const id of [TM, TN]) {
      await rawPrisma.tenant.upsert({
        where: { id }, update: {},
        create: { id, name: id, slug: id, status: 'ACTIVE', plan: 'ENTERPRISE' },
      });
    }
    mgr = (await rawPrisma.user.create({ data: { tenantId: TM, name: 'Mgr', role: 'MANAGER', email: `mg-${Date.now()}@m.io`, passwordHash: 'x' } })).id;
    rep = (await rawPrisma.user.create({ data: { tenantId: TM, name: 'Rep', managerId: mgr, email: `rp-${Date.now()}@m.io`, passwordHash: 'x' } })).id;
    other = (await rawPrisma.user.create({ data: { tenantId: TN, name: 'Other', email: `ot-${Date.now()}@n.io`, passwordHash: 'x' } })).id;
    await rawPrisma.workItem.create({ data: { tenantId: TM, userId: rep, sectionType: 'CR', title: 'r', status: 'BLOCKED' } });
    await rawPrisma.workItem.create({ data: { tenantId: TN, userId: other, sectionType: 'CR', title: 'o', status: 'BLOCKED' } });
    await rawPrisma.activityEvent.create({ data: { tenantId: TM, actorId: rep, verb: 'created', entityType: 'WorkItem', entityId: 'x', summary: 's' } });
    await rawPrisma.activityEvent.create({ data: { tenantId: TN, actorId: other, verb: 'created', entityType: 'WorkItem', entityId: 'y', summary: 's' } });
  });
  afterAll(async () => {
    await rawPrisma.activityEvent.deleteMany({ where: { tenantId: { in: [TM, TN] } } });
    await rawPrisma.workItem.deleteMany({ where: { tenantId: { in: [TM, TN] } } });
    await rawPrisma.user.deleteMany({ where: { tenantId: { in: [TM, TN] } } });
    await rawPrisma.tenant.deleteMany({ where: { id: { in: [TM, TN] } } });
    await rawPrisma.$disconnect();
  });

  it('manager overview counts only own-tenant direct reports', async () => {
    const { res, r } = mockRes();
    await run(TM, mgr, Role.MANAGER, () =>
      managerOverview({ user: { sub: mgr, role: 'MANAGER', tid: TM } } as unknown as Request, res));
    const d = r.body.data as { memberCount: number; blockers: number };
    expect(d.memberCount).toBe(1); // only `rep`, never tenant-N `other`
    expect(d.blockers).toBe(1);
  });

  it('ADMIN "all users" is still tenant-bounded (never cross-tenant)', async () => {
    const { res, r } = mockRes();
    await run(TM, mgr, Role.ADMIN, () =>
      managerOverview({ user: { sub: mgr, role: 'ADMIN', tid: TM } } as unknown as Request, res));
    // tenant TM users = mgr + rep = 2; tenant-N `other` excluded by the guard
    expect((r.body.data as { memberCount: number }).memberCount).toBe(2);
  });

  it('team activity feed is tenant + member scoped', async () => {
    const { res, r } = mockRes();
    await run(TM, mgr, Role.MANAGER, () =>
      managerActivity({ user: { sub: mgr, role: 'MANAGER', tid: TM } } as unknown as Request, res));
    const items = (r.body.data as { items: { tenantId: string }[] }).items;
    expect(items.length).toBe(1);
    expect(items.every((e) => e.tenantId === TM)).toBe(true);
  });
});
