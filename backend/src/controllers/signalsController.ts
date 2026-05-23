import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { ok } from '../core/http';
import {
  detectBlockerAging, detectSlaRisk, detectFollowUpSlippage,
  detectWorkloadImbalance, detectAtRiskPeople, detectMomentum,
  rankSignals, summarize,
  type Signal, type SignalScope,
} from '../core/signals';

const CAP = 1500;

/** Tenant-scoped member set (guarded client → never cross-tenant). */
async function memberIds(userId: string, role: string) {
  const where =
    role === 'ADMIN' || role === 'LEADERSHIP'
      ? { active: true }
      : { managerId: userId, active: true };
  const users = await prisma.user.findMany({
    where, select: { id: true, name: true }, take: CAP,
  });
  return users;
}

export async function listSignals(req: Request, res: Response): Promise<void> {
  const me = req.user!.sub;
  const role = req.user!.role;
  const privileged = role === 'MANAGER' || role === 'LEADERSHIP' || role === 'ADMIN';
  const teamScope: SignalScope = role === 'MANAGER' ? 'team' : 'org';

  /* ── Personal signals (everyone) ── */
  const [myItems, myFu] = await Promise.all([
    prisma.workItem.findMany({
      where: { userId: me },
      take: CAP,
      select: {
        id: true, userId: true, title: true, status: true, priority: true,
        slaDate: true, blockedAt: true, closedAt: true, updatedAt: true,
      },
    }),
    prisma.followUp.findMany({
      where: { userId: me },
      take: CAP,
      select: { id: true, userId: true, person: true, topic: true, status: true, dueDate: true },
    }),
  ]);

  let signals: Signal[] = [
    ...detectBlockerAging(myItems, 'self'),
    ...detectSlaRisk(myItems, 'self'),
    ...detectFollowUpSlippage(myFu, 'self'),
    ...detectMomentum(myItems, 'self'),
  ];

  /* ── Team / org signals (managers and above) ── */
  if (privileged) {
    const members = await memberIds(me, role);
    const ids = members.map((m) => m.id);
    if (ids.length) {
      const since = new Date(Date.now() - 14 * 86_400_000);
      const [items, fu, logs] = await Promise.all([
        prisma.workItem.findMany({
          where: { userId: { in: ids } },
          take: CAP,
          select: {
            id: true, userId: true, title: true, status: true, priority: true,
            slaDate: true, blockedAt: true, closedAt: true, updatedAt: true,
          },
        }),
        prisma.followUp.findMany({
          where: { userId: { in: ids }, status: { not: 'CLOSED' } },
          take: CAP,
          select: { id: true, userId: true, person: true, topic: true, status: true, dueDate: true },
        }),
        prisma.dailyLog.findMany({
          where: { userId: { in: ids }, date: { gte: since } },
          take: CAP,
          select: { userId: true, date: true, moodScore: true },
        }),
      ]);
      signals = signals.concat(
        detectSlaRisk(items, teamScope).filter((s) => s.subjectUserId !== me),
        detectBlockerAging(items, teamScope).filter((s) => s.subjectUserId !== me),
        detectFollowUpSlippage(fu, teamScope),
        detectWorkloadImbalance(items, members, teamScope),
        detectAtRiskPeople(logs, members, teamScope),
      );
    }
  }

  // Merge persisted lifecycle state so the UI knows what's been
  // acked / snoozed / resolved. Snoozed-and-not-yet-expired signals
  // and RESOLVED / DISMISSED ones are filtered out by default.
  const ranked = rankSignals(signals);
  const states = await prisma.signalState.findMany({
    where: { tenantId: req.user!.tid, signalId: { in: ranked.map((s) => s.id) } },
    select: {
      signalId: true, state: true, snoozedUntil: true, ackedBy: true,
      resolvedAt: true, feedback: true,
    },
  });
  const stateById = new Map(states.map((s) => [s.signalId, s]));
  const now = Date.now();
  const visible = ranked
    .map((s) => {
      const st = stateById.get(s.id);
      return { ...s, lifecycle: st ?? { state: 'OPEN' as const } };
    })
    .filter((s) => {
      const st = s.lifecycle;
      if (st.state === 'RESOLVED' || st.state === 'DISMISSED') return false;
      if (st.state === 'SNOOZED' && st.snoozedUntil && new Date(st.snoozedUntil).getTime() > now) return false;
      return true;
    });
  ok(res, { summary: summarize(visible), signals: visible });
}

/* ── PATCH /api/signals/:id/state ── lifecycle transition ── */
const ALLOWED_STATES = new Set(['OPEN', 'ACK', 'SNOOZED', 'RESOLVED', 'DISMISSED']);

export async function transitionSignal(req: Request, res: Response): Promise<void> {
  const signalId = String(req.params.id);
  const { state, snoozedUntil, notes } = req.body ?? {};
  if (!ALLOWED_STATES.has(state)) {
    res.status(400).json({ error: 'Bad state' });
    return;
  }
  const tid = req.user!.tid;
  const me = req.user!.sub;
  const data = {
    state,
    snoozedUntil: state === 'SNOOZED' && snoozedUntil ? new Date(snoozedUntil) : null,
    resolvedAt:   state === 'RESOLVED' ? new Date() : null,
    ackedBy:      state === 'ACK' ? me : undefined,
    resolvedBy:   state === 'RESOLVED' ? me : undefined,
    notes:        typeof notes === 'string' ? notes : undefined,
  };
  const row = await prisma.signalState.upsert({
    where: { tenantId_signalId: { tenantId: tid, signalId } },
    create: { tenantId: tid, signalId, ...data },
    update: data,
  });
  ok(res, row);
}

/* ── POST /api/signals/:id/feedback ── thumbs up/down ── */
export async function signalFeedback(req: Request, res: Response): Promise<void> {
  const signalId = String(req.params.id);
  const raw = Number(req.body?.feedback);
  if (![-1, 0, 1].includes(raw)) {
    res.status(400).json({ error: 'feedback must be -1, 0 or 1' });
    return;
  }
  const tid = req.user!.tid;
  const row = await prisma.signalState.upsert({
    where: { tenantId_signalId: { tenantId: tid, signalId } },
    create: { tenantId: tid, signalId, state: 'OPEN', feedback: raw },
    update: { feedback: raw },
  });
  ok(res, row);
}
