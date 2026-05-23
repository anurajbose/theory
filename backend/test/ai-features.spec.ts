import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Request, Response } from 'express';
import { als } from '../src/core/als';
import { rawPrisma } from '../src/utils/prisma';
import { buildChatRequest, initAi } from '../src/core/ai/provider';
import {
  collectStandupSignals, collectBlockerSignals, standupDigest,
} from '../src/controllers/aiController';
import { Role } from '@prisma/client';

const TA = '00000000-0000-0000-0000-00000000af01';
const TB = '00000000-0000-0000-0000-00000000af02';
const run = <T>(tid: string, uid: string, role: Role, fn: () => Promise<T>) =>
  als.run({ tenantId: tid, userId: uid, role, requestId: 't' }, async () => fn());

describe('AI provider adapter', () => {
  it('builds an OpenAI-compatible request with a guarding system message', () => {
    const r = buildChatRequest('summarise X', 'gpt-4o-mini');
    expect(r.model).toBe('gpt-4o-mini');
    expect(r.messages[0].role).toBe('system');
    expect(r.messages[0].content).toMatch(/never .* private notes, journals, or credentials/i);
    expect(r.messages[1]).toEqual({ role: 'user', content: 'summarise X' });
  });
  it('initAi is a safe no-op when disabled (gateway stays fallback)', () => {
    expect(() => initAi()).not.toThrow();
  });
});

describe('AI feature collectors — metadata only + tenant scoped', () => {
  let mgr: string;
  let rep: string;
  let other: string;

  beforeAll(async () => {
    for (const id of [TA, TB]) {
      await rawPrisma.tenant.upsert({ where: { id }, update: {},
        create: { id, name: id, slug: id, status: 'ACTIVE', plan: 'ENTERPRISE' } });
    }
    mgr = (await rawPrisma.user.create({ data: { tenantId: TA, name: 'M', role: 'MANAGER', email: `afm-${Date.now()}@a.io`, passwordHash: 'x' } })).id;
    rep = (await rawPrisma.user.create({ data: { tenantId: TA, name: 'R', managerId: mgr, email: `afr-${Date.now()}@a.io`, passwordHash: 'x' } })).id;
    other = (await rawPrisma.user.create({ data: { tenantId: TB, name: 'O', email: `afo-${Date.now()}@b.io`, passwordHash: 'x' } })).id;
    await rawPrisma.workItem.create({ data: { tenantId: TA, userId: rep, sectionType: 'CR', title: 'rep-blk', status: 'BLOCKED', blockedAt: new Date(Date.now() - 3 * 864e5) } });
    await rawPrisma.workItem.create({ data: { tenantId: TB, userId: other, sectionType: 'CR', title: 'other-blk', status: 'BLOCKED' } });
    // a daily log WITH a private journal for the manager — must never surface
    await rawPrisma.dailyLog.create({ data: { tenantId: TA, userId: mgr, date: new Date(), journal: 'PRIVATE-J', eodNote: 'PRIVATE-E', focusText: 'PRIVATE-F' } });
    await rawPrisma.workItem.create({ data: { tenantId: TA, userId: mgr, sectionType: 'CR', title: 'm1', status: 'TODO' } });
  });
  afterAll(async () => {
    await rawPrisma.dailyLog.deleteMany({ where: { tenantId: { in: [TA, TB] } } });
    await rawPrisma.workItem.deleteMany({ where: { tenantId: { in: [TA, TB] } } });
    await rawPrisma.user.deleteMany({ where: { tenantId: { in: [TA, TB] } } });
    await rawPrisma.tenant.deleteMany({ where: { id: { in: [TA, TB] } } });
    await rawPrisma.$disconnect();
  });

  it('standup signals contain ONLY operational metadata (no journal/eod/focus)', async () => {
    const sig = await run(TA, mgr, Role.MANAGER, () => collectStandupSignals(mgr));
    const s = JSON.stringify(sig);
    expect(s).not.toContain('PRIVATE-J');
    expect(s).not.toContain('PRIVATE-E');
    expect(s).not.toContain('PRIVATE-F');
    expect(Object.keys(sig).sort()).toEqual(
      ['blockers', 'overdueFollowUps', 'weeklyMeetings', 'workItemsByStatus'].sort(),
    );
  });

  it('blocker signals: manager sees self+reports, never other tenant', async () => {
    const mgrView = await run(TA, mgr, Role.MANAGER, () => collectBlockerSignals(mgr, 'MANAGER'));
    const titles = mgrView.map((b) => b.title);
    expect(titles).toContain('rep-blk');
    expect(titles).not.toContain('other-blk'); // tenant B excluded by the guard
    expect(mgrView[0]).toHaveProperty('ageDays');

    const repView = await run(TA, rep, Role.EMPLOYEE, () => collectBlockerSignals(rep, 'EMPLOYEE'));
    expect(repView.every((b) => b.title === 'rep-blk')).toBe(true);
  });

  it('standup-digest endpoint returns governed fallback (AI disabled) — enveloped', async () => {
    const r: { body: { data?: { status: string; output: unknown } } } = { body: {} };
    const res = { status() { return res; }, json(b: unknown) { r.body = b as typeof r.body; return res; }, setHeader() { return res; } } as unknown as Response;
    await run(TA, mgr, Role.MANAGER, () =>
      standupDigest({ user: { sub: mgr, tid: TA, role: 'MANAGER' } } as unknown as Request, res));
    expect(r.body.data?.status).toBe('fallback');
    expect(r.body.data?.output).toBeNull();
  });
});
