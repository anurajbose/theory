import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

function getWeekStart(offsetWeeks = 0): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay() - offsetWeeks * 7);
  return d;
}

function getWeekEnd(weekStart: Date): Date {
  return new Date(weekStart.getTime() + 7 * 86400000);
}

export async function personalWeeklyReport(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  try {
    const [workItems, timeLogs, followUpsClosed, meetings, effortRecord] = await Promise.all([
      prisma.workItem.findMany({
        where: { userId },
        select: { status: true },
      }),
      prisma.timeLog.findMany({
        where: { userId, date: { gte: weekStart, lt: weekEnd } },
        select: { category: true, durationMins: true },
      }),
      prisma.followUp.findMany({
        where: {
          userId,
          status: 'CLOSED',
          updatedAt: { gte: weekStart, lt: weekEnd },
        },
        select: { id: true },
      }),
      prisma.meeting.findMany({
        where: { userId, date: { gte: weekStart, lt: weekEnd } },
        select: { id: true },
      }),
      prisma.invisibleEffort.findUnique({
        where: { userId_weekStart: { userId, weekStart } },
        select: { score: true },
      }),
    ]);

    // Work items by status
    const workItemsByStatus: Record<string, number> = {};
    for (const w of workItems) {
      workItemsByStatus[w.status] = (workItemsByStatus[w.status] ?? 0) + 1;
    }

    // Time by category
    const timeByCategory: Record<string, number> = {};
    for (const l of timeLogs) {
      timeByCategory[l.category] = (timeByCategory[l.category] ?? 0) + (l.durationMins ?? 0);
    }

    // Last 4 weeks trend
    const trendPromises = [1, 2, 3, 4].map(async (offset) => {
      const ws = getWeekStart(offset);
      const we = getWeekEnd(ws);

      const [wItems, tLogs, fUps, effort] = await Promise.all([
        prisma.workItem.count({
          where: { userId, status: 'DONE', updatedAt: { gte: ws, lt: we } },
        }),
        prisma.timeLog.findMany({
          where: { userId, date: { gte: ws, lt: we } },
          select: { durationMins: true },
        }),
        prisma.followUp.count({
          where: { userId, status: 'CLOSED', updatedAt: { gte: ws, lt: we } },
        }),
        prisma.invisibleEffort.findUnique({
          where: { userId_weekStart: { userId, weekStart: ws } },
          select: { score: true },
        }),
      ]);

      return {
        weekStart: ws.toISOString(),
        workDone: wItems,
        timeMins: tLogs.reduce((sum, l) => sum + (l.durationMins ?? 0), 0),
        effortScore: effort?.score ?? null,
      };
    });

    const trend = await Promise.all(trendPromises);

    const totalMins = Object.values(timeByCategory).reduce((a, b) => a + b, 0);

    res.json({
      week: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      },
      workItems: {
        done:       workItemsByStatus['DONE']        ?? 0,
        inProgress: workItemsByStatus['IN_PROGRESS'] ?? 0,
        blocked:    workItemsByStatus['BLOCKED']     ?? 0,
        total:      workItems.length,
      },
      timeByCategory,
      totalMins,
      followUpsClosed: followUpsClosed.length,
      meetingsCount: meetings.length,
      effortScore: effortRecord?.score ?? null,
      trend,
    });
  } catch (err) {
    logger.error('personalWeeklyReport error', { err, userId });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function teamWeeklyReport(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const role = req.user!.role;
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  try {
    let memberIds: string[];

    if (role === 'ADMIN' || role === 'LEADERSHIP') {
      const all = await prisma.user.findMany({ where: { active: true }, select: { id: true } });
      memberIds = all.map(u => u.id);
    } else {
      const reports = await prisma.user.findMany({
        where: { managerId: userId, active: true },
        select: { id: true },
      });
      memberIds = reports.map(r => r.id);
    }

    const [members, workItems, timeLogs] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, name: true },
      }),
      prisma.workItem.findMany({
        where: { userId: { in: memberIds } },
        select: { userId: true, status: true, slaDate: true },
      }),
      prisma.timeLog.findMany({
        where: { userId: { in: memberIds }, date: { gte: weekStart, lt: weekEnd } },
        select: { userId: true, durationMins: true },
      }),
    ]);

    const now = new Date();

    // Aggregate stats
    const totalWorkDone = workItems.filter(w => w.status === 'DONE').length;
    const totalBlocked = workItems.filter(w => w.status === 'BLOCKED').length;
    const slaItems = workItems.filter(w => w.slaDate);
    const slaBreaches = slaItems.filter(w => w.slaDate && new Date(w.slaDate) < now && w.status !== 'DONE' && w.status !== 'CANCELLED').length;
    const slaCompliance = slaItems.length > 0
      ? Math.round(((slaItems.length - slaBreaches) / slaItems.length) * 100)
      : 100;

    // Health scores per member
    const blockersByMember: Record<string, number> = {};
    const workDoneByMember: Record<string, number> = {};
    const workTotalByMember: Record<string, number> = {};
    const timeMsByMember: Record<string, number> = {};

    for (const w of workItems) {
      workTotalByMember[w.userId] = (workTotalByMember[w.userId] ?? 0) + 1;
      if (w.status === 'BLOCKED') blockersByMember[w.userId] = (blockersByMember[w.userId] ?? 0) + 1;
      if (w.status === 'DONE') workDoneByMember[w.userId] = (workDoneByMember[w.userId] ?? 0) + 1;
    }

    for (const l of timeLogs) {
      timeMsByMember[l.userId] = (timeMsByMember[l.userId] ?? 0) + (l.durationMins ?? 0);
    }

    const memberBreakdown = members.map(m => {
      const blocked = blockersByMember[m.id] ?? 0;
      const total = workTotalByMember[m.id] ?? 0;
      const healthScore = Math.max(0, Math.round(100 - blocked * 10));
      return {
        id: m.id,
        name: m.name,
        workDone: workDoneByMember[m.id] ?? 0,
        blocked,
        timeMins: timeMsByMember[m.id] ?? 0,
        healthScore,
      };
    });

    const avgHealth = memberBreakdown.length > 0
      ? Math.round(memberBreakdown.reduce((sum, m) => sum + m.healthScore, 0) / memberBreakdown.length)
      : 100;

    res.json({
      week: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      },
      aggregate: {
        totalDone: totalWorkDone,
        totalBlocked,
        slaCompliance,
        avgHealth: avgHealth ?? null,
        memberCount: memberIds.length,
      },
      byMember: memberBreakdown.map(m => ({
        userId:   m.id,
        name:     m.name,
        workDone: m.workDone,
        blocked:  m.blocked,
        timeMins: m.timeMins,
      })),
    });
  } catch (err) {
    logger.error('teamWeeklyReport error', { err, userId });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function exportPersonalCSV(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { from, to } = req.query;

  try {
    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to as string) : new Date();

    const workItems = await prisma.workItem.findMany({
      where: {
        userId,
        createdAt: { gte: fromDate, lte: toDate },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        sectionType: true,
        dueDate: true,
        slaDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const headers = ['ID', 'Title', 'Status', 'Priority', 'Section', 'Due Date', 'SLA Date', 'Created At', 'Updated At'];
    const rows = workItems.map(w => [
      w.id,
      `"${(w.title ?? '').replace(/"/g, '""')}"`,
      w.status,
      w.priority,
      w.sectionType,
      w.dueDate ? w.dueDate.toISOString().split('T')[0] : '',
      w.slaDate ? w.slaDate.toISOString().split('T')[0] : '',
      w.createdAt.toISOString(),
      w.updatedAt.toISOString(),
    ]);

    const csvLines = [headers.join(','), ...rows.map(r => r.join(','))];
    const csv = csvLines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="work-items-export.csv"`);
    res.send(csv);
  } catch (err) {
    logger.error('exportPersonalCSV error', { err, userId });
    res.status(500).json({ error: 'Internal server error' });
  }
}
