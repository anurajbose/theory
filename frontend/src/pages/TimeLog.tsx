import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer, Play, Square, Plus, Clock, BarChart2,
  Briefcase, FileText, Users, FolderOpen, MessageSquare,
  Lightbulb, Settings, HelpCircle, Search, Zap, FlaskConical,
  Trash2, X, ChevronDown
} from 'lucide-react';
import {
  getTimeLogs, getRunningTimer, createTimeLog, stopTimer, deleteTimeLog,
  type TimeLog, type TimeCategory
} from '../services/timeLogService';

/* ─── constants ────────────────────────────────────────────────────────── */
const CATEGORY_META: Record<TimeCategory, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  CR_WORK:    { label: 'CR Work',    color: '#2563EB', bg: '#DBEAFE', icon: <Briefcase size={13}/> },
  TICKET:     { label: 'Ticket',     color: '#7C3AED', bg: '#EDE9FE', icon: <FolderOpen size={13}/> },
  MEETING:    { label: 'Meeting',    color: '#0891B2', bg: '#CFFAFE', icon: <Users size={13}/> },
  DOCS:       { label: 'Docs',       color: '#059669', bg: '#D1FAE5', icon: <FileText size={13}/> },
  FOLLOW_UP:  { label: 'Follow-up',  color: '#D97706', bg: '#FEF3C7', icon: <MessageSquare size={13}/> },
  STRATEGIC:  { label: 'Strategic',  color: '#DC2626', bg: '#FEE2E2', icon: <Lightbulb size={13}/> },
  ADMIN:      { label: 'Admin',      color: '#6B7280', bg: '#F3F4F6', icon: <Settings size={13}/> },
  SUPPORT:    { label: 'Support',    color: '#9333EA', bg: '#F3E8FF', icon: <HelpCircle size={13}/> },
  ANALYSIS:   { label: 'Analysis',   color: '#0D9488', bg: '#CCFBF1', icon: <Search size={13}/> },
  TESTING:    { label: 'Testing',    color: '#B45309', bg: '#FEF3C7', icon: <FlaskConical size={13}/> },
  DEPLOY:     { label: 'Deploy',     color: '#0F766E', bg: '#CCFBF1', icon: <Zap size={13}/> },
  OTHER:      { label: 'Other',      color: '#6B7280', bg: '#F3F4F6', icon: <Settings size={13}/> },
};

function fmtDuration(mins: number | null | undefined): string {
  if (!mins) return '—';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? (mins % 60) + 'm' : ''}`.trim();
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/* ─── Live Clock ──────────────────────────────────────────────────────── */
function LiveClock({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {h > 0 && `${h}:`}{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

/* ─── RunningTimerBanner ─────────────────────────────────────────────── */
interface RunningTimerBannerProps {
  log: TimeLog;
  onStop: () => void;
}
function RunningTimerBanner({ log, onStop }: RunningTimerBannerProps) {
  const meta = CATEGORY_META[log.category];
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderRadius: 14, marginBottom: 20,
        background: 'var(--m3-prim-c)', border: '1px solid var(--m3-primary)',
      }}
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
          style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--m3-primary)' }}
        />
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--m3-on-prim-c)' }}>{log.task}</p>
          <p style={{ fontSize: 12, color: 'var(--m3-on-surf-var)', marginTop: 1 }}>
            {meta.label} · started {fmtTime(log.startTime)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--m3-primary)', letterSpacing: '-0.5px' }}>
          <LiveClock startTime={log.startTime} />
        </span>
        <button
          onClick={onStop}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10, background: 'var(--m3-primary)', color: 'var(--m3-on-primary)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          <Square size={14} fill="currentColor" /> Stop
        </button>
      </div>
    </motion.div>
  );
}

/* ─── QuickLog Modal ─────────────────────────────────────────────────── */
interface QuickLogModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  mode: 'timer' | 'manual';
}
function QuickLogModal({ open, onClose, onSaved, mode }: QuickLogModalProps) {
  const [form, setForm] = useState({ task: '', category: 'CR_WORK' as TimeCategory, duration: '' });
  const [saving, setSaving] = useState(false);

  const handle = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.task.trim()) return;
    setSaving(true);
    try {
      await createTimeLog({
        task: form.task.trim(),
        category: form.category,
        durationMins: mode === 'manual' && form.duration ? parseInt(form.duration) : undefined,
        startTime: mode === 'timer' ? new Date().toISOString() : undefined,
      });
      setForm({ task: '', category: 'CR_WORK', duration: '' });
      onSaved();
      onClose();
    } finally { setSaving(false); }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
    border: '1.5px solid var(--m3-outline-v)', background: 'var(--m3-surf1)',
    color: 'var(--m3-on-surf)', outline: 'none',
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.32)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              style={{ background: 'var(--m3-surf0)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
              initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 36 }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  {mode === 'timer' ? <Play size={18} style={{ color: 'var(--m3-primary)' }} /> : <Clock size={18} style={{ color: 'var(--m3-primary)' }} />}
                  <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--m3-on-surf)' }}>
                    {mode === 'timer' ? 'Start Timer' : 'Log Time'}
                  </p>
                </div>
                <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--m3-on-surf-var)' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Task *</label>
                  <input value={form.task} onChange={handle('task')} required placeholder="What are you working on?"
                    style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Category</label>
                  <select value={form.category} onChange={handle('category')} style={inputStyle}>
                    {(Object.keys(CATEGORY_META) as TimeCategory[]).map(c => (
                      <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                    ))}
                  </select>
                </div>

                {mode === 'manual' && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Duration (minutes)</label>
                    <input type="number" min={1} max={960} value={form.duration} onChange={handle('duration')} placeholder="e.g. 90"
                      style={inputStyle}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={onClose}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 500, border: '1.5px solid var(--m3-outline-v)', color: 'var(--m3-on-surf)', background: 'transparent', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    style={{ flex: 2, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'var(--m3-primary)', color: 'var(--m3-on-primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.6 : 1 }}>
                    {mode === 'timer' ? <><Play size={15} /> Start Timer</> : <><Clock size={15} /> Log Entry</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── LogEntry ──────────────────────────────────────────────────────── */
function LogEntry({ log, onDelete }: { log: TimeLog; onDelete: (id: string) => void }) {
  const meta = CATEGORY_META[log.category];
  return (
    <motion.div
      layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
      className="group flex items-center gap-3 py-3 px-4"
      style={{ borderBottom: '1px solid var(--m3-outline-v)', borderRadius: 0 }}
    >
      {/* Category dot */}
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />

      {/* Task */}
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--m3-on-surf)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.task}</p>
        {log.workItem && (
          <p style={{ fontSize: 12, color: 'var(--m3-on-surf-var)', marginTop: 1 }}>↳ {log.workItem.title}</p>
        )}
      </div>

      {/* Category badge */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: meta.bg, color: meta.color, flexShrink: 0 }}>
        {meta.icon} {meta.label}
      </span>

      {/* Time range */}
      <span style={{ fontSize: 12, color: 'var(--m3-on-surf-var)', flexShrink: 0, minWidth: 100, textAlign: 'right' }}>
        {fmtTime(log.startTime)}{log.endTime ? ` – ${fmtTime(log.endTime)}` : ' …'}
      </span>

      {/* Duration */}
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m3-on-surf)', flexShrink: 0, minWidth: 48, textAlign: 'right' }}>
        {fmtDuration(log.durationMins)}
      </span>

      {/* Delete */}
      <button onClick={() => onDelete(log.id)}
        style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', flexShrink: 0 }}
        className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function TimeLogPage() {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [running, setRunning] = useState<TimeLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'timer' | 'manual' | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [data, run] = await Promise.all([getTimeLogs({ week: true }), getRunningTimer()]);
      setLogs(data.logs);
      setSummary(data.summary);
      setRunning(run);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleStop() {
    if (!running) return;
    await stopTimer(running.id);
    load();
  }

  async function handleDelete(id: string) {
    await deleteTimeLog(id);
    setLogs(l => l.filter(x => x.id !== id));
  }

  // Group logs by date
  const grouped: Record<string, TimeLog[]> = {};
  for (const log of logs) {
    const key = fmtDate(log.date || log.startTime);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(log);
  }

  // Total this week
  const totalMins = Object.values(summary).reduce((a, b) => a + b, 0);
  const totalHours = (totalMins / 60).toFixed(1);

  // Top categories
  const topCategories = Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col" style={{ padding: 28 }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div style={{ padding: 10, borderRadius: 14, background: 'var(--m3-prim-c)' }}>
              <Timer size={20} style={{ color: 'var(--m3-primary)' }} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--m3-on-surf)' }}>Time Log</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--m3-on-surf-var)', marginLeft: 50 }}>
            {totalHours}h logged this week
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setModal('manual')}
            disabled={!!running}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12, background: 'var(--m3-surf1)', color: 'var(--m3-on-surf)', border: '1.5px solid var(--m3-outline-v)', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, opacity: running ? 0.5 : 1 }}
          >
            <Plus size={17} /> Log Entry
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setModal('timer')}
            disabled={!!running}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12, background: 'var(--m3-primary)', color: 'var(--m3-on-primary)', border: 'none', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, opacity: running ? 0.5 : 1 }}
          >
            <Play size={17} fill="currentColor" /> Start Timer
          </motion.button>
        </div>
      </div>

      {/* Running timer banner */}
      <AnimatePresence>
        {running && <RunningTimerBanner log={running} onStop={handleStop} />}
      </AnimatePresence>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Main log area */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div style={{ background: 'var(--m3-surf0)', borderRadius: 16, border: '1px solid var(--m3-outline-v)', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div style={{ width: 32, height: 32, border: '3px solid var(--m3-outline-v)', borderTopColor: 'var(--m3-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div style={{ padding: 20, borderRadius: 999, background: 'var(--m3-surf1)' }}>
                  <Timer size={32} style={{ color: 'var(--m3-on-surf-var)', opacity: 0.4 }} />
                </div>
                <div className="text-center">
                  <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--m3-on-surf)', marginBottom: 4 }}>No time logged yet</p>
                  <p style={{ fontSize: 14, color: 'var(--m3-on-surf-var)' }}>Start a timer or log an entry to begin tracking.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1">
                <AnimatePresence>
                  {Object.entries(grouped).map(([date, dayLogs]) => {
                    const dayMins = dayLogs.reduce((a, l) => a + (l.durationMins || 0), 0);
                    return (
                      <div key={date}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 6px', position: 'sticky', top: 0, background: 'var(--m3-surf0)', zIndex: 1, borderBottom: '1px solid var(--m3-outline-v)' }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{date}</p>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--m3-primary)' }}>{fmtDuration(dayMins)}</p>
                        </div>
                        <AnimatePresence>
                          {dayLogs.map(log => (
                            <LogEntry key={log.id} log={log} onDelete={handleDelete} />
                          ))}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — weekly summary */}
        <div className="w-64 shrink-0 space-y-4">
          {/* Total */}
          <div style={{ padding: '20px', borderRadius: 16, background: 'var(--m3-prim-c)', border: '1px solid var(--m3-primary)' }}>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 size={16} style={{ color: 'var(--m3-primary)' }} />
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>This Week</p>
            </div>
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--m3-primary)', letterSpacing: '-1px' }}>{totalHours}h</p>
            <p style={{ fontSize: 12, color: 'var(--m3-on-surf-var)', marginTop: 2 }}>{logs.length} entries</p>
          </div>

          {/* By Category */}
          <div style={{ padding: '18px', borderRadius: 16, background: 'var(--m3-surf0)', border: '1px solid var(--m3-outline-v)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>By Category</p>
            <div className="space-y-2">
              {topCategories.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--m3-on-surf-var)' }}>No data</p>
              ) : topCategories.map(([cat, mins]) => {
                const meta = CATEGORY_META[cat as TimeCategory];
                const pct = totalMins > 0 ? Math.round((mins / totalMins) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf)' }}>{meta?.label ?? cat}</span>
                      <span style={{ fontSize: 12, color: 'var(--m3-on-surf-var)' }}>{fmtDuration(mins)}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 999, background: 'var(--m3-surf2)', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 999, background: meta?.color ?? 'var(--m3-primary)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <QuickLogModal open={!!modal} onClose={() => setModal(null)} onSaved={load} mode={modal ?? 'manual'} />
    </motion.div>
  );
}
