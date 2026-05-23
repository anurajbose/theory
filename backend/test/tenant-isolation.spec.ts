/**
 * TENANT ISOLATION — security keystone proof.
 *
 * Proves the Prisma tenant-guard makes cross-tenant access impossible:
 *  - reads are tenant-scoped
 *  - findUnique-by-id cannot cross tenants
 *  - update/delete on another tenant's row is rejected
 *  - private journals are never selected back
 *
 * Requires: Sprint-1 expand migration applied + DATABASE_URL reachable.
 *   cd backend && npx prisma migrate deploy --schema=../database/schema.prisma
 *   npm test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { als, runAsSystem } from '../src/core/als';
import prisma, { rawPrisma, TenantViolationError, TenantContextError } from '../src/utils/prisma';
import { createNotification } from '../src/controllers/notificationController';
import { Role } from '@prisma/client';

const T1 = '00000000-0000-0000-0000-0000000000t1';
const T2 = '00000000-0000-0000-0000-0000000000t2';

function asTenant<T>(tid: string, fn: () => Promise<T>): Promise<T> {
  // await INSIDE als.run so the lazy PrismaPromise executes within context
  return als.run(
    { tenantId: tid, userId: 'test', role: Role.ADMIN, requestId: 'test' },
    async () => await fn(),
  );
}

describe('tenant isolation', () => {
  let u1: string;
  let u2: string;

  beforeAll(async () => {
    for (const id of [T1, T2]) {
      await rawPrisma.tenant.upsert({
        where: { id },
        update: {},
        create: { id, name: id, slug: id, status: 'ACTIVE', plan: 'ENTERPRISE' },
      });
    }
    const a = await rawPrisma.user.create({
      data: { tenantId: T1, name: 'A', email: `a-${Date.now()}@t1.io`, passwordHash: 'x' },
    });
    const b = await rawPrisma.user.create({
      data: { tenantId: T2, name: 'B', email: `b-${Date.now()}@t2.io`, passwordHash: 'x' },
    });
    u1 = a.id; u2 = b.id;
    await rawPrisma.dailyLog.create({
      data: { tenantId: T1, userId: u1, date: new Date(), journal: 'SECRET-T1' },
    });
  });

  afterAll(async () => {
    await rawPrisma.auditLog.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
    await rawPrisma.notification.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
    await rawPrisma.workItem.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
    await rawPrisma.dailyLog.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
    await rawPrisma.user.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
    await rawPrisma.tenant.deleteMany({ where: { id: { in: [T1, T2] } } });
    await rawPrisma.$disconnect();
  });

  it('findMany only returns rows of the active tenant', async () => {
    const r1 = await asTenant(T1, () => prisma.user.findMany());
    expect(r1.every((u) => u.tenantId === T1)).toBe(true);
    expect(r1.find((u) => u.id === u2)).toBeUndefined();
  });

  it('findUnique by id cannot cross tenants', async () => {
    const cross = await asTenant(T1, () => prisma.user.findUnique({ where: { id: u2 } }));
    expect(cross).toBeNull();
    const own = await asTenant(T1, () => prisma.user.findUnique({ where: { id: u1 } }));
    expect(own?.id).toBe(u1);
  });

  it('update on another tenant row is rejected', async () => {
    await expect(
      asTenant(T1, () => prisma.user.update({ where: { id: u2 }, data: { name: 'HACK' } })),
    ).rejects.toBeInstanceOf(TenantViolationError);
  });

  it('delete on another tenant row is rejected', async () => {
    await expect(
      asTenant(T1, () => prisma.user.delete({ where: { id: u2 } })),
    ).rejects.toBeInstanceOf(TenantViolationError);
  });

  it('create is stamped with the active tenant', async () => {
    const created = await asTenant(T2, () =>
      prisma.user.create({ data: { name: 'C', email: `c-${Date.now()}@t2.io`, passwordHash: 'x' } }),
    );
    expect(created.tenantId).toBe(T2);
  });

  it('T2 cannot see T1 daily logs (journal containment)', async () => {
    const logs = await asTenant(T2, () => prisma.dailyLog.findMany());
    expect(logs.find((l) => l.journal === 'SECRET-T1')).toBeUndefined();
  });

  // ── Sprint 3: security hardening proofs ──

  it('journal shield: journal is ALWAYS null via guarded client, even if selected', async () => {
    const log = await asTenant(T1, () =>
      prisma.dailyLog.findFirst({ where: { userId: u1 }, select: { id: true, journal: true } }),
    );
    expect(log).not.toBeNull();
    expect(log!.journal).toBeNull();
    // raw client still holds the value (server-side decrypt path remains possible)
    const raw = await rawPrisma.dailyLog.findFirst({ where: { userId: u1 } });
    expect(raw!.journal).toBe('SECRET-T1');
  });

  it('fail-closed: owned-model op without tenant context throws TenantContextError', async () => {
    await expect(prisma.user.findMany()).rejects.toBeInstanceOf(TenantContextError);
  });

  it('audit log is written + tenant-scoped', async () => {
    await rawPrisma.auditLog.create({
      data: { tenantId: T1, action: 'test.audit', entity: 'User', entityId: u1 },
    });
    const t1Audits = await asTenant(T1, () => prisma.auditLog.findMany({ where: { action: 'test.audit' } }));
    const t2Audits = await asTenant(T2, () => prisma.auditLog.findMany({ where: { action: 'test.audit' } }));
    expect(t1Audits.length).toBeGreaterThan(0);
    expect(t2Audits.length).toBe(0);
  });

  // ── Sprint 7: DB hardening proofs ──

  it('NOT NULL: cannot insert an owned row without tenant_id', async () => {
    await expect(
      rawPrisma.user.create({
        data: { name: 'No tenant', email: `nt-${Date.now()}@x.io`, passwordHash: 'x' } as never,
      }),
    ).rejects.toThrow();
  });

  it('soft-delete: deleted rows vanish from guarded reads, remain in raw', async () => {
    const wi = await rawPrisma.workItem.create({
      data: { tenantId: T1, userId: u1, sectionType: 'CR', title: 'soft-del' },
    });
    await rawPrisma.workItem.update({ where: { id: wi.id }, data: { deletedAt: new Date() } });

    const viaGuardList = await asTenant(T1, () => prisma.workItem.findMany({ where: { id: wi.id } }));
    const viaGuardUnique = await asTenant(T1, () => prisma.workItem.findUnique({ where: { id: wi.id } }));
    const viaRaw = await rawPrisma.workItem.findUnique({ where: { id: wi.id } });

    expect(viaGuardList).toHaveLength(0);
    expect(viaGuardUnique).toBeNull();
    expect(viaRaw?.id).toBe(wi.id);
  });

  it('optimistic lock: version auto-increments on guarded update', async () => {
    const wi = await rawPrisma.workItem.create({
      data: { tenantId: T1, userId: u1, sectionType: 'CR', title: 'v' },
    });
    expect(wi.version).toBe(1);
    const upd = await asTenant(T1, () =>
      prisma.workItem.update({ where: { id: wi.id }, data: { title: 'v2' } }),
    );
    expect(upd.version).toBe(2);
  });

  it('createNotification stamps tenant from the user under runAsSystem', async () => {
    const n = await runAsSystem(() => createNotification(u1, 'SYSTEM', 'hello'));
    expect(n).not.toBeNull();
    expect(n!.tenantId).toBe(T1);
  });
});
