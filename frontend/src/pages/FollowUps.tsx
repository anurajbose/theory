import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCheck, Plus, Clock, AlertCircle, CheckCircle2,
  Mail, MessageSquare, Phone, Users, Video,
  ChevronDown, Trash2, X, Filter
} from 'lucide-react';
import {
  getFollowUps, createFollowUp, updateFollowUp, closeFollowUp, deleteFollowUp,
  type FollowUp, type FollowUpStatus, type FollowUpChannel
} from '../services/followUpService';

/* ─── constants ─────────────────────────────────────────────────────────── */
const STATUS_META: Record<FollowUpStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'Pending',  color: 'var(--m3-primary)',   bg: 'var(--m3-prim-c)' },
  REMINDED: { label: 'Reminded', color: '#B45309',             bg: '#FEF3C7' },
  WAITING:  { label: 'Waiting',  color: 'var(--m3-on-surf-var)', bg: 'var(--m3-surf3)' },
  CLOSED:   { label: 'Closed',   color: '#16A34A',             bg: '#DCFCE7' },
};

const CHANNEL_META: Record<FollowUpChannel, { icon: React.ReactNode; label: string }> = {
  EMAIL:     { icon: <Mail size={13} />,         label: 'Email' },
  TEAMS:     { icon: <Video size={13} />,         label: 'Teams' },
  WHATSAPP:  { icon: <MessageSquare size={13} />, label: 'WhatsApp' },
  CALL:      { icon: <Phone size={13} />,         label: 'Call' },
};

const FILTER_TABS: Array<{ key: FollowUpStatus | 'ALL'; label: string }> = [
  { key: 'ALL',     label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'WAITING', label: 'Waiting' },
  { key: 'CLOSED',  label: 'Closed' },
];

/* ─── CreateDrawer ───────────────────────────────────────────────────────── */
interface CreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function CreateDrawer({ open, onClose, onSaved }: CreateDrawerProps) {
  const [form, setForm] = useState({
    person: '', topic: '', dueDate: '', channel: 'EMAIL' as FollowUpChannel, notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handle = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.person.trim() || !form.topic.trim()) return;
    setSaving(true);
    try {
      await createFollowUp({
        person: form.person.trim(),
        topic: form.topic.trim(),
        dueDate: form.dueDate || undefined,
        channel: form.channel,
        notes: form.notes.trim() || undefined,
      });
      setForm({ person: '', topic: '', dueDate: '', channel: 'EMAIL', notes: '' });
      onSaved();
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.32)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-md"
            style={{ background: 'var(--m3-surf0)', borderLeft: '1px solid var(--m3-outline-v)' }}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--m3-outline-v)' }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--m3-on-surf)' }}>New Follow-up</p>
                <p style={{ fontSize: 13, color: 'var(--m3-on-surf-var)', marginTop: 2 }}>Track who you need to follow up with</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full transition-colors hover:opacity-70" style={{ color: 'var(--m3-on-surf-var)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Person */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  Person *
                </label>
                <input
                  value={form.person} onChange={handle('person')} required placeholder="e.g. Priya Singh"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, border: '1.5px solid var(--m3-outline-v)', background: 'var(--m3-surf1)', color: 'var(--m3-on-surf)', outline: 'none' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                />
              </div>

              {/* Topic */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  Topic *
                </label>
                <input
                  value={form.topic} onChange={handle('topic')} required placeholder="What needs following up?"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, border: '1.5px solid var(--m3-outline-v)', background: 'var(--m3-surf1)', color: 'var(--m3-on-surf)', outline: 'none' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                />
              </div>

              {/* Due Date + Channel row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                    Due Date
                  </label>
                  <input
                    type="date" value={form.dueDate} onChange={handle('dueDate')}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, border: '1.5px solid var(--m3-outline-v)', background: 'var(--m3-surf1)', color: 'var(--m3-on-surf)', outline: 'none' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                    Channel
                  </label>
                  <select
                    value={form.channel} onChange={handle('channel')}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, border: '1.5px solid var(--m3-outline-v)', background: 'var(--m3-surf1)', color: 'var(--m3-on-surf)', outline: 'none' }}
                  >
                    {(Object.keys(CHANNEL_META) as FollowUpChannel[]).map(ch => (
                      <option key={ch} value={ch}>{CHANNEL_META[ch].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  Notes
                </label>
                <textarea
                  value={form.notes} onChange={handle('notes')} rows={3} placeholder="Any context or details..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, border: '1.5px solid var(--m3-outline-v)', background: 'var(--m3-surf1)', color: 'var(--m3-on-surf)', outline: 'none', resize: 'vertical' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                />
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid var(--m3-outline-v)' }}>
              <button
                type="button" onClick={onClose}
                style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 500, border: '1.5px solid var(--m3-outline-v)', color: 'var(--m3-on-surf)', background: 'transparent', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={submit} disabled={saving}
                style={{ flex: 2, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'var(--m3-primary)', color: 'var(--m3-on-primary)', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
              >{saving ? 'Saving…' : 'Create Follow-up'}</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── FollowUpCard ───────────────────────────────────────────────────────── */
interface FollowUpCardProps {
  fu: FollowUp;
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: FollowUpStatus) => void;
}

function FollowUpCard({ fu, onClose, onDelete, onStatusChange }: FollowUpCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = STATUS_META[fu.status];
  const ch = CHANNEL_META[fu.channel];

  const isOverdue = fu.overdue && fu.status !== 'CLOSED';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="relative group"
      style={{
        background: 'var(--m3-surf0)',
        border: isOverdue ? '1.5px solid #EF4444' : '1px solid var(--m3-outline-v)',
        borderRadius: 16,
        padding: '16px 18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Overdue banner */}
      {isOverdue && (
        <div className="flex items-center gap-1.5 mb-2" style={{ color: '#EF4444', fontSize: 12, fontWeight: 500 }}>
          <AlertCircle size={13} />
          Overdue by {fu.ageDays} days
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--m3-on-surf)', marginBottom: 3 }}>{fu.topic}</p>
          <div className="flex items-center gap-1.5 flex-wrap" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--m3-on-surf-var)', fontWeight: 500 }}>→ {fu.person}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
              background: meta.bg, color: meta.color,
            }}>{meta.label}</span>

            {/* Channel */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'var(--m3-on-surf-var)', padding: '3px 8px',
              borderRadius: 999, background: 'var(--m3-surf2)',
            }}>{ch.icon} {ch.label}</span>

            {/* Due date */}
            {fu.dueDate && (
              <span style={{ fontSize: 11, color: 'var(--m3-on-surf-var)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={11} />
                {new Date(fu.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}

            {/* Age */}
            {fu.status !== 'CLOSED' && (
              <span style={{ fontSize: 11, color: 'var(--m3-on-surf-var)' }}>{fu.ageDays}d old</span>
            )}
          </div>

          {fu.notes && (
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--m3-on-surf-var)', lineHeight: 1.5, paddingLeft: 8, borderLeft: '2px solid var(--m3-outline-v)' }}>
              {fu.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {fu.status !== 'CLOSED' && (
            <button
              onClick={() => onClose(fu.id)}
              title="Mark closed"
              style={{ padding: 7, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#16A34A' }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <CheckCircle2 size={17} />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(m => !m)}
              style={{ padding: 7, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--m3-on-surf-var)' }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronDown size={16} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -4 }}
                  className="absolute right-0 top-8 z-20 py-1"
                  style={{ background: 'var(--m3-surf1)', border: '1px solid var(--m3-outline-v)', borderRadius: 12, minWidth: 150, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  {(Object.keys(STATUS_META) as FollowUpStatus[]).filter(s => s !== fu.status && s !== 'CLOSED').map(s => (
                    <button key={s} onClick={() => { onStatusChange(fu.id, s); setMenuOpen(false); }}
                      style={{ display: 'flex', width: '100%', padding: '8px 14px', fontSize: 13, color: 'var(--m3-on-surf)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      className="hover:opacity-70"
                    >Mark {STATUS_META[s].label}</button>
                  ))}
                  <div style={{ height: 1, background: 'var(--m3-outline-v)', margin: '4px 0' }} />
                  <button onClick={() => { onDelete(fu.id); setMenuOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 14px', fontSize: 13, color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    className="hover:opacity-70"
                  ><Trash2 size={13} /> Delete</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [filter, setFilter] = useState<FollowUpStatus | 'ALL'>('ALL');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await getFollowUps();
      setFollowUps(data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleClose(id: string) {
    await closeFollowUp(id);
    load();
  }

  async function handleDelete(id: string) {
    await deleteFollowUp(id);
    setFollowUps(f => f.filter(x => x.id !== id));
  }

  async function handleStatusChange(id: string, status: FollowUpStatus) {
    await updateFollowUp(id, { status });
    load();
  }

  const filtered = filter === 'ALL' ? followUps : followUps.filter(f => f.status === filter);

  const overdueCnt = followUps.filter(f => f.overdue && f.status !== 'CLOSED').length;
  const openCnt    = followUps.filter(f => f.status !== 'CLOSED').length;
  const closedCnt  = followUps.filter(f => f.status === 'CLOSED').length;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="h-full flex flex-col"
      style={{ padding: 28 }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div style={{ padding: 10, borderRadius: 14, background: 'var(--m3-prim-c)' }}>
              <UserCheck size={20} style={{ color: 'var(--m3-primary)' }} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--m3-on-surf)' }}>Follow-ups</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--m3-on-surf-var)', marginLeft: 50 }}>
            {openCnt} open · {overdueCnt > 0 ? <span style={{ color: '#EF4444', fontWeight: 600 }}>{overdueCnt} overdue</span> : '0 overdue'} · {closedCnt} closed
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => setDrawerOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'var(--m3-primary)', color: 'var(--m3-on-primary)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          <Plus size={18} /> New Follow-up
        </motion.button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Open', value: openCnt, color: 'var(--m3-primary)' },
          { label: 'Overdue',    value: overdueCnt, color: '#EF4444' },
          { label: 'Closed',     value: closedCnt, color: '#16A34A' },
        ].map(s => (
          <motion.div key={s.label} whileHover={{ y: -2 }}
            style={{ padding: '16px 20px', borderRadius: 16, background: 'var(--m3-surf0)', border: '1px solid var(--m3-outline-v)' }}
          >
            <p style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 13, color: 'var(--m3-on-surf-var)', marginTop: 2 }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-5">
        <Filter size={15} style={{ color: 'var(--m3-on-surf-var)' }} />
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: filter === tab.key ? 'var(--m3-prim-c)' : 'var(--m3-surf1)',
              color: filter === tab.key ? 'var(--m3-primary)' : 'var(--m3-on-surf-var)',
              transition: 'all 0.15s ease',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div style={{ width: 32, height: 32, border: '3px solid var(--m3-outline-v)', borderTopColor: 'var(--m3-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div style={{ padding: 20, borderRadius: 999, background: 'var(--m3-surf1)' }}>
              <UserCheck size={32} style={{ color: 'var(--m3-on-surf-var)', opacity: 0.4 }} />
            </div>
            <div className="text-center">
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--m3-on-surf)', marginBottom: 4 }}>No follow-ups here</p>
              <p style={{ fontSize: 14, color: 'var(--m3-on-surf-var)' }}>
                {filter === 'ALL' ? 'Create your first follow-up to get started.' : `No ${filter.toLowerCase()} follow-ups.`}
              </p>
            </div>
          </div>
        ) : (
          <motion.div layout className="space-y-3 pb-6">
            <AnimatePresence mode="popLayout">
              {filtered.map(fu => (
                <FollowUpCard
                  key={fu.id} fu={fu}
                  onClose={handleClose}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <CreateDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSaved={load} />
    </motion.div>
  );
}
