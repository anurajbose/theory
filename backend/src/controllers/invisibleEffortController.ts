import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { TimeCategory } from '@prisma/client';

function getWeekStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

function getWeekEnd(weekStart: Date): Date {
  return new Date(weekStart.getTime() + 7 * 86400000);
}

const EFFORT_CATEGORIES: TimeCategory[] = ['SUPPORT', 'ADMIN', 'DOCS', 'FOLLOW_UP', 'STRATEGIC'];

export async function computeMyEffort(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  try {
    const [followUpsClosed, timeLogs, meetings, kbArticles] = await Promise.all([
      prisma.followUp.findMany({
        where: {
          userId,
          status: 'CLOSED',
          updatedAt: { gte: weekStart, lt: weekEnd },
        },
        select: { id: true },
      }),
      prisma.timeLog.findMany({
        where: {
          userId,
          category: { in: EFFORT_CATEGORIES },
          date: { gte: weekStart, lt: weekEnd },
        },
        select: { durationMins: true },
      }),
      prisma.meeting.findMany({
        where: {
          userId,
          date: { gte: weekStart, lt: weekEnd },
        },
        select: { id: true },
      }),
      prisma.knowledgeBase.findMany({
        where: {
          userId,
          createdAt: { gte: weekStart, lt: weekEnd },
        },
        select: { id: true },
      }),
    ]);

    const followUpPoints = followUpsClosed.length * 5;
    const totalSupportMins = timeLogs.reduce((sum, l) => sum + (l.durationMins ?? 0), 0);
    const timePoints = Math.floor(totalSupportMins / 30);
    const meetingPoints = meetings.length * 3;
    const kbPoints = kbArticles.length * 10;

    const score = followUpPoints + timePoints + meetingPoints + kbPoints;

    const breakdown = {
      followUpsClosed: followUpsClosed.length,
      supportMins: totalSupportMins,
      meetingCount: meetings.length,
      kbArticles: kbArticles.length,
      raw: { followUpPoints, timePoints, meetingPoints, kbPoints },
    };

    const record = await prisma.invisibleEffort.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      update: { score, breakdown },
      create: { userId, weekStart, score, breakdown },
    });

    res.json(record);
  } catch (err) {
    logger.error('computeMyEffort error', { err, userId });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMyEffortHistory(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 86400000);

  try {
    const records = await prisma.invisibleEffort.findMany({
      where: {
        userId,
        weekStart: { gte: eightWeeksAgo },
      },
      orderBy: { weekStart: 'desc' },
    });

    res.json(records);
  } catch (err) {
    logger.error('getMyEffortHistory error', { err, userId });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTeamEffort(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const role = req.user!.role;
  const weekStart = getWeekStart();

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

    const [efforts, members] = await Promise.all([
      prisma.invisibleEffort.findMany({
        where: {
          userId: { in: memberIds },
          weekStart,
        },
        orderBy: { score: 'desc' },
      }),
      prisma.user.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, name: true, jobRole: true },
      }),
    ]);

    const effortMap = Object.fromEntries(efforts.map(e => [e.userId, e]));
    const result = members.map(m => ({
      ...m,
      effort: effortMap[m.id] ?? null,
    }));

    res.json(result);
  } catch (err) {
    logger.error('getTeamEffort error', { err, userId });
    res.status(500).json({ error: 'Internal server error' });
  }
}
