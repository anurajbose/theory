import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { TimeCategory } from '@prisma/client';
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

const OWN = (userId: string) => ({ userId });

/* GET /api/time-logs?week=true  |  ?date=YYYY-MM-DD */
export async function listTimeLogs(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { week, date } = req.query;

  let dateFilter: Record<string, unknown> = {};
  const now = new Date();
  if (week === 'true') {
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    const we = endOfWeek(now,   { weekStartsOn: 1 });
    dateFilter = { date: { gte: ws, lte: we } };
  } else if (date) {
    const d = new Date(date as string);
    dateFilter = { date: { gte: startOfDay(d), lte: endOfDay(d) } };
  }

  const logs = await prisma.timeLog.findMany({
    where: { ...OWN(userId), ...dateFilter },
    include: { workItem: { select: { id: true, title: true, sectionType: true } } },
    orderBy: { startTime: 'desc' },
  });

  // Category summary (mins)
  const summary: Record<string, number> = {};
  for (const log of logs) {
    const mins = log.durationMins ?? 0;
    summary[log.category] = (summary[log.category] ?? 0) + mins;
  }

  res.json({ logs, summary });
}

/* GET /api/time-logs/running */
export async function getRunningTimer(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const log = await prisma.timeLog.findFirst({
    where: { userId, endTime: null },
    include: { workItem: { select: { id: true, title: true, sectionType: true } } },
  });
  res.json(log ?? null);
}

/* POST /api/time-logs — create completed log OR start timer (no endTime) */
export async function createTimeLog(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { task, category, workItemId, durationMins, startTime, notes } = req.body;

  if (!task?.trim() || !category) {
    res.status(400).json({ error: 'task and category are required' });
    return;
  }

  const isTimer = durationMins === undefined || durationMins === null;

  // Enforce one running timer at a time
  if (isTimer) {
    const running = await prisma.timeLog.findFirst({ where: { userId, endTime: null } });
    if (running) {
      res.status(409).json({ error: 'A timer is already running', runningId: running.id });
      return;
    }
  }

  const start    = startTime ? new Date(startTime) : new Date();
  const endTime  = isTimer ? null : new Date(start.getTime() + (durationMins ?? 0) * 60_000);
  const dayDate  = new Date(start); dayDate.setHours(0, 0, 0, 0);

  const log = await prisma.timeLog.create({
    data: {
      userId,
      task:         task.trim(),
      category:     category as TimeCategory,
      workItemId:   workItemId ?? null,
      startTime:    start,
      endTime,
      durationMins: isTimer ? null : (durationMins ?? null),
      date:         dayDate,
    },
    include: { workItem: { select: { id: true, title: true, sectionType: true } } },
  });
  res.status(201).json(log);
}

/* POST /api/time-logs/:id/stop */
export async function stopTimer(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { id } = req.params;

  const log = await prisma.timeLog.findFirst({ where: { id, ...OWN(userId) } });
  if (!log)          { res.status(404).json({ error: 'Not found' }); return; }
  if (log.endTime)   { res.status(400).json({ error: 'Timer already stopped' }); return; }

  const endTime     = new Date();
  const durationMins = Math.max(1, Math.round((endTime.getTime() - log.startTime.getTime()) / 60_000));

  const updated = await prisma.timeLog.update({
    where: { id },
    data: { endTime, durationMins },
    include: { workItem: { select: { id: true, title: true, sectionType: true } } },
  });
  res.json(updated);
}

/* PATCH /api/time-logs/:id */
export async function updateTimeLog(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { id } = req.params;

  const existing = await prisma.timeLog.findFirst({ where: { id, ...OWN(userId) } });
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  const { task, category, durationMins } = req.body;

  const updated = await prisma.timeLog.update({
    where: { id },
    data: {
      ...(task         !== undefined && { task: task.trim() }),
      ...(category     !== undefined && { category: category as TimeCategory }),
      ...(durationMins !== undefined && { durationMins }),
    },
    include: { workItem: { select: { id: true, title: true, sectionType: true } } },
  });
  res.json(updated);
}

/* DELETE /api/time-logs/:id */
export async function deleteTimeLog(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { id } = req.params;

  const existing = await prisma.timeLog.findFirst({ where: { id, ...OWN(userId) } });
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  await prisma.timeLog.delete({ where: { id } });
  res.status(204).end();
}
