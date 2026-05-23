import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { ok } from '../core/http';
import { runAi, AiContext } from '../core/ai/gateway';

const CAP = 500;
const ctxOf = (req: Request): AiContext => ({
  userId: req.user!.sub, tenantId: req.user!.tid, role: req.user!.role,
});

/**
 * METADATA-ONLY signal collectors. These deliberately select NO journal /
 * eodNote / notes / focusText — only operational status. (The S16 gateway
 * also redacts as defence-in-depth, but collection itself stays clean.)
 */
export async function collectStandupSignals(userId: string) {
  const [byStatus, blocked, followDue, meetings] = await Promise.all([
    prisma.workItem.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
    prisma.workItem.count({ where: { userId, status: 'BLOCKED' } }),
    prisma.followUp.count({ where: { userId, status: { not: 'CLOSED' }, dueDate: { lt: new Date() } } }),
    prisma.meeting.count({ where: { userId, date: { gte: new Date(Date.now() - 7 * 864e5) } } }),
  ]);
  return {
    workItemsByStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
    blockers: blocked,
    overdueFollowUps: followDue,
    weeklyMeetings: meetings,
  };
}

async function scopedMemberIds(userId: string, role: string): Promise<string[]> {
  if (role === 'ADMIN' || role === 'LEADERSHIP') {
    return (await prisma.user.findMany({ where: { active: true }, select: { id: true }, take: CAP })).map((u) => u.id);
  }
  if (role === 'MANAGER') {
    const reps = await prisma.user.findMany({ where: { managerId: userId, active: true }, select: { id: true }, take: CAP });
    return [userId, ...reps.map((r) => r.id)];
  }
  return [userId];
}

export async function collectBlockerSignals(userId: string, role: string) {
  const ids = await scopedMemberIds(userId, role);
  const blockers = await prisma.workItem.findMany({
    where: { userId: { in: ids }, status: 'BLOCKED' },
    select: { title: true, sectionType: true, priority: true, blockedAt: true },
    orderBy: { blockedAt: 'asc' },
    take: CAP,
  });
  const now = Date.now();
  return blockers.map((b) => ({
    title: b.title,
    section: b.sectionType,
    priority: b.priority,
    ageDays: b.blockedAt ? Math.floor((now - new Date(b.blockedAt).getTime()) / 864e5) : 0,
  }));
}

/* POST /api/ai/standup-digest — own digest, metadata only */
export async function standupDigest(req: Request, res: Response): Promise<void> {
  const signals = await collectStandupSignals(req.user!.sub);
  const result = await runAi({ promptKey: 'standup.summary', vars: { signals }, ctx: ctxOf(req) });
  ok(res, result);
}

/* POST /api/ai/blocker-triage — manager+ scope, metadata only */
export async function blockerTriage(req: Request, res: Response): Promise<void> {
  const blockers = await collectBlockerSignals(req.user!.sub, req.user!.role);
  const result = await runAi({
    promptKey: 'blocker.triage',
    vars: { blockers },
    ctx: ctxOf(req),
    allowRoles: ['MANAGER', 'LEADERSHIP', 'ADMIN'],
  });
  ok(res, result);
}
