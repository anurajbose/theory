import { Request, Response } from 'express';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { encrypt } from '../services/encryption';

// Strip journal unconditionally — called on every outbound daily log object
function sanitize(log: Record<string, unknown> | null) {
  if (!log) return null;
  const { journal: _j, ...safe } = log as Record<string, unknown>;
  void _j;
  return safe;
}

function toDate(str?: string): Date {
  return str ? new Date(str) : new Date();
}

// ─── GET today's log ─────────────────────────────────────────────────────────

export async function getTodayLog(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const today = startOfDay(new Date());
  try {
    const log = await prisma.dailyLog.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    res.json(sanitize(log as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error('getTodayLog', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET log by date ─────────────────────────────────────────────────────────

export async function getLogByDate(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const date = startOfDay(toDate(req.params.date));
  try {
    const log = await prisma.dailyLog.findUnique({
      where: { userId_date: { userId, date } },
    });
    if (!log) { res.status(404).json({ error: 'Log not found' }); return; }
    res.json(sanitize(log as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error('getLogByDate', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── UPSERT focus / mood / eod ───────────────────────────────────────────────

export async function upsertLog(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const today = startOfDay(new Date());
  const { focusText, moodScore, eodNote } = req.body;

  if (moodScore !== undefined && (moodScore < 1 || moodScore > 5)) {
    res.status(400).json({ error: 'moodScore must be 1–5' });
    return;
  }

  try {
    const log = await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date: today } },
      create: {
        userId,
        date: today,
        focusText,
        moodScore,
        eodNote,
      },
      update: {
        ...(focusText !== undefined && { focusText }),
        ...(moodScore !== undefined && { moodScore }),
        ...(eodNote !== undefined && { eodNote }),
      },
    });
    res.json(sanitize(log as unknown as Record<string, unknown>));
  } catch (err) {
    logger.error('upsertLog', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── WRITE journal (encrypted, no read-back) ─────────────────────────────────

export async function saveJournal(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const today = startOfDay(new Date());
  const { content } = req.body;

  if (typeof content !== 'string') {
    res.status(400).json({ error: 'content (string) required' });
    return;
  }

  try {
    const encrypted = encrypt(content);
    await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, journal: encrypted },
      update: { journal: encrypted },
    });
    // 204 — nothing returned, journal stays private
    res.status(204).end();
  } catch (err) {
    logger.error('saveJournal', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── MOOD aggregate (anonymous, team-level) ──────────────────────────────────

export async function getMoodAggregate(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { teamId: true },
    });

    const teamId = (req.query.teamId as string) || user?.teamId;
    if (!teamId) { res.json({ average: null, count: 0 }); return; }

    const teamMembers = await prisma.user.findMany({
      where: { teamId },
      select: { id: true },
    });
    const memberIds = teamMembers.map((u) => u.id);

    const today = startOfDay(new Date());
    const result = await prisma.dailyLog.aggregate({
      where: {
        userId: { in: memberIds },
        date: today,
        moodScore: { not: null },
      },
      _avg: { moodScore: true },
      _count: { moodScore: true },
    });

    res.json({
      average: result._avg.moodScore
        ? Math.round(result._avg.moodScore * 10) / 10
        : null,
      count: result._count.moodScore,
    });
  } catch (err) {
    logger.error('getMoodAggregate', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── STANDUP GENERATOR ───────────────────────────────────────────────────────

export async function generateStandup(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const yesterdayEnd = endOfDay(subDays(now, 1));

  try {
    const [yesterdayItems, todayItems, blockers] = await Promise.all([
      // Closed/completed yesterday
      prisma.workItem.findMany({
        where: {
          userId,
          updatedAt: { gte: yesterdayStart, lte: yesterdayEnd },
          status: { in: ['DONE', 'IN_REVIEW'] as const },
        },
        select: { title: true, status: true, sectionType: true, priority: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      // In progress / updated today
      prisma.workItem.findMany({
        where: {
          userId,
          updatedAt: { gte: todayStart, lte: todayEnd },
          status: { in: ['IN_PROGRESS', 'TODO', 'IN_REVIEW'] as const },
        },
        select: { title: true, status: true, sectionType: true, priority: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      // Current blockers
      prisma.workItem.findMany({
        where: { userId, status: 'BLOCKED' },
        select: { title: true, sectionType: true, priority: true, blockedAt: true },
        orderBy: { blockedAt: 'asc' },
        take: 5,
      }),
    ]);

    const todayLog = await prisma.dailyLog.findUnique({
      where: { userId_date: { userId, date: todayStart } },
      select: { focusText: true },
    });

    res.json({
      date: format(now, 'yyyy-MM-dd'),
      yesterday: yesterdayItems.map((i) => ({
        title: i.title,
        status: i.status,
        section: i.sectionType,
      })),
      today: todayItems.map((i) => ({
        title: i.title,
        status: i.status,
        section: i.sectionType,
        priority: i.priority,
      })),
      blockers: blockers.map((i) => ({
        title: i.title,
        section: i.sectionType,
        priority: i.priority,
        blockedSince: i.blockedAt,
      })),
      focus: todayLog?.focusText ?? null,
    });
  } catch (err) {
    logger.error('generateStandup', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── EOD PROMPT CHECK ────────────────────────────────────────────────────────
// Returns whether EOD prompt should be shown (after 17:00 and not yet filled)

export async function eodStatus(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const now = new Date();
  const isAfter5pm = now.getHours() >= 17;
  const today = startOfDay(now);

  try {
    const log = await prisma.dailyLog.findUnique({
      where: { userId_date: { userId, date: today } },
      select: { eodNote: true },
    });

    res.json({
      showPrompt: isAfter5pm && !log?.eodNote,
      filled: !!log?.eodNote,
    });
  } catch (err) {
    logger.error('eodStatus', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
