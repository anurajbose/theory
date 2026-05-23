import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, AlertTriangle, Clock, TrendingUp, BarChart2,
  CalendarDays, RefreshCw, ChevronRight, Zap,
} from 'lucide-react';
import {
  fetchManagerOverview, fetchManagerWorkItems, fetchManagerBlockers,
  fetchManagerFollowUps, fetchManagerTimeSummary, fetchManagerMeetings,
  type ManagerOverview, type MemberWorkItems, type BlockerItem,
  type FollowUpItem, type TimeSummary, type MeetingSummary,
} from '../services/managerService';
import toast from 'react-hot-toast';

/* ── helpers ────────────────────────────────────────────────────────── */
const STATUS_COLOR: Record<string, string> = {
  TODO:        'var(--m3-on-surf-var)',
  IN_PROGRESS: 'var(--m3-primary)',
  IN_REVIEW:   '#a855f7',
  BLOCKED:     'var(--m3-error)',
  DONE:        '#22c55e',
  CANCELLED:   'var(--m3-on-surf-var)',
};

const CAT_LABEL: Record<string, string> = {
  CR_WORK:'CR Work', TICKET:'Ticket', MEETING:'Meeting', DOCS:'Docs',
  FOLLOW_UP:'Follow-up', STRATEGIC:'Strategic', ADMIN:'Admin',
  SUPPORT:'Support', ANALYSIS:'Analysis', TESTING:'Testing',
  DEPLOY:'Deploy', OTHER:'Other',
};

const CAT_COLORS = [
  '#6366f1','#0ea5e9','#f59e0b','#22c55e','#ec4899',
  '#a855f7','#14b8a6','#f97316','#84cc16','#e11d48',
  '#06b6d4','#8b5cf6',
];

function healthColor(score: number) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return 'var(--m3-error)';
}

function healthLabel(score: number) {
  if (score >= 80) return '🟢 Healthy';
  if (score >= 60) return '🟡 At Risk';
  return '🔴 Critical';
}

function fmtMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
}

function blockedDaysLabel(days: number) {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

/* ── Stat card ──────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, accent }:
  { icon: React.ElementType; label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 flex flex-col gap-2"
      style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)' }}
    >
      <div className="flex items-center justify-between">
        <Icon size={18} style={{ color: accent ?? 'var(--m3-primary)' }} />
        {sub && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--m3-surf4)', color: 'var(--m3-on-surf-var)' }}>{sub}</span>}
      </div>
      <p className="text-2xl font-bold" style={{ color: accent ?? 'var(--m3-on-surf)' }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--m3-on-surf-var)' }}>{label}</p>
    </motion.div>
  );
}

/* ── Panel wrapper ──────────────────────────────────────────────────── */
function Panel({ title, icon: Icon, children, delay = 0 }:
  { title: string; icon: React.ElementType; children: React.ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: [0.2, 0, 0, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--m3-surf1)', border: '1px solid var(--m3-outline-v)' }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--m3-outline-v)', background: 'var(--m3-surf2)' }}
      >
        <Icon size={16} style={{ color: 'var(--m3-primary)' }} />
        <span className="font-semibold text-sm" style={{ color: 'var(--m3-on-surf)' }}>{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </motion.section>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
export default function ManagerPage() {
  const [overview,    setOverview]    = useState<ManagerOverview | null>(null);
  const [workItems,   setWorkItems]   = useState<MemberWorkItems[]>([]);
  const [blockers,    setBlockers]    = useState<BlockerItem[]>([]);
  const [followUps,   setFollowUps]   = useState<FollowUpItem[]>([]);
  const [timeSummary, setTimeSummary] = useState<TimeSummary | null>(null);
  const [meetings,    setMeetings]    = useState<MeetingSummary | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  async function load(quiet = false) {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [ov, wi, bl, fu, ts, mt] = await Promise.all([
        fetchManagerOverview(),
        fetchManagerWorkItems(),
        fetchManagerBlockers(),
        fetchManagerFollowUps(),
        fetchManagerTimeSummary(),
        fetchManagerMeetings(),
      ]);
      setOverview(ov);
      setWorkItems(wi);
      setBlockers(bl);
      setFollowUps(fu);
      setTimeSummary(ts);
      setMeetings(mt);
    } catch {
      toast.error('Failed to load manager data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          >
            <RefreshCw size={24} style={{ color: 'var(--m3-primary)' }} />
          </motion.div>
          <p className="text-sm" style={{ color: 'var(--m3-on-surf-var)' }}>Loading manager data…</p>
        </div>
      </div>
    );
  }

  /* ── derive category chart data ── */
  const catEntries = Object.entries(timeSummary?.byCategory ?? {})
    .sort((a, b) => b[1] - a[1]);
  const totalCatMins = catEntries.reduce((a, [, v]) => a + v, 0);

  /* ── follow-up aging buckets ── */
  const overdueFollowUps = followUps.filter(f => f.overdue);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--m3-outline-v)' }}
      >
        <div>
          <h2 className="font-semibold text-base" style={{ color: 'var(--m3-on-surf)' }}>Manager Console</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--m3-on-surf-var)' }}>
            Team health at a glance · refreshes every 30s
          </p>
        </div>
        <motion.button
          onClick={() => load(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{ background: 'var(--m3-surf3)', color: 'var(--m3-on-surf)' }}
        >
          <motion.span animate={{ rotate: refreshing ? 360 : 0 }} transition={{ repeat: refreshing ? Infinity : 0, duration: 0.8, ease: 'linear' }}>
            <RefreshCw size={12} />
          </motion.span>
          Refresh
        </motion.button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* ── KPI strip ── */}
        {overview && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={Users}        label="Team members"     value={overview.memberCount} />
            <StatCard icon={Zap}          label="Health score"     value={healthLabel(overview.healthScore)}
              accent={healthColor(overview.healthScore)} />
            <StatCard icon={AlertTriangle} label="Active blockers" value={overview.blockers}
              accent={overview.blockers > 0 ? 'var(--m3-error)' : '#22c55e'} />
            <StatCard icon={TrendingUp}   label="SLA compliance"  value={`${Math.round(overview.slaCompliance)}%`}
              accent={overview.slaCompliance >= 90 ? '#22c55e' : overview.slaCompliance >= 70 ? '#f59e0b' : 'var(--m3-error)'} />
            <StatCard icon={Clock}        label="Overdue follow-ups" value={overview.overdueFollowUps}
              accent={overview.overdueFollowUps > 0 ? '#f59e0b' : '#22c55e'} />
            <StatCard icon={CalendarDays} label="Meetings this week" value={overview.weeklyMeetings} />
          </div>
        )}

        {/* ── Row 1: Work Items + Blockers ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Panel 1: Team Work Distribution */}
          <Panel title="Team Work Distribution" icon={BarChart2} delay={0.05}>
            {workItems.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--m3-on-surf-var)' }}>No work items found</p>
            ) : (
              <div className="space-y-3">
                {workItems.map((m, i) => {
                  const bars = [
                    { key: 'inProgress', color: STATUS_COLOR.IN_PROGRESS, label: 'In Progress' },
                    { key: 'blocked',    color: STATUS_COLOR.BLOCKED,     label: 'Blocked' },
                    { key: 'inReview',   color: '#a855f7',                label: 'In Review' },
                    { key: 'todo',       color: 'var(--m3-outline)',      label: 'Todo' },
                  ] as const;
                  return (
                    <motion.div
                      key={m.userId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate" style={{ color: 'var(--m3-on-surf)' }}>
                          {m.name}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--m3-on-surf-var)' }}>
                          {m.total} items
                        </span>
                      </div>
                      {/* Stacked bar */}
                      <div className="flex h-5 rounded-lg overflow-hidden gap-px" style={{ background: 'var(--m3-surf4)' }}>
                        {m.total === 0 ? (
                          <div className="flex-1" style={{ background: 'var(--m3-surf4)' }} />
                        ) : bars.map(({ key, color, label }) => {
                          const pct = (m[key] / m.total) * 100;
                          if (pct === 0) return null;
                          return (
                            <motion.div
                              key={key}
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ delay: i * 0.04 + 0.1, ease: [0.2, 0, 0, 1] }}
                              title={`${label}: ${m[key]}`}
                              style={{ width: `${pct}%`, background: color, transformOrigin: 'left' }}
                            />
                          );
                        })}
                      </div>
                      {/* Mini legend */}
                      <div className="flex gap-3 mt-1">
                        {bars.map(({ key, color, label }) => m[key] > 0 && (
                          <span key={key} className="flex items-center gap-1 text-[9px]" style={{ color: 'var(--m3-on-surf-var)' }}>
                            <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
                            {label} ({m[key]})
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Panel 2: Active Blockers */}
          <Panel title="Active Blockers" icon={AlertTriangle} delay={0.08}>
            {blockers.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <span className="text-3xl">🎉</span>
                <p className="text-sm" style={{ color: 'var(--m3-on-surf-var)' }}>No blockers — team is flowing!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blockers.map((b, i) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{
                      background: b.blockedDays >= 2
                        ? 'color-mix(in srgb, var(--m3-error) 8%, transparent)'
                        : 'var(--m3-surf2)',
                      border: `1px solid ${b.blockedDays >= 2 ? 'color-mix(in srgb, var(--m3-error) 20%, transparent)' : 'var(--m3-outline-v)'}`,
                    }}
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: b.blockedDays >= 2 ? 'var(--m3-error)' : '#f59e0b',
                          color: '#fff',
                        }}
                      >
                        {blockedDaysLabel(b.blockedDays)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--m3-on-surf)' }}>
                        {b.title}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--m3-on-surf-var)' }}>
                        {b.memberName} · {b.sectionType}
                      </p>
                    </div>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        background: b.priority === 'HIGH' ? 'color-mix(in srgb, var(--m3-error) 15%, transparent)'
                          : b.priority === 'MEDIUM' ? 'color-mix(in srgb, #f59e0b 15%, transparent)'
                          : 'var(--m3-surf4)',
                        color: b.priority === 'HIGH' ? 'var(--m3-error)'
                          : b.priority === 'MEDIUM' ? '#f59e0b'
                          : 'var(--m3-on-surf-var)',
                      }}
                    >
                      {b.priority}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* ── Row 2: Follow-up aging + Time distribution ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Panel 3: Overdue Follow-ups */}
          <Panel title="Follow-up Aging" icon={Clock} delay={0.1}>
            {overdueFollowUps.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <span className="text-3xl">✅</span>
                <p className="text-sm" style={{ color: 'var(--m3-on-surf-var)' }}>All follow-ups on track</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueFollowUps.slice(0, 8).map((f, i) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-2.5 rounded-xl"
                    style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: 'var(--m3-surf4)', color: 'var(--m3-on-surf-var)' }}
                    >
                      {f.ageDays}d
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--m3-on-surf)' }}>
                        {f.person} — {f.topic}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--m3-on-surf-var)' }}>
                        {f.memberName} · {f.channel}
                      </p>
                    </div>
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: 'color-mix(in srgb, var(--m3-error) 12%, transparent)', color: 'var(--m3-error)' }}
                    >
                      Overdue
                    </span>
                  </motion.div>
                ))}
                {overdueFollowUps.length > 8 && (
                  <p className="text-center text-xs pt-1" style={{ color: 'var(--m3-on-surf-var)' }}>
                    +{overdueFollowUps.length - 8} more
                  </p>
                )}
              </div>
            )}
          </Panel>

          {/* Panel 4: Time Distribution by Category */}
          <Panel title="Time Distribution (This Week)" icon={TrendingUp} delay={0.12}>
            {catEntries.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--m3-on-surf-var)' }}>No time logs this week</p>
            ) : (
              <div className="space-y-2">
                {catEntries.map(([cat, mins], i) => {
                  const pct = totalCatMins > 0 ? (mins / totalCatMins) * 100 : 0;
                  const color = CAT_COLORS[i % CAT_COLORS.length];
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--m3-on-surf)' }}>
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                          {CAT_LABEL[cat] ?? cat}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--m3-on-surf-var)' }}>
                          {fmtMins(mins)} ({Math.round(pct)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--m3-surf4)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.15 + i * 0.03, ease: [0.2, 0, 0, 1] }}
                          className="h-full rounded-full"
                          style={{ background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* ── Row 3: Meeting load + by-member time ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Panel 5: Meeting Load */}
          <Panel title="Meeting Load" icon={CalendarDays} delay={0.14}>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl p-3 text-center" style={{ background: 'var(--m3-surf3)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--m3-on-surf)' }}>{meetings?.totalMeetings ?? 0}</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>Total meetings this week</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'var(--m3-surf3)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--m3-on-surf)' }}>{meetings?.weeklyHoursEstimate ?? 0}h</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>Estimated hours</p>
              </div>
            </div>
            {(meetings?.byMember ?? []).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium mb-2" style={{ color: 'var(--m3-on-surf-var)' }}>Per member</p>
                {meetings!.byMember.sort((a, b) => b.count - a.count).map((m, i) => (
                  <div key={m.userId} className="flex items-center gap-2">
                    <span className="text-xs w-28 truncate" style={{ color: 'var(--m3-on-surf)' }}>{m.name}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--m3-surf4)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(m.count / (meetings!.totalMeetings || 1)) * 100}%` }}
                        transition={{ delay: 0.2 + i * 0.04 }}
                        className="h-full rounded-full"
                        style={{ background: 'var(--m3-primary)' }}
                      />
                    </div>
                    <span className="text-xs shrink-0" style={{ color: 'var(--m3-on-surf-var)' }}>{m.count}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Panel 6: Per-Member Time Summary */}
          <Panel title="Member Time Summary" icon={Users} delay={0.16}>
            {(timeSummary?.byMember ?? []).length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--m3-on-surf-var)' }}>No time data this week</p>
            ) : (
              <div className="space-y-2">
                {timeSummary!.byMember.sort((a, b) => b.totalMins - a.totalMins).map((m, i) => {
                  const topCat = Object.entries(m.byCategory).sort((a, b) => b[1] - a[1])[0];
                  return (
                    <motion.div
                      key={m.userId}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)' }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'var(--m3-prim-c)', color: 'var(--m3-on-prim-c)' }}
                      >
                        {m.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: 'var(--m3-on-surf)' }}>{m.name}</p>
                        {topCat && (
                          <p className="text-[10px]" style={{ color: 'var(--m3-on-surf-var)' }}>
                            Top: {CAT_LABEL[topCat[0]] ?? topCat[0]}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: 'var(--m3-on-surf)' }}>
                          {fmtMins(m.totalMins)}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--m3-on-surf-var)' }}>this week</p>
                      </div>
                      <ChevronRight size={14} style={{ color: 'var(--m3-on-surf-var)' }} />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

      </div>
    </div>
  );
}
