import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { ok } from '../core/http';
import { cached } from '../core/cache';

/* Org dashboards are cached per-tenant; CAP bounds the worst-case scan. */
const TTL = 60;
const CAP = 20000;

export async function orgOverview(_req: Request, res: Response): Promise<void> {
  const data = await cached('overview', TTL, async () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const [userCount, teamCount, deptCount, workItems, followUps, meetings, timeLogs] =
      await Promise.all([
        prisma.user.count({ where: { active: true } }),
        prisma.team.count(),
        prisma.department.count(),
        prisma.workItem.findMany({ select: { status: true, slaDate: true }, take: CAP }),
        prisma.followUp.findMany({ where: { status: { not: 'CLOSED' } }, select: { dueDate: true }, take: CAP }),
        prisma.meeting.count({ where: { date: { gte: weekAgo } } }),
        prisma.timeLog.findMany({ where: { date: { gte: weekAgo } }, select: { durationMins: true, category: true }, take: CAP }),
      ]);

    const blockers = workItems.filter((i) => i.status === 'BLOCKED').length;
    const slaItems = workItems.filter((i) => i.slaDate);
    const slaBreaches = slaItems.filter(
      (i) => i.slaDate && new Date(i.slaDate) < now && i.status !== 'DONE' && i.status !== 'CANCELLED',
    ).length;
    const slaCompliance = slaItems.length > 0
      ? Math.round(((slaItems.length - slaBreaches) / slaItems.length) * 100) : 100;
    const overdueFollowUps = followUps.filter((f) => f.dueDate && new Date(f.dueDate) < now).length;
    const totalMins = timeLogs.reduce((a, l) => a + (l.durationMins ?? 0), 0);
    const byCategory: Record<string, number> = {};
    for (const l of timeLogs) if (l.durationMins) byCategory[l.category] = (byCategory[l.category] ?? 0) + l.durationMins;

    return {
      userCount, teamCount, deptCount,
      workItems: workItems.length,
      blockers,
      inProgress: workItems.filter((i) => i.status === 'IN_PROGRESS').length,
      done: workItems.filter((i) => i.status === 'DONE').length,
      slaCompliance, overdueFollowUps,
      weeklyMeetings: meetings,
      weeklyHours: +(totalMins / 60).toFixed(1),
      timeByCategory: byCategory,
    };
  });
  ok(res, data);
}

export async function orgTeamSignals(_req: Request, res: Response): Promise<void> {
  const data = await cached('team-signals', TTL, async () => {
    const [teams, signals] = await Promise.all([
      prisma.team.findMany({
        take: CAP,
        select: {
          id: true, name: true,
          dept: { select: { id: true, name: true, bu: { select: { id: true, name: true } } } },
          manager: { select: { id: true, name: true } },
          _count: { select: { members: true } },
        },
      }),
      prisma.teamSignal.findMany({ orderBy: { date: 'desc' }, distinct: ['teamId'], take: CAP }),
    ]);
    return teams.map((t) => ({ ...t, signal: signals.find((s) => s.teamId === t.id) ?? null }));
  });
  ok(res, data);
}

export async function orgBlockers(_req: Request, res: Response): Promise<void> {
  const data = await cached('blockers', TTL, async () => {
    const blockers = await prisma.workItem.findMany({
      where: { status: 'BLOCKED' },
      orderBy: { blockedAt: 'asc' },
      take: CAP,
      include: {
        user: {
          select: {
            id: true, name: true,
            team: { select: { id: true, name: true } },
            dept: { select: { id: true, name: true } },
          },
        },
      },
    });
    const now = new Date();
    return blockers.map((b) => ({
      id: b.id, title: b.title, sectionType: b.sectionType, priority: b.priority,
      blockedAt: b.blockedAt, dueDate: b.dueDate,
      blockedDays: b.blockedAt ? Math.floor((now.getTime() - new Date(b.blockedAt).getTime()) / 86400000) : 0,
      user: b.user,
    }));
  });
  ok(res, data);
}

export async function orgCompliance(_req: Request, res: Response): Promise<void> {
  const data = await cached('compliance', TTL, async () => {
    const now = new Date();
    const [depts, items] = await Promise.all([
      prisma.department.findMany({ take: CAP, select: { id: true, name: true, bu: { select: { name: true } } } }),
      prisma.workItem.findMany({ where: { slaDate: { not: null } }, take: CAP, include: { user: { select: { deptId: true } } } }),
    ]);
    return depts.map((d) => {
      const di = items.filter((i) => i.user.deptId === d.id);
      const breached = di.filter(
        (i) => i.slaDate && new Date(i.slaDate) < now && i.status !== 'DONE' && i.status !== 'CANCELLED',
      ).length;
      return {
        deptId: d.id, deptName: d.name, buName: d.bu.name,
        totalSlaItems: di.length, breached,
        compliance: di.length > 0 ? Math.round(((di.length - breached) / di.length) * 100) : 100,
      };
    });
  });
  ok(res, data);
}

export async function orgWorkBreakdown(_req: Request, res: Response): Promise<void> {
  const data = await cached('work-breakdown', TTL, async () => {
    const [depts, items] = await Promise.all([
      prisma.department.findMany({ take: CAP, select: { id: true, name: true } }),
      prisma.workItem.findMany({ take: CAP, include: { user: { select: { deptId: true } } } }),
    ]);
    return depts.map((d) => {
      const di = items.filter((i) => i.user.deptId === d.id);
      const byStatus: Record<string, number> = {};
      for (const i of di) byStatus[i.status] = (byStatus[i.status] ?? 0) + 1;
      return {
        deptId: d.id, deptName: d.name, total: di.length, byStatus,
        blockers: di.filter((i) => i.status === 'BLOCKED').length,
      };
    });
  });
  ok(res, data);
}
