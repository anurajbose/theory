/* ═══════════════════════════════════════════════════════════════
   SIGNAL ENGINE — derived operational intelligence.
   Pure detectors over already-fetched, tenant-scoped data. No new
   schema, no side effects. This is the layer that makes THEORY an
   intelligence product instead of a CRUD dashboard: signals are
   computed and surfaced, never manually gathered.
   ═══════════════════════════════════════════════════════════════ */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type SignalScope = 'self' | 'team' | 'org';

export interface Signal {
  id: string;
  type: string;
  severity: Severity;
  title: string;
  body: string;
  meta: string;
  scope: SignalScope;
  entityId?: string;
  subjectUserId?: string;
  count?: number;
  ts: string;
}

export interface WorkItemLite {
  id: string;
  userId: string;
  title: string;
  status: string;
  priority: string;
  slaDate: Date | null;
  blockedAt: Date | null;
  closedAt: Date | null;
  updatedAt: Date;
}
export interface FollowUpLite {
  id: string;
  userId: string;
  person: string;
  topic: string;
  status: string;
  dueDate: Date | null;
}
export interface DailyLogLite {
  userId: string;
  date: Date;
  moodScore: number | null;
}
export interface MemberLite { id: string; name: string }

const DAY = 86_400_000;
const days = (ms: number) => Math.floor(ms / DAY);
const now = () => Date.now();

/* ── 1 · Blocker aging ──────────────────────────────────────── */
export function detectBlockerAging(items: WorkItemLite[], scope: SignalScope): Signal[] {
  const out: Signal[] = [];
  for (const w of items) {
    if (w.status !== 'BLOCKED' || !w.blockedAt) continue;
    const age = days(now() - new Date(w.blockedAt).getTime());
    if (age < 2) continue;
    const sev: Severity = age >= 7 ? 'critical' : age >= 4 ? 'high' : 'medium';
    out.push({
      id: `blk-${w.id}`,
      type: 'blocker_aging',
      severity: sev,
      title: `Blocked ${age}d: ${w.title}`,
      body: `This item has been blocked for ${age} day${age === 1 ? '' : 's'} with no movement. Aging blockers are the strongest predictor of slipped delivery.`,
      meta: `${w.priority} · blocked ${age}d`,
      scope,
      entityId: w.id,
      subjectUserId: w.userId,
      ts: new Date().toISOString(),
    });
  }
  return out;
}

/* ── 2 · SLA risk / breach ──────────────────────────────────── */
export function detectSlaRisk(items: WorkItemLite[], scope: SignalScope): Signal[] {
  const out: Signal[] = [];
  for (const w of items) {
    if (!w.slaDate || w.status === 'DONE' || w.status === 'CANCELLED') continue;
    const delta = new Date(w.slaDate).getTime() - now();
    if (delta < 0) {
      out.push({
        id: `sla-${w.id}`,
        type: 'sla_breach',
        severity: 'critical',
        title: `SLA breached: ${w.title}`,
        body: `The SLA passed ${days(-delta)}d ago and the item is still ${w.status.toLowerCase()}.`,
        meta: `${w.priority} · overdue ${days(-delta)}d`,
        scope, entityId: w.id, subjectUserId: w.userId,
        ts: new Date().toISOString(),
      });
    } else if (delta < 2 * DAY) {
      out.push({
        id: `sla-${w.id}`,
        type: 'sla_risk',
        severity: 'high',
        title: `SLA at risk: ${w.title}`,
        body: `SLA is due in under 48h while the item is still ${w.status.toLowerCase()}.`,
        meta: `${w.priority} · due soon`,
        scope, entityId: w.id, subjectUserId: w.userId,
        ts: new Date().toISOString(),
      });
    }
  }
  return out;
}

/* ── 3 · Follow-up slippage ─────────────────────────────────── */
export function detectFollowUpSlippage(fu: FollowUpLite[], scope: SignalScope): Signal[] {
  const overdue = fu.filter(
    (f) => f.status !== 'CLOSED' && f.dueDate && new Date(f.dueDate).getTime() < now(),
  );
  if (overdue.length === 0) return [];
  if (overdue.length >= 4) {
    return [{
      id: 'fu-cluster',
      type: 'followup_cluster',
      severity: 'high',
      title: `${overdue.length} follow-ups overdue`,
      body: 'A cluster of follow-ups has slipped. Commitments waiting on others are silently aging out.',
      meta: `${overdue.length} overdue`,
      scope, count: overdue.length,
      ts: new Date().toISOString(),
    }];
  }
  return overdue.map((f) => ({
    id: `fu-${f.id}`,
    type: 'followup_overdue',
    severity: 'medium' as Severity,
    title: `Overdue follow-up: ${f.topic}`,
    body: `Waiting on ${f.person}. Past due — likely needs a nudge or escalation.`,
    meta: `with ${f.person}`,
    scope, entityId: f.id, subjectUserId: f.userId,
    ts: new Date().toISOString(),
  }));
}

/* ── 4 · Workload imbalance (team/org) ──────────────────────── */
export function detectWorkloadImbalance(
  items: WorkItemLite[], members: MemberLite[], scope: SignalScope,
): Signal[] {
  if (members.length < 3) return [];
  const open = new Map<string, number>();
  for (const w of items) {
    if (w.status === 'DONE' || w.status === 'CANCELLED') continue;
    open.set(w.userId, (open.get(w.userId) ?? 0) + 1);
  }
  const counts = members.map((m) => open.get(m.id) ?? 0);
  const sorted = [...counts].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  if (median === 0) return [];
  const out: Signal[] = [];
  for (const m of members) {
    const c = open.get(m.id) ?? 0;
    if (c >= median * 2 && c >= 6) {
      out.push({
        id: `load-${m.id}`,
        type: 'workload_imbalance',
        severity: c >= median * 3 ? 'high' : 'medium',
        title: `${m.name} is carrying ${c} open items`,
        body: `That's ${(c / Math.max(median, 1)).toFixed(1)}× the team median (${median}). Overload precedes burnout and quality slips.`,
        meta: `${c} open · median ${median}`,
        scope, subjectUserId: m.id,
        ts: new Date().toISOString(),
      });
    }
  }
  return out;
}

/* ── 5 · At-risk / silent people (team/org) ─────────────────── */
export function detectAtRiskPeople(
  logs: DailyLogLite[], members: MemberLite[], scope: SignalScope,
): Signal[] {
  const out: Signal[] = [];
  const byUser = new Map<string, DailyLogLite[]>();
  for (const l of logs) {
    const arr = byUser.get(l.userId) ?? [];
    arr.push(l);
    byUser.set(l.userId, arr);
  }
  for (const m of members) {
    const ls = byUser.get(m.id) ?? [];
    const recent = ls.filter((l) => now() - new Date(l.date).getTime() < 5 * DAY);
    if (recent.length === 0) {
      out.push({
        id: `silent-${m.id}`,
        type: 'person_silent',
        severity: 'medium',
        title: `${m.name} has gone quiet`,
        body: 'No daily activity logged in the last 5 working days. Silence is a leading indicator of disengagement or being stuck.',
        meta: 'no recent activity',
        scope, subjectUserId: m.id,
        ts: new Date().toISOString(),
      });
      continue;
    }
    const moods = recent.map((l) => l.moodScore).filter((x): x is number => x != null);
    if (moods.length >= 3) {
      const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
      if (avg <= 2.2) {
        out.push({
          id: `mood-${m.id}`,
          type: 'person_low_morale',
          severity: 'high',
          title: `${m.name}'s morale is trending low`,
          body: `Average mood ${avg.toFixed(1)}/5 over the last few check-ins. Worth a private conversation.`,
          meta: `mood ${avg.toFixed(1)}/5`,
          scope, subjectUserId: m.id,
          ts: new Date().toISOString(),
        });
      }
    }
  }
  return out;
}

/* ── 6 · Momentum (info, week over week) ────────────────────── */
export function detectMomentum(items: WorkItemLite[], scope: SignalScope): Signal[] {
  const wk = 7 * DAY;
  const thisWk = items.filter(
    (w) => w.closedAt && now() - new Date(w.closedAt).getTime() < wk,
  ).length;
  const prevWk = items.filter((w) => {
    if (!w.closedAt) return false;
    const a = now() - new Date(w.closedAt).getTime();
    return a >= wk && a < 2 * wk;
  }).length;
  if (thisWk + prevWk < 3) return [];
  const diff = thisWk - prevWk;
  const pct = prevWk > 0 ? Math.round((diff / prevWk) * 100) : 100;
  if (Math.abs(pct) < 20) return [];
  const down = diff < 0;
  return [{
    id: 'momentum-wow',
    type: 'momentum',
    severity: down ? 'medium' : 'info',
    title: down
      ? `Throughput down ${Math.abs(pct)}% week over week`
      : `Throughput up ${pct}% week over week`,
    body: `Completed ${thisWk} this week vs ${prevWk} last week.`,
    meta: `${thisWk} vs ${prevWk}`,
    scope, count: thisWk,
    ts: new Date().toISOString(),
  }];
}

/* ── Aggregate + rank ───────────────────────────────────────── */
const RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export function rankSignals(signals: Signal[]): Signal[] {
  return [...signals].sort((a, b) => RANK[a.severity] - RANK[b.severity]);
}

export function summarize(signals: Signal[]) {
  const by: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const s of signals) by[s.severity] += 1;
  // Health: 100 minus weighted severity load, floored at 0.
  const load = by.critical * 14 + by.high * 7 + by.medium * 3 + by.low * 1;
  const health = Math.max(0, 100 - load);
  return { total: signals.length, bySeverity: by, health };
}
