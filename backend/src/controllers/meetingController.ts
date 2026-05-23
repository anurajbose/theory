import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const OWN = (userId: string) => ({ userId });

/* GET /api/meetings?range=week|month */
export async function listMeetings(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { range } = req.query;

  let dateFilter: Record<string, unknown> = {};
  const now = new Date();
  if (range === 'week') {
    dateFilter = { date: { gte: startOfWeek(now, { weekStartsOn: 1 }), lte: endOfWeek(now, { weekStartsOn: 1 }) } };
  } else if (range === 'month') {
    dateFilter = { date: { gte: startOfMonth(now), lte: endOfMonth(now) } };
  }

  const meetings = await prisma.meeting.findMany({
    where: { ...OWN(userId), ...dateFilter },
    orderBy: { date: 'desc' },
  });
  res.json(meetings);
}

/* GET /api/meetings/stats */
export async function getMeetingStats(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const now    = new Date();
  const ws     = startOfWeek(now, { weekStartsOn: 1 });
  const we     = endOfWeek(now,   { weekStartsOn: 1 });

  const meetings = await prisma.meeting.findMany({
    where: { userId, date: { gte: ws, lte: we } },
  });

  const count = meetings.length;
  // Estimate 30 mins per meeting as fallback (schema doesn't have durationMins)
  res.json({ count, weeklyHoursEstimate: +(count * 0.5).toFixed(1) });
}

/* POST /api/meetings */
export async function createMeeting(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { title, date, attendees, agenda, decisions, actionItems } = req.body;

  if (!title?.trim() || !date) {
    res.status(400).json({ error: 'title and date are required' });
    return;
  }

  const meeting = await prisma.meeting.create({
    data: {
      userId,
      title:       title.trim(),
      date:        new Date(date),
      attendees:   attendees   ?? [],
      agenda:      agenda?.trim()    ?? null,
      decisions:   decisions?.trim() ?? null,
      actionItems: actionItems ?? [],
    },
  });
  res.status(201).json(meeting);
}

/* PATCH /api/meetings/:id */
export async function updateMeeting(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { id } = req.params;

  const existing = await prisma.meeting.findFirst({ where: { id, ...OWN(userId) } });
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  const { title, date, attendees, agenda, decisions, actionItems } = req.body;

  const updated = await prisma.meeting.update({
    where: { id },
    data: {
      ...(title       !== undefined && { title: title.trim() }),
      ...(date        !== undefined && { date: new Date(date) }),
      ...(attendees   !== undefined && { attendees }),
      ...(agenda      !== undefined && { agenda:    agenda?.trim()    ?? null }),
      ...(decisions   !== undefined && { decisions: decisions?.trim() ?? null }),
      ...(actionItems !== undefined && { actionItems }),
    },
  });
  res.json(updated);
}

/* DELETE /api/meetings/:id */
export async function deleteMeeting(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { id } = req.params;

  const existing = await prisma.meeting.findFirst({ where: { id, ...OWN(userId) } });
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  await prisma.meeting.delete({ where: { id } });
  res.status(204).end();
}
