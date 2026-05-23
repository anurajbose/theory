import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { ok } from '../core/http';

/* Hard cap on any team-scoped scan to bound payload/CPU (DoS guard). */
const CAP = 1000;

function weekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/**
 * Member set for the console. All queries run through the guarded client so
 * they are ALREADY tenant-scoped — ADMIN/LEADERSHIP "all users" means all
 * users *in this tenant*, never cross-tenant. Managers see direct reports.
 */
async function memberIds(userId: string, role: string): Promise<string[]> {
  const where =
    role === 'ADMIN' || role === 'LEADERSHIP'
      ? { active: true }
      : { managerId: userId, active: true };
  const users = await prisma.user.findMany({ where, select: { id: true }, take: CAP });
  return users.map((u) => u.id);
}

function computeHealthScore(blockers: number, totalItems: number, overdueFollowUps: number): number {
  const blockerPenalty = Math.min(blockers * 10, 40);
  const overduePenalty =
    totalItems > 0 ? Math.min((overdueFollowUps / Math.max(totalItems, 1)) * 20, 30) : 0;
  return Math.max(0, Math.round(100 - blockerPenalty - overduePenalty));
}

export async function managerOverview(req: Request, res: Response): Promise<void> {
  const ids = await memberIds(req.user!.sub, req.user!.role);
  const [workItems, followUps, meetings, timeLogs] = await Promise.all([
    prisma.workItem.findMany({ where: { userId: { in: ids } }, take: CAP,
      select: { status: true, slaDate: true, priority: true, userId: true } }),
    prisma.followUp.findMany({ where: { userId: { in: ids }, status: { not: 'CLOSED' } }, take: CAP,
      select: { dueDate: true, status: true, userId: true } }),
    prisma.meeting.findMany({ where: { userId: { in: ids }, date: { gte: weekStart() } }, take: CAP,
      select: { id: true } }),
    prisma.timeLog.findMany({ where: { userId: { in: ids }, date: { gte: weekStart() } }, take: CAP,
      select: { durationMins: true, category: true } }),
  ]);

  const now = new Date();
  const blockers = workItems.filter((i) => i.status === 'BLOCKED').length;
  const slaItems = workItems.filter((i) => i.slaDate);
  const slaBreaches = slaItems.filter(
    (i) => i.slaDate && new Date(i.slaDate) < now && i.status !== 'DONE' && i.status !== 'CANCELLED',
  ).length;
  const slaCompliance = slaItems.length > 0
    ? Math.round(((slaItems.length - slaBreaches) / slaItems.length) * 100) : 100;
  const overdueFollowUps = followUps.filter((f) => f.dueDate && new Date(f.dueDate) < now).length;
  const totalMins = timeLogs.reduce((a, l) => a + (l.durationMins ?? 0), 0);
  const byStatus: Record<string, number> = {};
  for (const w of workItems) byStatus[w.status] = (byStatus[w.status] ?? 0) + 1;

  ok(res, {
    memberCount: ids.length,
    healthScore: computeHealthScore(blockers, workItems.length, overdueFollowUps),
    blockers, slaCompliance, overdueFollowUps,
    weeklyMeetings: meetings.length,
    weeklyHours: +(totalMins / 60).toFixed(1),
    workItemsByStatus: byStatus,
  });
}

export async function managerWorkItems(req: Request, res: Response): Promise<void> {
  const ids = await memberIds(req.user!.sub, req.user!.role);
  const [members, items] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, take: CAP,
      select: { id: true, name: true, jobRole: true } }),
    prisma.workItem.findMany({
      where: { userId: { in: ids }, status: { notIn: ['DONE', 'CANCELLED'] } },
      orderBy: { createdAt: 'desc' }, take: CAP,
      select: { id: true, title: true, status: true, priority: true, sectionType: true,
        dueDate: true, slaDate: true, blockedAt: true, userId: true },
    }),
  ]);
  const byMember = members.map((m) => {
    const mine = items.filter((i) => i.userId === m.id);
    return {
      ...m, items: mine,
      counts: {
        todo: mine.filter((i) => i.status === 'TODO').length,
        inProgress: mine.filter((i) => i.status === 'IN_PROGRESS').length,
        blocked: mine.filter((i) => i.status === 'BLOCKED').length,
        inReview: mine.filter((i) => i.status === 'IN_REVIEW').length,
      },
    };
  });
  ok(res, byMember);
}

export async function managerBlockers(req: Request, res: Response): Promise<void> {
  const ids = await memberIds(req.user!.sub, req.user!.role);
  const [blockers, members] = await Promise.all([
    prisma.workItem.findMany({ where: { userId: { in: ids }, status: 'BLOCKED' },
      orderBy: { blockedAt: 'asc' }, take: CAP,
      select: { id: true, title: true, sectionType: true, priority: true,
        blockedAt: true, userId: true, dueDate: true } }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true }, take: CAP }),
  ]);
  const map = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const now = new Date();
  ok(res, blockers.map((b) => ({
    ...b,
    memberName: map[b.userId] ?? 'Unknown',
    blockedDays: b.blockedAt ? Math.floor((now.getTime() - new Date(b.blockedAt).getTime()) / 86400000) : 0,
  })));
}

export async function managerFollowUps(req: Request, res: Response): Promise<void> {
  const ids = await memberIds(req.user!.sub, req.user!.role);
  const [followUps, members] = await Promise.all([
    prisma.followUp.findMany({ where: { userId: { in: ids }, status: { not: 'CLOSED' } },
      orderBy: { dueDate: 'asc' }, take: CAP }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true }, take: CAP }),
  ]);
  const map = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const now = new Date();
  ok(res, followUps.map((f) => ({
    ...f,
    memberName: map[f.userId] ?? 'Unknown',
    overdue: f.dueDate ? new Date(f.dueDate) < now : false,
    ageDays: Math.floor((now.getTime() - new Date(f.createdAt).getTime()) / 86400000),
  })));
}

export async function managerTimeSummary(req: Request, res: Response): Promise<void> {
  const ids = await memberIds(req.user!.sub, req.user!.role);
  const [logs, members] = await Promise.all([
    prisma.timeLog.findMany({ where: { userId: { in: ids }, date: { gte: weekStart() } }, take: CAP,
      select: { userId: true, category: true, durationMins: true } }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true }, take: CAP }),
  ]);
  const byCategory: Record<string, number> = {};
  for (const l of logs) if (l.durationMins) byCategory[l.category] = (byCategory[l.category] ?? 0) + l.durationMins;
  const byMember = members.map((m) => ({
    id: m.id, name: m.name,
    totalMins: logs.filter((l) => l.userId === m.id).reduce((a, l) => a + (l.durationMins ?? 0), 0),
    breakdown: logs.filter((l) => l.userId === m.id).reduce((acc, l) => {
      if (l.durationMins) acc[l.category] = (acc[l.category] ?? 0) + l.durationMins;
      return acc;
    }, {} as Record<string, number>),
  }));
  ok(res, { byCategory, byMember });
}

export async function managerMeetings(req: Request, res: Response): Promise<void> {
  const ids = await memberIds(req.user!.sub, req.user!.role);
  const [meetings, members] = await Promise.all([
    prisma.meeting.findMany({ where: { userId: { in: ids }, date: { gte: weekStart() } }, take: CAP,
      select: { id: true, title: true, date: true, attendees: true, userId: true } }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true }, take: CAP }),
  ]);
  ok(res, {
    totalMeetings: meetings.length,
    weeklyHoursEstimate: meetings.length * 0.5,
    byMember: members.map((m) => ({
      id: m.id, name: m.name,
      meetingCount: meetings.filter((mt) => mt.userId === m.id).length,
      hoursEstimate: meetings.filter((mt) => mt.userId === m.id).length * 0.5,
    })),
  });
}

export async function managerTeamSignals(req: Request, res: Response): Promise<void> {
  const { sub, role } = req.user!;
  const teams =
    role === 'ADMIN' || role === 'LEADERSHIP'
      ? await prisma.team.findMany({ select: { id: true, name: true }, take: CAP })
      : await prisma.team.findMany({ where: { managerId: sub }, select: { id: true, name: true }, take: CAP });

  const teamIds = teams.map((t) => t.id);
  const signals = await prisma.teamSignal.findMany({
    where: { teamId: { in: teamIds } },
    orderBy: { date: 'desc' }, distinct: ['teamId'], take: CAP,
  });
  ok(res, teams.map((t) => ({ ...t, signal: signals.find((s) => s.teamId === t.id) ?? null })));
}

/** Recent team activity feed — scoped to the manager's member set + tenant. */
export async function managerActivity(req: Request, res: Response): Promise<void> {
  const ids = await memberIds(req.user!.sub, req.user!.role);
  const events = await prisma.activityEvent.findMany({
    where: { actorId: { in: ids } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  ok(res, { items: events, meta: { count: events.length } });
}
