import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Request, Response } from 'express';
import { als } from '../src/core/als';
import { rawPrisma } from '../src/utils/prisma';
import { createComment, listComments } from '../src/controllers/commentController';
import { listActivity } from '../src/controllers/activityController';
import { Role } from '@prisma/client';

const TX = '00000000-0000-0000-0000-00000000co01';
const TY = '00000000-0000-0000-0000-00000000co02';

function mockRes() {
  const r: { statusCode: number; body: { data?: unknown; meta?: unknown } } = { statusCode: 200, body: {} };
  const res = {
    status(c: number) { r.statusCode = c; return res; },
    json(b: unknown) { r.body = b as typeof r.body; return res; },
    setHeader() { return res; },
  } as unknown as Response;
  return { res, r };
}
function run<T>(tid: string, uid: string, fn: () => Promise<T>) {
  return als.run({ tenantId: tid, userId: uid, role: Role.ADMIN, requestId: 't' }, async () => fn());
}

describe('collaboration — tenant scoped', () => {
  let ux: string;
  let uy: string;
  const wiId = '00000000-0000-0000-0000-0000000000wi';

  beforeAll(async () => {
    for (const id of [TX, TY]) {
      await rawPrisma.tenant.upsert({
        where: { id }, update: {},
        create: { id, name: id, slug: id, status: 'ACTIVE', plan: 'ENTERPRISE' },
      });
    }
    ux = (await rawPrisma.user.create({ data: { tenantId: TX, name: 'X', email: `cx-${Date.now()}@x.io`, passwordHash: 'x' } })).id;
    uy = (await rawPrisma.user.create({ data: { tenantId: TY, name: 'Y', email: `cy-${Date.now()}@y.io`, passwordHash: 'x' } })).id;
  });
  afterAll(async () => {
    await rawPrisma.activityEvent.deleteMany({ where: { tenantId: { in: [TX, TY] } } });
    await rawPrisma.comment.deleteMany({ where: { tenantId: { in: [TX, TY] } } });
    await rawPrisma.notification.deleteMany({ where: { tenantId: { in: [TX, TY] } } });
    await rawPrisma.user.deleteMany({ where: { tenantId: { in: [TX, TY] } } });
    await rawPrisma.tenant.deleteMany({ where: { id: { in: [TX, TY] } } });
    await rawPrisma.$disconnect();
  });

  it('creates a comment + records activity, both tenant-stamped', async () => {
    const { res, r } = mockRes();
    const req = {
      user: { sub: ux, tid: TX },
      body: { entityType: 'WorkItem', entityId: wiId, body: 'hello' },
    } as unknown as Request;
    await run(TX, ux, () => createComment(req, res));
    expect(r.statusCode).toBe(201);
    const c = await rawPrisma.comment.findFirst({ where: { authorId: ux } });
    expect(c?.tenantId).toBe(TX);
    const a = await rawPrisma.activityEvent.findFirst({ where: { actorId: ux, verb: 'commented' } });
    expect(a?.tenantId).toBe(TX);
  });

  it('drops cross-tenant mentions (only same-tenant users kept)', async () => {
    const { res, r } = mockRes();
    const req = {
      user: { sub: ux, tid: TX },
      body: { entityType: 'WorkItem', entityId: wiId, body: 'ping', mentions: [uy, ux] },
    } as unknown as Request;
    await run(TX, ux, () => createComment(req, res));
    const created = (r.body.data as { mentions: string[] });
    expect(created.mentions).toContain(ux);
    expect(created.mentions).not.toContain(uy); // uy is tenant TY → filtered out
  });

  it('tenant Y cannot list tenant X comments', async () => {
    const { res, r } = mockRes();
    const req = { query: { entityType: 'WorkItem', entityId: wiId, page: 1, pageSize: 20 } } as unknown as Request;
    await run(TY, uy, () => listComments(req, res));
    expect((r.body.data as { items: unknown[] }).items).toHaveLength(0);
  });

  it('activity feed is tenant-scoped', async () => {
    const { res, r } = mockRes();
    const reqX = { query: { page: 1, pageSize: 50 } } as unknown as Request;
    await run(TX, ux, () => listActivity(reqX, res));
    const itemsX = (r.body.data as { items: { tenantId: string }[] }).items;
    expect(itemsX.length).toBeGreaterThan(0);
    expect(itemsX.every((i) => i.tenantId === TX)).toBe(true);

    const { res: res2, r: r2 } = mockRes();
    const reqY = { query: { page: 1, pageSize: 50 } } as unknown as Request;
    await run(TY, uy, () => listActivity(reqY, res2));
    expect((r2.body.data as { items: unknown[] }).items).toHaveLength(0);
  });
});
