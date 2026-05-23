import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, AlertTriangle, TrendingUp, BarChart2, Users, RefreshCw,
  Shield, Layers, Activity,
} from 'lucide-react';
import {
  fetchOrgOverview, fetchOrgTeamSignals, fetchOrgBlockers,
  fetchOrgCompliance, fetchOrgWorkBreakdown,
  type OrgOverview, type TeamSignalRow, type OrgBlocker,
  type DeptCompliance, type DeptWorkBreakdown,
} from '../services/leadershipService';
import toast from 'react-hot-toast';

/* ── helpers ─────────────────────────────────────────────────────────── */
function healthColor(score: number) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function complianceColor(pct: number) {
  if (pct >= 90) return '#22c55e';
  if (pct >= 70) return '#f59e0b';
  return '#ef4444';
}

const STATUS_COLORS: Record<string, string> = {
  TODO:        '#94a3b8',
  IN_PROGRESS: '#6366f1',
  IN_REVIEW:   '#a855f7',
  BLOCKED:     '#ef4444',
  DONE:        '#22c55e',
  CANCELLED:   '#64748b',
};

function fmtDays(days: number) {
  if (days === 0) return 'Today';
  if (days === 1) return '1d';
  return `${days}d`;
}

/* ── KPI card ─────────────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, accent, sub }:
  { icon: React.ElementType; label: string; value: string | number; accent?: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)' }}
    >
      <Icon size={16} style={{ color: accent ?? 'var(--m3-primary)' }} />
      <p className="text-2xl font-bold" style={{ color: accent ?? 'var(--m3-on-surf)' }}>{value}</p>
      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--m3-on-surf)' }}>{label}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--m3-on-surf-var)' }}>{sub}</p>}
      </div>
    </motion.div>
  );
}

/* ── Panel ─────────────────────────────────────────────────────────────── */
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

/* ── Team health cell (heatmap tile) ─────────────────────────────────── */
function TeamTile({ team }: { team: TeamSignalRow }) {
  const score = team.signal?.healthScore ?? null;
  const color = score !== null ? healthColor(score) : 'var(--m3-on-surf-var)';

  return (
    <motion.div
      whileHover={{ scale: 1.03, zIndex: 10 }}
      className="rounded-xl p-3 cursor-default relative"
      style={{
        background: score !== null
          ? `color-mix(in srgb, ${color} 10%, var(--m3-surf3))`
          : 'var(--m3-surf3)',
        border: `1.5px solid ${score !== null ? color : 'var(--m3-outline-v)'}`,
        minHeight: '80px',
      }}
      title={`${team.name} · ${team.dept.name} · ${team._count.members} members`}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-xs font-semibold truncate flex-1" style={{ color: 'var(--m3-on-surf)' }}>
          {team.name}
        </span>
        {score !== null && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1"
            style={{ background: color, color: '#fff' }}
          >
            {score}
          </span>
        )}
      </div>
      <p className="text-[9px] truncate" style={{ color: 'var(--m3-on-surf-var)' }}>
        {team.dept.name} · {team.dept.bu.name}
      </p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[9px]" style={{ color: 'var(--m3-on-surf-var)' }}>
          👥 {team._count.members}
        </span>
        {team.signal && (
          <>
            <span className="text-[9px]" style={{ color: 'var(--m3-error)' }}>
              🔴 {team.signal.blockerCount}
            </span>
            <span className="text-[9px]" style={{ color: score !== null ? color : 'var(--m3-on-surf-var)' }}>
              {team.signal.slaCompliance.toFixed(0)}% SLA
            </span>
          </>
        )}
        {!team.signal && (
          <span className="text-[9px]" style={{ color: 'var(--m3-on-surf-var)', opacity: 0.5 }}>No data</span>
        )}
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function OrgPulsePage() {
  const [overview,    setOverview]    = useState<OrgOverview | null>(null);
  const [teamSignals, setTeamSignals] = useState<TeamSignalRow[]>([]);
  const [blockers,    setBlockers]    = useState<OrgBlocker[]>([]);
  const [compliance,  setCompliance]  = useState<DeptCompliance[]>([]);
  const [breakdown,   setBreakdown]   = useState<DeptWorkBreakdown[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [buFilter,    setBuFilter]    = useState<string>('all');

  async function load(quiet = false) {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [ov, ts, bl, co, bk] = await Promise.all([
        fetchOrgOverview(),
        fetchOrgTeamSignals(),
        fetchOrgBlockers(),
        fetchOrgCompliance(),
        fetchOrgWorkBreakdown(),
      ]);
      setOverview(ov);
      setTeamSignals(ts);
      setBlockers(bl);
      setCompliance(co);
      setBreakdown(bk);
    } catch {
      toast.error('Failed to load org data');
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
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
            <RefreshCw size={24} style={{ color: 'var(--m3-primary)' }} />
          </motion.div>
          <p className="text-sm" style={{ color: 'var(--m3-on-surf-var)' }}>Loading org data…</p>
        </div>
      </div>
    );
  }

  /* ── BU filter ── */
  const buNames = ['all', ...Array.from(new Set(teamSignals.map(t => t.dept.bu.name)))];
  const filteredTeams = buFilter === 'all'
    ? teamSignals
    : teamSignals.filter(t => t.dept.bu.name === buFilter);

  /* ── Org health aggregate ── */
  const teamsWithSignal = teamSignals.filter(t => t.signal);
  const avgOrgHealth = teamsWithSignal.length > 0
    ? Math.round(teamsWithSignal.reduce((a, t) => a + (t.signal!.healthScore), 0) / teamsWithSignal.length)
    : null;

  /* ── Work breakdown totals ── */
  const wbTotal = breakdown.reduce((a, d) => a + d.total, 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--m3-outline-v)' }}
      >
        <div>
          <h2 className="font-semibold text-base" style={{ color: 'var(--m3-on-surf)' }}>Org Pulse</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--m3-on-surf-var)' }}>
            Leadership view · {overview?.userCount ?? 0} people · {overview?.teamCount ?? 0} teams
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

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* ── KPI strip ── */}
        {overview && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <KpiCard icon={Users}         label="People"           value={overview.userCount} />
            <KpiCard icon={Building2}     label="Teams"            value={overview.teamCount} />
            <KpiCard icon={Layers}        label="Departments"      value={overview.deptCount} />
            <KpiCard icon={Activity}      label="Org Health"
              value={avgOrgHealth !== null ? `${avgOrgHealth}/100` : '—'}
              accent={avgOrgHealth !== null ? healthColor(avgOrgHealth) : undefined} />
            <KpiCard icon={AlertTriangle} label="Blockers"         value={overview.blockers}
              accent={overview.blockers > 0 ? '#ef4444' : '#22c55e'} />
            <KpiCard icon={Shield}        label="SLA Compliance"   value={`${overview.slaCompliance}%`}
              accent={complianceColor(overview.slaCompliance)} />
            <KpiCard icon={TrendingUp}    label="Overdue Follow-ups" value={overview.overdueFollowUps}
              accent={overview.overdueFollowUps > 0 ? '#f59e0b' : '#22c55e'} />
            <KpiCard icon={BarChart2}     label="Work Items"       value={overview.workItems}
              sub={`${overview.done} done`} />
          </div>
        )}

        {/* ── Team Health Heatmap ── */}
        <Panel title="Team Health Heatmap" icon={Activity} delay={0.05}>
          {/* BU filter tabs */}
          {buNames.length > 2 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {buNames.map(bu => (
                <button
                  key={bu}
                  onClick={() => setBuFilter(bu)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: buFilter === bu ? 'var(--m3-primary)' : 'var(--m3-surf3)',
                    color: buFilter === bu ? 'var(--m3-on-primary)' : 'var(--m3-on-surf)',
                  }}
                >
                  {bu === 'all' ? 'All BUs' : bu}
                </button>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mb-3">
            {[['🟢 Healthy', '#22c55e'], ['🟡 At Risk', '#f59e0b'], ['🔴 Critical', '#ef4444']].map(([lbl, col]) => (
              <span key={lbl} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--m3-on-surf-var)' }}>
                <span className="w-3 h-3 rounded-sm" style={{ background: col as string }} />
                {lbl} (&gt;= {lbl.includes('Healthy') ? 80 : lbl.includes('Risk') ? 60 : 0})
              </span>
            ))}
          </div>

          {filteredTeams.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--m3-on-surf-var)' }}>No teams found</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {filteredTeams.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <TeamTile team={t} />
                </motion.div>
              ))}
            </div>
          )}
        </Panel>

        {/* ── Row: Blockers + Compliance ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Org-wide blockers */}
          <Panel title="Org Blockers" icon={AlertTriangle} delay={0.1}>
            {blockers.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <span className="text-3xl">🎉</span>
                <p className="text-sm" style={{ color: 'var(--m3-on-surf-var)' }}>No blockers across the org!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {blockers.map((b, i) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{
                      background: b.blockedDays >= 3
                        ? 'color-mix(in srgb, #ef4444 8%, transparent)'
                        : 'var(--m3-surf2)',
                      border: `1px solid ${b.blockedDays >= 3 ? 'color-mix(in srgb, #ef4444 25%, transparent)' : 'var(--m3-outline-v)'}`,
                    }}
                  >
                    {/* Days badge */}
                    <span
                      className="text-[10px] font-bold px-2 py-1 rounded-lg shrink-0"
                      style={{
                        background: b.blockedDays >= 3 ? '#ef4444' : b.blockedDays >= 1 ? '#f59e0b' : 'var(--m3-surf4)',
                        color: b.blockedDays >= 1 ? '#fff' : 'var(--m3-on-surf)',
                      }}
                    >
                      {fmtDays(b.blockedDays)}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--m3-on-surf)' }}>
                        {b.title}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--m3-on-surf-var)' }}>
                        {b.user.name}
                        {b.user.team && ` · ${b.user.team.name}`}
                        {b.user.dept && ` · ${b.user.dept.name}`}
                      </p>
                    </div>

                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        background: b.priority === 'HIGH'
                          ? 'color-mix(in srgb, #ef4444 12%, transparent)'
                          : b.priority === 'MEDIUM'
                            ? 'color-mix(in srgb, #f59e0b 12%, transparent)'
                            : 'var(--m3-surf4)',
                        color: b.priority === 'HIGH' ? '#ef4444'
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

          {/* SLA Compliance by dept */}
          <Panel title="SLA Compliance by Department" icon={Shield} delay={0.12}>
            {compliance.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--m3-on-surf-var)' }}>No SLA data</p>
            ) : (
              <div className="space-y-3">
                {compliance.sort((a, b) => a.compliance - b.compliance).map((d, i) => {
                  const color = complianceColor(d.compliance);
                  return (
                    <div key={d.deptId}>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-xs font-medium" style={{ color: 'var(--m3-on-surf)' }}>
                            {d.deptName}
                          </span>
                          <span className="text-[10px] ml-1.5" style={{ color: 'var(--m3-on-surf-var)' }}>
                            {d.buName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {d.breached > 0 && (
                            <span className="text-[10px]" style={{ color: '#ef4444' }}>
                              {d.breached} breach{d.breached > 1 ? 'es' : ''}
                            </span>
                          )}
                          <span
                            className="text-xs font-bold"
                            style={{ color }}
                          >
                            {d.compliance}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--m3-surf4)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${d.compliance}%` }}
                          transition={{ delay: 0.15 + i * 0.04, ease: [0.2, 0, 0, 1] }}
                          className="h-full rounded-full"
                          style={{ background: color }}
                        />
                      </div>
                      <p className="text-[9px] mt-0.5 text-right" style={{ color: 'var(--m3-on-surf-var)' }}>
                        {d.totalSlaItems} tracked items
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* ── Work breakdown by dept ── */}
        <Panel title="Work Breakdown by Department" icon={BarChart2} delay={0.15}>
          {breakdown.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--m3-on-surf-var)' }}>No work items</p>
          ) : (
            <div className="space-y-3">
              {breakdown.sort((a, b) => b.total - a.total).map((d, i) => {
                const statuses = ['IN_PROGRESS', 'TODO', 'BLOCKED', 'IN_REVIEW', 'DONE', 'CANCELLED'] as const;
                return (
                  <div key={d.deptId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: 'var(--m3-on-surf)' }}>
                        {d.deptName}
                      </span>
                      <div className="flex items-center gap-3">
                        {d.blockers > 0 && (
                          <span className="text-[10px]" style={{ color: '#ef4444' }}>
                            🔴 {d.blockers}
                          </span>
                        )}
                        <span className="text-[11px]" style={{ color: 'var(--m3-on-surf-var)' }}>
                          {d.total} items
                        </span>
                      </div>
                    </div>
                    <div className="flex h-5 rounded-lg overflow-hidden gap-px" style={{ background: 'var(--m3-surf4)' }}>
                      {d.total === 0 ? (
                        <div className="flex-1" style={{ background: 'var(--m3-surf4)' }} />
                      ) : statuses.map(s => {
                        const count = d.byStatus[s] ?? 0;
                        if (count === 0) return null;
                        const pct = (count / d.total) * 100;
                        return (
                          <motion.div
                            key={s}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 0.1 + i * 0.04, ease: [0.2, 0, 0, 1] }}
                            title={`${s}: ${count}`}
                            style={{
                              width: `${pct}%`,
                              background: STATUS_COLORS[s] ?? '#94a3b8',
                              transformOrigin: 'left',
                            }}
                          />
                        );
                      })}
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {statuses.filter(s => (d.byStatus[s] ?? 0) > 0).map(s => (
                        <span key={s} className="flex items-center gap-1 text-[9px]" style={{ color: 'var(--m3-on-surf-var)' }}>
                          <span className="w-2 h-2 rounded-sm" style={{ background: STATUS_COLORS[s] }} />
                          {s.replace('_', ' ')} ({d.byStatus[s]})
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* ── Work item KPIs ── */}
        {overview && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)' }}>
              <p className="text-2xl font-bold" style={{ color: '#6366f1' }}>{overview.inProgress}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>In Progress</p>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)' }}>
              <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{overview.blockers}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>Blocked</p>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)' }}>
              <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{overview.done}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>Done</p>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--m3-on-surf)' }}>{overview.weeklyMeetings}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>Weekly meetings</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
