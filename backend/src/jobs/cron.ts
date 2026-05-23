import cron from 'node-cron';
// System actor: cron aggregates across tenants → use the un-guarded client.
// NOTE: not yet per-tenant aware (tracked: queue/observability sprint).
import { rawPrisma as prisma } from '../utils/prisma';
import { runAsSystem } from '../core/als';
import { createNotification } from '../controllers/notificationController';
import { computeUserDigest, briefMessage, briefEmailHtml } from '../core/digest';
import { sendMail } from '../core/mailer';
import logger from '../utils/logger';

/* ═══════════════════════════════════════════════════════
   theory — 7 Scheduled Jobs
   All times IST (UTC+5:30) expressed as UTC for cron
   ═══════════════════════════════════════════════════════ */

/** Utility: true only on weekdays */
function isWeekday() {
  const d = new Date().getDay();
  return d >= 1 && d <= 5;
}

/** Sunday midnight UTC — start of week for aggregation */
function weekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/* ─────────────────────────────────────────────────────────────────────────
   JOB 1: Daily Team Signal Aggregation
   Schedule: 00:00 IST (18:30 UTC prev day) → run at midnight UTC as proxy
   Computes blockerCount, slaCompliance, healthScore, workloadData per team
   ───────────────────────────────────────────────────────────────────────── */
async function computeTeamSignals() {
  logger.info('CRON job1: computing team signals');
  const now  = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const teams = await prisma.team.findMany({
    include: { members: { select: { id: true } } },
  });

  for (const team of teams) {
    const memberIds = team.members.map(m => m.id);
    if (memberIds.length === 0) continue;

    const [workItems, followUps] = await Promise.all([
      prisma.workItem.findMany({
        where: { userId: { in: memberIds } },
        select: { status: true, slaDate: true, priority: true },
      }),
      prisma.followUp.findMany({
        where: { userId: { in: memberIds }, status: { not: 'CLOSED' } },
        select: { dueDate: true },
      }),
    ]);

    const blockerCount = workItems.filter(i => i.status === 'BLOCKED').length;
    const slaItems     = workItems.filter(i => i.slaDate);
    const slaBreaches  = slaItems.filter(i => i.slaDate && new Date(i.slaDate) < now && i.status !== 'DONE' && i.status !== 'CANCELLED').length;
    const slaCompliance = slaItems.length > 0
      ? ((slaItems.length - slaBreaches) / slaItems.length) * 100
      : 100;
    const overdueFollowUps = followUps.filter(f => f.dueDate && new Date(f.dueDate) < now).length;

    // Health score: start at 100, deduct for issues
    const healthScore = Math.max(0, Math.round(
      100
      - blockerCount * 10
      - slaBreaches * 15
      - overdueFollowUps * 5
    ));

    const byStatus: Record<string, number> = {};
    for (const w of workItems) byStatus[w.status] = (byStatus[w.status] ?? 0) + 1;

    await prisma.teamSignal.upsert({
      where: { teamId_date: { teamId: team.id, date: today } },
      create: {
        teamId: team.id, tenantId: team.tenantId, date: today,
        blockerCount, slaCompliance, healthScore,
        workloadData: { byStatus, memberCount: memberIds.length },
      },
      update: {
        blockerCount, slaCompliance, healthScore,
        workloadData: { byStatus, memberCount: memberIds.length },
      },
    });
  }
  logger.info(`CRON job1: computed signals for ${teams.length} teams`);
}

/* ─────────────────────────────────────────────────────────────────────────
   JOB 2: SLA Breach Alert to Managers
   Schedule: 08:00 IST (02:30 UTC), weekdays
   Notifies each manager about their team's SLA breaches
   ───────────────────────────────────────────────────────────────────────── */
async function slaBreachAlert() {
  if (!isWeekday()) return;
  logger.info('CRON job2: SLA breach alerts');
  const now = new Date();

  const breachedItems = await prisma.workItem.findMany({
    where: {
      slaDate: { lt: now },
      status: { notIn: ['DONE', 'CANCELLED'] },
    },
    include: {
      user: { select: { id: true, name: true, managerId: true } },
    },
  });

  // Group by manager
  const byManager: Record<string, { managerId: string; items: typeof breachedItems }> = {};
  for (const item of breachedItems) {
    if (!item.user.managerId) continue;
    if (!byManager[item.user.managerId]) byManager[item.user.managerId] = { managerId: item.user.managerId, items: [] };
    byManager[item.user.managerId].items.push(item);
  }

  for (const { managerId, items } of Object.values(byManager)) {
    await createNotification(
      managerId,
      'SLA_BREACH',
      `⚠️ ${items.length} work item${items.length > 1 ? 's' : ''} have breached SLA on your team. Review the Manager Console.`,
      '/manager'
    );
  }
  logger.info(`CRON job2: sent SLA alerts for ${Object.keys(byManager).length} managers`);
}

/* ─────────────────────────────────────────────────────────────────────────
   JOB 3: Overdue Follow-up Alert to Users
   Schedule: 09:00 IST (03:30 UTC), weekdays
   Notifies each user about their overdue follow-ups
   ───────────────────────────────────────────────────────────────────────── */
async function overdueFollowUpAlert() {
  if (!isWeekday()) return;
  logger.info('CRON job3: overdue follow-up alerts');
  const now = new Date();

  const overdueFollowUps = await prisma.followUp.findMany({
    where: {
      dueDate: { lt: now },
      status: { not: 'CLOSED' },
    },
    select: { userId: true, person: true, topic: true },
  });

  // Group by user
  const byUser: Record<string, { count: number; sample: string }> = {};
  for (const f of overdueFollowUps) {
    if (!byUser[f.userId]) byUser[f.userId] = { count: 0, sample: f.person };
    byUser[f.userId].count++;
  }

  for (const [userId, { count, sample }] of Object.entries(byUser)) {
    await createNotification(
      userId,
      'FOLLOW_UP_OVERDUE',
      `📋 You have ${count} overdue follow-up${count > 1 ? 's' : ''} (e.g. ${sample}). Check your Follow-ups tab.`,
      '/follow-ups'
    );
  }
  logger.info(`CRON job3: sent overdue alerts to ${Object.keys(byUser).length} users`);
}

/* ─────────────────────────────────────────────────────────────────────────
   JOB 4: Standup Reminder
   Schedule: 09:30 IST (04:00 UTC), weekdays
   Notifies users who haven't set a focus for today
   ───────────────────────────────────────────────────────────────────────── */
async function standupReminder() {
  if (!isWeekday()) return;
  logger.info('CRON job4: standup reminder');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allUsers = await prisma.user.findMany({
    where: { active: true },
    select: { id: true },
  });

  const logsToday = await prisma.dailyLog.findMany({
    where: { date: today, focusText: { not: null } },
    select: { userId: true },
  });

  const loggedIds = new Set(logsToday.map(l => l.userId));
  const missingUsers = allUsers.filter(u => !loggedIds.has(u.id));

  for (const user of missingUsers) {
    await createNotification(
      user.id,
      'STANDUP_MISSING',
      '🌅 Good morning! Set your focus for today and log your standup.',
      '/daily'
    );
  }
  logger.info(`CRON job4: sent standup reminders to ${missingUsers.length} users`);
}

/* ─────────────────────────────────────────────────────────────────────────
   JOB 5: EOD Prompt
   Schedule: 17:30 IST (12:00 UTC), weekdays
   Reminds users who haven't filled the EOD note
   ───────────────────────────────────────────────────────────────────────── */
async function eodPrompt() {
  if (!isWeekday()) return;
  logger.info('CRON job5: EOD prompt');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allUsers = await prisma.user.findMany({
    where: { active: true },
    select: { id: true },
  });

  const eodFilled = await prisma.dailyLog.findMany({
    where: { date: today, eodNote: { not: null } },
    select: { userId: true },
  });

  const filledIds = new Set(eodFilled.map(l => l.userId));
  const pendingUsers = allUsers.filter(u => !filledIds.has(u.id));

  for (const user of pendingUsers) {
    await createNotification(
      user.id,
      'EOD_PROMPT',
      '🌆 Time to wrap up! Fill your end-of-day log before you sign off.',
      '/daily'
    );
  }
  logger.info(`CRON job5: sent EOD prompts to ${pendingUsers.length} users`);
}

/* ─────────────────────────────────────────────────────────────────────────
   JOB 6: Blocker Alert to Managers (blockers >24h)
   Schedule: 10:00 IST (04:30 UTC), daily
   Alerts managers about long-standing blockers on their team
   ───────────────────────────────────────────────────────────────────────── */
async function blockerAlert() {
  logger.info('CRON job6: blocker alerts');
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago

  const longBlockers = await prisma.workItem.findMany({
    where: {
      status: 'BLOCKED',
      blockedAt: { lt: cutoff },
    },
    include: {
      user: { select: { id: true, name: true, managerId: true } },
    },
  });

  const byManager: Record<string, { items: typeof longBlockers }> = {};
  for (const item of longBlockers) {
    if (!item.user.managerId) continue;
    if (!byManager[item.user.managerId]) byManager[item.user.managerId] = { items: [] };
    byManager[item.user.managerId].items.push(item);
  }

  for (const [managerId, { items }] of Object.entries(byManager)) {
    const names = items.map(i => i.user.name).join(', ');
    await createNotification(
      managerId,
      'BLOCKER_ALERT',
      `🔴 ${items.length} blocker${items.length > 1 ? 's' : ''} on your team ${items.length > 1 ? 'have' : 'has'} been stuck >24h (${names}). Intervene now.`,
      '/manager'
    );
  }
  logger.info(`CRON job6: sent blocker alerts for ${Object.keys(byManager).length} managers`);
}

/* ─────────────────────────────────────────────────────────────────────────
   JOB 7: Weekly Manager Digest
   Schedule: Monday 08:30 IST (03:00 UTC)
   Sends managers a weekly health summary for their team
   ───────────────────────────────────────────────────────────────────────── */
async function weeklyManagerDigest() {
  const d = new Date().getDay();
  if (d !== 1) return; // Monday only
  logger.info('CRON job7: weekly manager digest');

  const managers = await prisma.user.findMany({
    where: { role: { in: ['MANAGER', 'LEADERSHIP', 'ADMIN'] }, active: true },
    select: { id: true, name: true },
  });

  const ws = weekStart();
  const we = new Date(ws.getTime() + 7 * 86400000);

  for (const manager of managers) {
    // Get latest TeamSignal for their teams
    const teams = await prisma.team.findMany({
      where: { managerId: manager.id },
      select: { id: true, name: true },
    });

    const signals = teams.length > 0
      ? await prisma.teamSignal.findMany({
          where: { teamId: { in: teams.map(t => t.id) }, date: { gte: ws, lt: we } },
          orderBy: { date: 'desc' },
          distinct: ['teamId'],
        })
      : [];

    const avgHealth = signals.length > 0
      ? Math.round(signals.reduce((a, s) => a + s.healthScore, 0) / signals.length)
      : null;

    const healthLabel = avgHealth === null ? 'no data'
      : avgHealth >= 80 ? '🟢 Healthy'
      : avgHealth >= 60 ? '🟡 At Risk'
      : '🔴 Critical';

    await createNotification(
      manager.id,
      'SYSTEM',
      `📊 Weekly Digest: Your team health is ${healthLabel}${avgHealth !== null ? ` (${avgHealth}/100)` : ''}. Check the Manager Console for details.`,
      '/manager'
    );
  }
  logger.info(`CRON job7: sent weekly digest to ${managers.length} managers`);
}

/* ─────────────────────────────────────────────────────────────────────────
   JOB 8: Personal Morning Brief (signal-engine delivery)
   Schedule: 08:00 IST (02:30 UTC), weekdays
   Consolidated per-person brief from the signal engine — the
   "signals must be delivered, not just displayed" guarantee.
   In-app notification + best-effort email. Metadata only.
   ───────────────────────────────────────────────────────────────────────── */
async function morningBrief() {
  if (!isWeekday()) return;
  logger.info('CRON job8: personal morning brief');

  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, role: true },
    take: 5000,
  });

  let delivered = 0;
  for (const u of users) {
    try {
      const d = await computeUserDigest(u.id, u.name, u.email, u.role);
      const msg = briefMessage(d);
      if (!msg) continue; // nothing worth pinging — respect attention
      await createNotification(u.id, 'SYSTEM', msg, '/signals');
      sendMail({
        to: u.email,
        subject: `THEORY — morning brief · health ${d.health}/100`,
        html: briefEmailHtml(d),
      }).catch(() => { /* email is best-effort */ });
      delivered += 1;
    } catch (err) {
      logger.error(`CRON job8: brief failed for ${u.id}`, err);
    }
  }
  logger.info(`CRON job8: delivered ${delivered}/${users.length} morning briefs`);
}

/* ═══════════════════════════════════════════════════════
   START ALL CRON JOBS
   ═══════════════════════════════════════════════════════ */
export function startCronJobs() {
  // All jobs are SYSTEM actors → run inside runAsSystem so the tenant-guard
  // (fail-closed) lets cross-tenant aggregation + transitive guarded calls
  // (e.g. createNotification) through deliberately.
  const job = (name: string, fn: () => Promise<unknown>) => () => {
    runAsSystem(() => fn()).catch((err: unknown) => logger.error(`CRON ${name} error`, err));
  };

  cron.schedule('5 0 * * *',    job('job1-teamSignals', computeTeamSignals));
  cron.schedule('30 2 * * 1-5', job('job2-slaBreach', slaBreachAlert));
  cron.schedule('30 3 * * 1-5', job('job3-overdueFollowUps', overdueFollowUpAlert));
  cron.schedule('0 4 * * 1-5',  job('job4-standupReminder', standupReminder));
  cron.schedule('0 12 * * 1-5', job('job5-eodPrompt', eodPrompt));
  cron.schedule('30 4 * * *',   job('job6-blockerAlert', blockerAlert));
  cron.schedule('0 3 * * 1',    job('job7-weeklyDigest', weeklyManagerDigest));
  cron.schedule('30 2 * * 1-5', job('job8-morningBrief', morningBrief));

  logger.info('✅ 8 cron jobs registered (IST-aligned, system-scoped)');
}
