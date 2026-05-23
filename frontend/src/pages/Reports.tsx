import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart2, TrendingUp, Clock, CheckCircle, CalendarDays,
  Download, RefreshCw, Star, Users, Zap,
} from 'lucide-react';
import { fetchPersonalReport, fetchTeamReport, downloadPersonalCSV, type PersonalWeeklyReport, type TeamWeeklyReport } from '../services/reportsService';
import { fetchMyEffortHistory, computeMyEffort, fetchTeamEffort, type EffortRecord, type TeamEffortRecord } from '../services/invisibleEffortService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

/* ── helpers ─────────────────────────────────────────────────────────── */
const CAT_COLORS: Record<string, string> = {
  CR_WORK:'#6366f1', TICKET:'#0ea5e9', MEETING:'#f59e0b', DOCS:'#22c55e',
  FOLLOW_UP:'#ec4899', STRATEGIC:'#a855f7', ADMIN:'#64748b',
  SUPPORT:'#14b8a6', ANALYSIS:'#f97316', TESTING:'#84cc16',
  DEPLOY:'#06b6d4', OTHER:'#8b5cf6',
};
const CAT_LABELS: Record<string, string> = {
  CR_WORK:'CR Work', TICKET:'Ticket', MEETING:'Meeting', DOCS:'Docs',
  FOLLOW_UP:'Follow-up', STRATEGIC:'Strategic', ADMIN:'Admin',
  SUPPORT:'Support', ANALYSIS:'Analysis', TESTING:'Testing', DEPLOY:'Deploy', OTHER:'Other',
};

function fmtMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
}

function effortColor(score: number) {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

/* ── Stat card ─────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, accent }:
  { icon: React.ElementType; label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)' }}
    >
      <Icon size={16} style={{ color: accent ?? 'var(--m3-primary)' }} />
      <p className="text-2xl font-bold" style={{ color: accent ?? 'var(--m3-on-surf)' }}>{value}</p>
      <p className="text-xs font-medium" style={{ color: 'var(--m3-on-surf)' }}>{label}</p>
      {sub && <p className="text-[10px]" style={{ color: 'var(--m3-on-surf-var)' }}>{sub}</p>}
    </motion.div>
  );
}

/* ── Mini trend bar chart ────────────────────────────────────────────── */
function TrendBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-16 shrink-0 text-right" style={{ color: 'var(--m3-on-surf-var)' }}>{label}</span>
      <div className="flex-1 h-5 rounded-lg overflow-hidden" style={{ background: 'var(--m3-surf4)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ease: [0.2, 0, 0, 1], duration: 0.5 }}
          className="h-full rounded-lg flex items-center px-2"
          style={{ background: color, minWidth: '24px' }}
        >
          <span className="text-[9px] text-white font-medium">{value}</span>
        </motion.div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const { user } = useAuthStore();
  const isManager = user?.role && ['MANAGER', 'ADMIN', 'LEADERSHIP'].includes(user.role);

  const [personal, setPersonal]         = useState<PersonalWeeklyReport | null>(null);
  const [team, setTeam]                 = useState<TeamWeeklyReport | null>(null);
  const [effortHistory, setEffortHistory] = useState<EffortRecord[]>([]);
  const [teamEffort, setTeamEffort]     = useState<TeamEffortRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [computing, setComputing]       = useState(false);
  const [downloading, setDownloading]   = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [p, eh] = await Promise.all([
        fetchPersonalReport(),
        fetchMyEffortHistory(),
      ]);
      setPersonal(p);
      setEffortHistory(eh);
      if (isManager) {
        const [t, te] = await Promise.all([fetchTeamReport(), fetchTeamEffort()]);
        setTeam(t);
        setTeamEffort(te);
      }
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleComputeEffort() {
    setComputing(true);
    try {
      const record = await computeMyEffort();
      setEffortHistory(prev => {
        const filtered = prev.filter(e => e.weekStart !== record.weekStart);
        return [record, ...filtered].sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
      });
      toast.success(`Effort score computed: ${record.score}`);
    } catch { toast.error('Failed to compute effort'); }
    finally { setComputing(false); }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      await downloadPersonalCSV(from, to);
    } catch { toast.error('Download failed'); }
    finally { setDownloading(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
            <RefreshCw size={24} style={{ color: 'var(--m3-primary)' }} />
          </motion.div>
          <p className="text-sm" style={{ color: 'var(--m3-on-surf-var)' }}>Loading reports…</p>
        </div>
      </div>
    );
  }

  const catEntries = Object.entries(personal?.timeByCategory ?? {}).sort((a, b) => b[1] - a[1]);
  const maxCatMins = catEntries[0]?.[1] ?? 1;
  const currentEffort = effortHistory[0] ?? null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--m3-outline-v)' }}
      >
        <div>
          <h2 className="font-semibold text-base" style={{ color: 'var(--m3-on-surf)' }}>Weekly Reports</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--m3-on-surf-var)' }}>
            {personal ? `Week of ${new Date(personal.week.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : '—'}
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={handleComputeEffort} disabled={computing}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: 'var(--m3-surf3)', color: 'var(--m3-on-surf)' }}
          >
            <motion.span animate={{ rotate: computing ? 360 : 0 }} transition={{ repeat: computing ? Infinity : 0, duration: 0.8, ease: 'linear' }}>
              <Zap size={12} />
            </motion.span>
            {computing ? 'Computing…' : 'Compute Effort'}
          </motion.button>
          <motion.button
            onClick={handleDownload} disabled={downloading}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: 'var(--m3-primary)', color: 'var(--m3-on-primary)' }}
          >
            <Download size={12} />{downloading ? 'Downloading…' : 'Export CSV'}
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* ── Personal KPIs ── */}
        {personal && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard icon={CheckCircle}  label="Done this week"  value={personal.workItems.done}      accent="#22c55e" />
            <StatCard icon={BarChart2}    label="In progress"     value={personal.workItems.inProgress} />
            <StatCard icon={Clock}        label="Hours logged"    value={fmtMins(personal.totalMins)}  sub="this week" />
            <StatCard icon={CalendarDays} label="Meetings"        value={personal.meetingsCount}        sub="attended" />
            <StatCard icon={Star}         label="Invisible effort"
              value={currentEffort ? `${currentEffort.score}` : '—'}
              accent={currentEffort ? effortColor(currentEffort.score) : undefined}
              sub="this week" />
          </div>
        )}

        {/* ── Row 1: Time breakdown + Work items ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Time by category */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--m3-surf1)', border: '1px solid var(--m3-outline-v)' }}
          >
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid var(--m3-outline-v)', background: 'var(--m3-surf2)' }}>
              <Clock size={14} style={{ color: 'var(--m3-primary)' }} />
              <span className="font-semibold text-sm" style={{ color: 'var(--m3-on-surf)' }}>Time by Category</span>
              <span className="ml-auto text-xs" style={{ color: 'var(--m3-on-surf-var)' }}>
                Total: {fmtMins(personal?.totalMins ?? 0)}
              </span>
            </div>
            <div className="p-4 space-y-2">
              {catEntries.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--m3-on-surf-var)' }}>No time logs this week</p>
              ) : catEntries.map(([cat, mins]) => (
                <TrendBar
                  key={cat}
                  label={CAT_LABELS[cat] ?? cat}
                  value={mins}
                  max={maxCatMins}
                  color={CAT_COLORS[cat] ?? '#64748b'}
                />
              ))}
            </div>
          </motion.section>

          {/* 4-week trend */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--m3-surf1)', border: '1px solid var(--m3-outline-v)' }}
          >
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid var(--m3-outline-v)', background: 'var(--m3-surf2)' }}>
              <TrendingUp size={14} style={{ color: 'var(--m3-primary)' }} />
              <span className="font-semibold text-sm" style={{ color: 'var(--m3-on-surf)' }}>4-Week Trend</span>
            </div>
            <div className="p-4">
              {(personal?.trend ?? []).length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--m3-on-surf-var)' }}>Insufficient data</p>
              ) : (
                <div className="space-y-4">
                  {personal!.trend.map((w, i) => {
                    const label = i === 0 ? 'Last week' : `${i + 1} wks ago`;
                    return (
                      <div key={w.weekStart} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium" style={{ color: 'var(--m3-on-surf)' }}>{label}</span>
                          <div className="flex gap-3">
                            <span className="text-[10px]" style={{ color: '#22c55e' }}>{w.workDone} done</span>
                            <span className="text-[10px]" style={{ color: 'var(--m3-primary)' }}>{fmtMins(w.timeMins)}</span>
                            {w.effortScore !== null && (
                              <span className="text-[10px]" style={{ color: effortColor(w.effortScore) }}>⚡{w.effortScore}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 h-3">
                          <motion.div
                            initial={{ flex: 0 }}
                            animate={{ flex: w.workDone }}
                            transition={{ delay: i * 0.1, ease: [0.2, 0, 0, 1] }}
                            className="rounded-l-full"
                            style={{ background: '#22c55e', minWidth: w.workDone > 0 ? '4px' : '0' }}
                          />
                          <motion.div
                            initial={{ flex: 0 }}
                            animate={{ flex: Math.max(0, 10 - w.workDone) }}
                            className="rounded-r-full"
                            style={{ background: 'var(--m3-surf4)' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.section>
        </div>

        {/* ── Invisible Effort History ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--m3-surf1)', border: '1px solid var(--m3-outline-v)' }}
        >
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid var(--m3-outline-v)', background: 'var(--m3-surf2)' }}>
            <Zap size={14} style={{ color: 'var(--m3-primary)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--m3-on-surf)' }}>Invisible Effort History</span>
            <span className="ml-auto text-[10px]" style={{ color: 'var(--m3-on-surf-var)' }}>
              Work not visible in task counts
            </span>
          </div>
          <div className="p-4">
            {effortHistory.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <Zap size={24} style={{ color: 'var(--m3-on-surf-var)', opacity: 0.3 }} />
                <p className="text-sm" style={{ color: 'var(--m3-on-surf-var)' }}>No effort records yet</p>
                <button onClick={handleComputeEffort} disabled={computing} className="text-xs px-3 py-1.5 rounded-xl font-medium" style={{ background: 'var(--m3-primary)', color: 'var(--m3-on-primary)' }}>
                  Compute now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {effortHistory.map((e, i) => {
                  const color = effortColor(e.score);
                  const dt = new Date(e.weekStart);
                  const label = i === 0 ? 'This week' : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="rounded-xl p-3"
                      style={{ background: `color-mix(in srgb, ${color} 8%, var(--m3-surf3))`, border: `1.5px solid color-mix(in srgb, ${color} 20%, transparent)` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium" style={{ color: 'var(--m3-on-surf-var)' }}>{label}</span>
                        <span className="text-xl font-bold" style={{ color }}>{e.score}</span>
                      </div>
                      <div className="space-y-0.5">
                        {[
                          [`📋 Follow-ups`, e.breakdown.followUpsClosed, '+5ea'],
                          [`⏱ Support mins`, e.breakdown.supportMins, '+1/30m'],
                          [`📅 Meetings`, e.breakdown.meetingCount, '+3ea'],
                          [`📚 KB articles`, e.breakdown.kbArticles, '+10ea'],
                        ].map(([lbl, val, pts]) => (
                          <div key={String(lbl)} className="flex items-center justify-between text-[9px]">
                            <span style={{ color: 'var(--m3-on-surf-var)' }}>{lbl}</span>
                            <span style={{ color: 'var(--m3-on-surf)' }}>{val} <span style={{ color: 'var(--m3-on-surf-var)', opacity: 0.5 }}>({pts})</span></span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.section>

        {/* ── Team report (manager+ only) ── */}
        {isManager && team && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--m3-surf1)', border: '1px solid var(--m3-outline-v)' }}
          >
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid var(--m3-outline-v)', background: 'var(--m3-surf2)' }}>
              <Users size={14} style={{ color: 'var(--m3-primary)' }} />
              <span className="font-semibold text-sm" style={{ color: 'var(--m3-on-surf)' }}>Team Weekly Report</span>
            </div>
            <div className="p-4 space-y-4">
              {/* Aggregate stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total done', value: team.aggregate.totalDone, color: '#22c55e' },
                  { label: 'Blocked', value: team.aggregate.totalBlocked, color: '#ef4444' },
                  { label: 'SLA compliance', value: `${Math.round(team.aggregate.slaCompliance)}%`, color: team.aggregate.slaCompliance >= 80 ? '#22c55e' : '#f59e0b' },
                  { label: 'Avg health', value: team.aggregate.avgHealth !== null ? `${team.aggregate.avgHealth}/100` : '—', color: team.aggregate.avgHealth !== null ? effortColor(team.aggregate.avgHealth) : undefined },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)' }}>
                    <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Per-member */}
              <div className="space-y-2">
                {team.byMember.map((m, i) => (
                  <motion.div
                    key={m.userId}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)' }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--m3-prim-c)', color: 'var(--m3-on-prim-c)' }}>
                      {m.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: 'var(--m3-on-surf)' }}>{m.name}</p>
                    </div>
                    <div className="flex gap-4 text-xs shrink-0">
                      <span style={{ color: '#22c55e' }}>{m.workDone} done</span>
                      {m.blocked > 0 && <span style={{ color: '#ef4444' }}>{m.blocked} blocked</span>}
                      <span style={{ color: 'var(--m3-on-surf-var)' }}>{fmtMins(m.timeMins)}</span>
                      {teamEffort.find(te => te.userId === m.userId) && (
                        <span style={{ color: effortColor(teamEffort.find(te => te.userId === m.userId)!.score) }}>
                          ⚡{teamEffort.find(te => te.userId === m.userId)!.score}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

      </div>
    </div>
  );
}
