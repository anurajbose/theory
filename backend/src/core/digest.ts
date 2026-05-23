/* ═══════════════════════════════════════════════════════════════
   DIGEST / SIGNAL DELIVERY
   Signals are worthless if they sit on a page no one opens. This
   builds a per-person brief from the signal engine and is invoked
   by the scheduled morning-brief job to push it (in-app + email).
   System-context (rawPrisma) — cron aggregates across tenants.
   ═══════════════════════════════════════════════════════════════ */
import { rawPrisma as prisma } from '../utils/prisma';
import {
  detectBlockerAging, detectSlaRisk, detectFollowUpSlippage,
  detectWorkloadImbalance, detectAtRiskPeople, detectMomentum,
  rankSignals, summarize, type Signal,
} from './signals';

const CAP = 1500;

export interface UserDigest {
  userId: string;
  name: string;
  email: string;
  health: number;
  critical: number;
  high: number;
  top: Signal[];
}

/** Compute a person's actionable signals (self + team if privileged). */
export async function computeUserDigest(
  userId: string,
  name: string,
  email: string,
  role: string,
): Promise<UserDigest> {
  const privileged = role === 'MANAGER' || role === 'LEADERSHIP' || role === 'ADMIN';
  const teamScope = role === 'MANAGER' ? 'team' : 'org';

  const [items, fu] = await Promise.all([
    prisma.workItem.findMany({
      where: { userId },
      take: CAP,
      select: {
        id: true, userId: true, title: true, status: true, priority: true,
        slaDate: true, blockedAt: true, closedAt: true, updatedAt: true,
      },
    }),
    prisma.followUp.findMany({
      where: { userId },
      take: CAP,
      select: { id: true, userId: true, person: true, topic: true, status: true, dueDate: true },
    }),
  ]);

  let signals: Signal[] = [
    ...detectBlockerAging(items, 'self'),
    ...detectSlaRisk(items, 'self'),
    ...detectFollowUpSlippage(fu, 'self'),
    ...detectMomentum(items, 'self'),
  ];

  if (privileged) {
    const members = await prisma.user.findMany({
      where:
        role === 'MANAGER'
          ? { managerId: userId, active: true }
          : { active: true },
      select: { id: true, name: true },
      take: CAP,
    });
    const ids = members.map((m) => m.id);
    if (ids.length) {
      const since = new Date(Date.now() - 14 * 86_400_000);
      const [tItems, tFu, logs] = await Promise.all([
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
        detectSlaRisk(tItems, teamScope).filter((s) => s.subjectUserId !== userId),
        detectBlockerAging(tItems, teamScope).filter((s) => s.subjectUserId !== userId),
        detectWorkloadImbalance(tItems, members, teamScope),
        detectAtRiskPeople(logs, members, teamScope),
      );
    }
  }

  const ranked = rankSignals(signals);
  const sum = summarize(ranked);
  return {
    userId,
    name,
    email,
    health: sum.health,
    critical: sum.bySeverity.critical,
    high: sum.bySeverity.high,
    top: ranked.filter((s) => s.severity === 'critical' || s.severity === 'high').slice(0, 5),
  };
}

/** One-line in-app brief; empty string means "nothing worth pinging". */
export function briefMessage(d: UserDigest): string {
  if (d.critical === 0 && d.high === 0) return '';
  const lead = d.top[0]?.title ?? 'items need attention';
  const more = d.critical + d.high - 1;
  return (
    `Morning brief — operational health ${d.health}/100. ` +
    `${d.critical} critical, ${d.high} high. ` +
    `Top: ${lead}${more > 0 ? ` (+${more} more)` : ''}.`
  );
}

export function briefEmailHtml(d: UserDigest): string {
  const rows = d.top
    .map(
      (s) =>
        `<tr><td style="padding:6px 0;color:#0B1020;font:14px -apple-system,Segoe UI,sans-serif">
          <strong>${escapeHtml(s.title)}</strong><br/>
          <span style="color:#64748B;font-size:12px">${escapeHtml(s.body)}</span>
        </td></tr>`,
    )
    .join('');
  return `
  <div style="max-width:520px;margin:0 auto;font:14px -apple-system,Segoe UI,sans-serif;color:#0B1020">
    <p style="font-size:18px;font-weight:600;margin:0 0 4px">Good morning, ${escapeHtml(d.name.split(' ')[0])}.</p>
    <p style="color:#64748B;margin:0 0 16px">
      Operational health <strong>${d.health}/100</strong> ·
      ${d.critical} critical · ${d.high} high
    </p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <p style="margin:20px 0 0">
      <a href="${process.env.APP_URL || 'http://localhost:3000'}/signals"
         style="color:#7C3AED;font-weight:600;text-decoration:none">Open Signals →</a>
    </p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}
