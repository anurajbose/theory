import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { als } from '../src/core/als';
import { rawPrisma } from '../src/utils/prisma';
import prisma from '../src/utils/prisma';
import { pageSchema, softDelete, paginate } from '../src/core/crud';
import { listQuery, createBody } from '../src/controllers/workItemController';
import { Role } from '@prisma/client';

const T = '00000000-0000-0000-0000-0000000ch001';

describe('pagination schema', () => {
  it('applies safe defaults and clamps pageSize', () => {
    expect(pageSchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(() => pageSchema.parse({ pageSize: 9999 })).toThrow(); // > max(100)
    expect(pageSchema.parse({ page: '3', pageSize: '50' })).toEqual({ page: 3, pageSize: 50 });
  });
});

describe('workItem input validation (Zod)', () => {
  it('rejects invalid list status and missing required create fields', () => {
    expect(() => listQuery.parse({ status: 'NONSENSE' })).toThrow();
    expect(() => createBody.parse({ title: '', sectionType: '' })).toThrow();
    expect(createBody.parse({ title: 'X', sectionType: 'CR' }).title).toBe('X');
  });
});

describe('soft delete + paginate (DB, tenant-scoped)', () => {
  let uid: string;
  beforeAll(async () => {
    await rawPrisma.tenant.upsert({
      where: { id: T }, update: {},
      create: { id: T, name: T, slug: T, status: 'ACTIVE', plan: 'ENTERPRISE' },
    });
    const u = await rawPrisma.user.create({
      data: { tenantId: T, name: 'C', email: `crud-${Date.now()}@t.io`, passwordHash: 'x' },
    });
    uid = u.id;
    for (let i = 0; i < 3; i++) {
      await rawPrisma.workItem.create({
        data: { tenantId: T, userId: uid, sectionType: 'CR', title: `wi${i}` },
      });
    }
  });
  afterAll(async () => {
    await rawPrisma.workItem.deleteMany({ where: { tenantId: T } });
    await rawPrisma.user.deleteMany({ where: { tenantId: T } });
    await rawPrisma.tenant.deleteMany({ where: { id: T } });
    await rawPrisma.$disconnect();
  });

  function asT<R>(fn: () => Promise<R>): Promise<R> {
    return als.run({ tenantId: T, userId: uid, role: Role.ADMIN, requestId: 't' }, async () => fn());
  }

  it('soft delete hides from guarded reads, retains in raw', async () => {
    const all = await asT(() => prisma.workItem.findMany({ where: { userId: uid } }));
    expect(all.length).toBe(3);
    const target = all[0].id;

    const n = await asT(() => softDelete(prisma.workItem, { id: target, userId: uid }));
    expect(n).toBe(1);

    const after = await asT(() => prisma.workItem.findMany({ where: { userId: uid } }));
    expect(after.length).toBe(2);
    const raw = await rawPrisma.workItem.findUnique({ where: { id: target } });
    expect(raw?.deletedAt).toBeInstanceOf(Date);
  });

  it('paginate returns items + meta', async () => {
    const { items, meta } = await asT(() =>
      paginate(prisma.workItem, { userId: uid }, { page: 1, pageSize: 1 }),
    );
    expect(items.length).toBe(1);
    expect(meta).toMatchObject({ page: 1, pageSize: 1, total: 2 });
  });
});
