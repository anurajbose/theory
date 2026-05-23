import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Plus, Clock, Users, ChevronDown, ChevronRight,
  CheckSquare, Square, Trash2, X, Check, FileText
} from 'lucide-react';
import {
  getMeetings, getMeetingStats, createMeeting, updateMeeting, deleteMeeting,
  type Meeting, type ActionItem
} from '../services/meetingService';

/* ─── helpers ──────────────────────────────────────────────────────── */
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}
function isPast(iso: string) {
  return new Date(iso) < new Date();
}

/* ─── ActionItemRow ────────────────────────────────────────────────── */
function ActionItemRow({
  item, onChange
}: { item: ActionItem; onChange: (updated: ActionItem) => void }) {
  const done = item.status === 'DONE';
  return (
    <div className="flex items-start gap-2 py-1.5">
      <button
        onClick={() => onChange({ ...item, status: done ? 'OPEN' : 'DONE' })}
        style={{ flexShrink: 0, marginTop: 1, color: done ? '#16A34A' : 'var(--m3-on-surf-var)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}
      >
        {done ? <CheckSquare size={16} /> : <Square size={16} />}
      </button>
      <span style={{ fontSize: 13, color: done ? 'var(--m3-on-surf-var)' : 'var(--m3-on-surf)', textDecoration: done ? 'line-through' : 'none', flex: 1 }}>
        {item.desc}
      </span>
      {item.due_date && (
        <span style={{ fontSize: 11, color: 'var(--m3-on-surf-var)', flexShrink: 0 }}>
          {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  );
}

/* ─── MeetingCard ──────────────────────────────────────────────────── */
interface MeetingCardProps {
  meeting: Meeting;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Meeting>) => void;
}
function MeetingCard({ meeting, onDelete, onUpdate }: MeetingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDecisions, setEditDecisions] = useState(meeting.decisions ?? '');
  const [actionItems, setActionItems] = useState<ActionItem[]>(meeting.actionItems);

  const today = isToday(meeting.date);
  const past = isPast(meeting.date);
  const openActions = actionItems.filter(a => a.status === 'OPEN').length;

  async function saveDecisions() {
    await onUpdate(meeting.id, { decisions: editDecisions });
    setEditing(false);
  }

  async function handleActionChange(idx: number, updated: ActionItem) {
    const next = actionItems.map((a, i) => i === idx ? updated : a);
    setActionItems(next);
    await onUpdate(meeting.id, { actionItems: next });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      style={{
        background: 'var(--m3-surf0)',
        border: today ? '1.5px solid var(--m3-primary)' : '1px solid var(--m3-outline-v)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer group"
        onClick={() => setExpanded(e => !e)}
        style={{ userSelect: 'none' }}
      >
        {/* Date blob */}
        <div style={{
          flexShrink: 0, width: 44, textAlign: 'center', padding: '6px 4px', borderRadius: 10,
          background: today ? 'var(--m3-prim-c)' : 'var(--m3-surf1)',
        }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: today ? 'var(--m3-primary)' : 'var(--m3-on-surf)', lineHeight: 1 }}>
            {new Date(meeting.date).getDate()}
          </p>
          <p style={{ fontSize: 10, fontWeight: 600, color: today ? 'var(--m3-primary)' : 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short' })}
          </p>
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {today && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--m3-prim-c)', color: 'var(--m3-primary)' }}>Today</span>}
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--m3-on-surf)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meeting.title}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--m3-on-surf-var)' }}>
              <Clock size={12} /> {fmtTime(meeting.date)}
            </span>
            {meeting.attendees.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--m3-on-surf-var)' }}>
                <Users size={12} /> {meeting.attendees.length} attendees
              </span>
            )}
            {actionItems.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: openActions > 0 ? '#D97706' : '#16A34A' }}>
                <CheckSquare size={12} /> {openActions}/{actionItems.length} open
              </span>
            )}
          </div>
        </div>

        {/* Expand + delete */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onDelete(meeting.id); }}
            style={{ padding: 7, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444' }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={15} />
          </button>
          <motion.div animate={{ rotate: expanded ? 90 : 0 }}>
            <ChevronRight size={18} style={{ color: 'var(--m3-on-surf-var)' }} />
          </motion.div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--m3-outline-v)' }}>
              <div className="pt-4 grid gap-4" style={{ gridTemplateColumns: meeting.agenda ? '1fr 1fr' : '1fr' }}>

                {/* Agenda */}
                {meeting.agenda && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Agenda</p>
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--m3-surf1)', fontSize: 13, color: 'var(--m3-on-surf)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {meeting.agenda}
                    </div>
                  </div>
                )}

                {/* Decisions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Decisions</p>
                    {!editing && (
                      <button onClick={() => setEditing(true)}
                        style={{ fontSize: 11, color: 'var(--m3-primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                        Edit
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <div>
                      <textarea
                        value={editDecisions} onChange={e => setEditDecisions(e.target.value)}
                        rows={4} placeholder="Key decisions made..."
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, border: '1.5px solid var(--m3-primary)', background: 'var(--m3-surf1)', color: 'var(--m3-on-surf)', outline: 'none', resize: 'vertical' }}
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={saveDecisions}
                          style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--m3-primary)', color: 'var(--m3-on-primary)', border: 'none', cursor: 'pointer' }}>
                          Save
                        </button>
                        <button onClick={() => { setEditing(false); setEditDecisions(meeting.decisions ?? ''); }}
                          style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: '1.5px solid var(--m3-outline-v)', color: 'var(--m3-on-surf)', background: 'transparent', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--m3-surf1)', fontSize: 13, color: editDecisions ? 'var(--m3-on-surf)' : 'var(--m3-on-surf-var)', whiteSpace: 'pre-wrap', lineHeight: 1.6, minHeight: 44 }}>
                      {editDecisions || <span style={{ opacity: 0.5 }}>No decisions recorded</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Attendees */}
              {meeting.attendees.length > 0 && (
                <div className="mt-4">
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Attendees</p>
                  <div className="flex flex-wrap gap-2">
                    {meeting.attendees.map((a, i) => (
                      <span key={i} style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--m3-surf2)', fontSize: 12, color: 'var(--m3-on-surf)', fontWeight: 500 }}>{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action items */}
              {actionItems.length > 0 && (
                <div className="mt-4">
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Action Items</p>
                  <div style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--m3-surf1)' }}>
                    {actionItems.map((item, idx) => (
                      <ActionItemRow key={idx} item={item} onChange={updated => handleActionChange(idx, updated)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── CreateModal ──────────────────────────────────────────────────── */
interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}
function CreateModal({ open, onClose, onSaved }: CreateModalProps) {
  const [form, setForm] = useState({ title: '', date: '', attendeesRaw: '', agenda: '', decisions: '' });
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newAction, setNewAction] = useState('');
  const [saving, setSaving] = useState(false);

  const handle = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  function addAction() {
    if (!newAction.trim()) return;
    setActionItems(a => [...a, { desc: newAction.trim(), status: 'OPEN' }]);
    setNewAction('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      const attendees = form.attendeesRaw.split(',').map(s => s.trim()).filter(Boolean);
      await createMeeting({
        title: form.title.trim(),
        date: new Date(form.date).toISOString(),
        attendees,
        agenda: form.agenda.trim() || undefined,
        decisions: form.decisions.trim() || undefined,
        actionItems,
      });
      setForm({ title: '', date: '', attendeesRaw: '', agenda: '', decisions: '' });
      setActionItems([]);
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-lg"
            style={{ background: 'var(--m3-surf0)', borderLeft: '1px solid var(--m3-outline-v)' }}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--m3-outline-v)' }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--m3-on-surf)' }}>Log Meeting</p>
                <p style={{ fontSize: 13, color: 'var(--m3-on-surf-var)', marginTop: 2 }}>Capture context, decisions and next steps</p>
              </div>
              <button onClick={onClose} style={{ padding: 8, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--m3-on-surf-var)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Scrollable form */}
            <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Title *</label>
                <input value={form.title} onChange={handle('title')} required placeholder="e.g. Sprint Planning"
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                />
              </div>

              {/* Date */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Date & Time *</label>
                <input type="datetime-local" value={form.date} onChange={handle('date')} required
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                />
              </div>

              {/* Attendees */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Attendees (comma-separated)</label>
                <input value={form.attendeesRaw} onChange={handle('attendeesRaw')} placeholder="Priya, Rohan, Meera"
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                />
              </div>

              {/* Agenda */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Agenda</label>
                <textarea value={form.agenda} onChange={handle('agenda')} rows={3} placeholder="Topics to cover..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                />
              </div>

              {/* Decisions */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Decisions</label>
                <textarea value={form.decisions} onChange={handle('decisions')} rows={3} placeholder="Key decisions made..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                />
              </div>

              {/* Action items */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Action Items</label>
                <div className="space-y-2 mb-2">
                  {actionItems.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check size={13} style={{ color: '#16A34A', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--m3-on-surf)' }}>{a.desc}</span>
                      <button type="button" onClick={() => setActionItems(items => items.filter((_, j) => j !== i))}
                        style={{ padding: 4, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444' }}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newAction} onChange={e => setNewAction(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAction())}
                    placeholder="Add action item…"
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                  />
                  <button type="button" onClick={addAction}
                    style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--m3-surf2)', border: 'none', cursor: 'pointer', color: 'var(--m3-on-surf)', fontWeight: 600, fontSize: 13 }}>
                    Add
                  </button>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid var(--m3-outline-v)' }}>
              <button type="button" onClick={onClose}
                style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 500, border: '1.5px solid var(--m3-outline-v)', color: 'var(--m3-on-surf)', background: 'transparent', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={submit} disabled={saving}
                style={{ flex: 2, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'var(--m3-primary)', color: 'var(--m3-on-primary)', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save Meeting'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState({ count: 0, weeklyHoursEstimate: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'week' | 'month'>('month');

  async function load() {
    setLoading(true);
    try {
      const [data, s] = await Promise.all([getMeetings(range), getMeetingStats()]);
      setMeetings(data);
      setStats(s);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [range]);

  async function handleDelete(id: string) {
    await deleteMeeting(id);
    setMeetings(m => m.filter(x => x.id !== id));
  }

  async function handleUpdate(id: string, data: Partial<Meeting>) {
    const updated = await updateMeeting(id, data);
    setMeetings(m => m.map(x => x.id === id ? updated : x));
  }

  const totalActions = meetings.reduce((sum, m) => sum + m.actionItems.filter(a => a.status === 'OPEN').length, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col" style={{ padding: 28 }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div style={{ padding: 10, borderRadius: 14, background: 'var(--m3-prim-c)' }}>
              <CalendarDays size={20} style={{ color: 'var(--m3-primary)' }} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--m3-on-surf)' }}>Meetings</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--m3-on-surf-var)', marginLeft: 50 }}>
            {meetings.length} meetings · ~{stats.weeklyHoursEstimate}h/week · {totalActions} open actions
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => setDrawerOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'var(--m3-primary)', color: 'var(--m3-on-primary)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          <Plus size={18} /> Log Meeting
        </motion.button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'This Period',   value: meetings.length, suffix: 'meetings' },
          { label: 'Weekly Hours',  value: stats.weeklyHoursEstimate.toFixed(1), suffix: 'hrs est.' },
          { label: 'Open Actions',  value: totalActions, suffix: 'items' },
        ].map(s => (
          <motion.div key={s.label} whileHover={{ y: -2 }}
            style={{ padding: '16px 20px', borderRadius: 16, background: 'var(--m3-surf0)', border: '1px solid var(--m3-outline-v)' }}
          >
            <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--m3-on-surf)' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: 'var(--m3-on-surf-var)', marginTop: 2 }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Range toggle */}
      <div className="flex items-center gap-2 mb-5">
        {(['week', 'month'] as const).map(r => (
          <button key={r} onClick={() => setRange(r)}
            style={{
              padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: range === r ? 'var(--m3-prim-c)' : 'var(--m3-surf1)',
              color: range === r ? 'var(--m3-primary)' : 'var(--m3-on-surf-var)',
            }}
          >{r === 'week' ? 'This Week' : 'This Month'}</button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div style={{ width: 32, height: 32, border: '3px solid var(--m3-outline-v)', borderTopColor: 'var(--m3-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div style={{ padding: 20, borderRadius: 999, background: 'var(--m3-surf1)' }}>
              <CalendarDays size={32} style={{ color: 'var(--m3-on-surf-var)', opacity: 0.4 }} />
            </div>
            <div className="text-center">
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--m3-on-surf)', marginBottom: 4 }}>No meetings logged</p>
              <p style={{ fontSize: 14, color: 'var(--m3-on-surf-var)' }}>Log your first meeting to start capturing decisions.</p>
            </div>
          </div>
        ) : (
          <motion.div layout className="space-y-3 pb-6">
            <AnimatePresence mode="popLayout">
              {meetings.map(m => (
                <MeetingCard key={m.id} meeting={m} onDelete={handleDelete} onUpdate={handleUpdate} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <CreateModal open={drawerOpen} onClose={() => setDrawerOpen(false)} onSaved={load} />
    </motion.div>
  );
}
