import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb, Plus, Rocket, Archive, ThumbsUp, Sparkles,
  ChevronRight, Trash2, X, ExternalLink, MoreHorizontal
} from 'lucide-react';
import {
  getIdeas, createIdea, updateIdea, promoteIdea, deleteIdea,
  type Idea, type IdeaStatus, type IdeaPriority
} from '../services/ideaService';

/* ─── constants ────────────────────────────────────────────────────── */
const STATUS_COLUMNS: IdeaStatus[] = ['IDEA', 'PROPOSED', 'APPROVED', 'SHELVED'];

const STATUS_META: Record<IdeaStatus, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  IDEA:     { label: 'Ideas',    icon: <Lightbulb size={16} />, color: '#2563EB', bg: 'color-mix(in srgb, #2563EB 8%, var(--m3-surf0))',  border: '#2563EB30' },
  PROPOSED: { label: 'Proposed', icon: <ThumbsUp  size={16} />, color: '#7C3AED', bg: 'color-mix(in srgb, #7C3AED 8%, var(--m3-surf0))',  border: '#7C3AED30' },
  APPROVED: { label: 'Approved', icon: <ThumbsUp  size={16} />, color: '#059669', bg: 'color-mix(in srgb, #059669 8%, var(--m3-surf0))',  border: '#05966930' },
  SHELVED:  { label: 'Shelved',  icon: <Archive   size={16} />, color: '#6B7280', bg: 'color-mix(in srgb, #6B7280 8%, var(--m3-surf0))',  border: '#6B728030' },
};

const PRIORITY_META: Record<IdeaPriority, { label: string; color: string; bg: string }> = {
  HIGH:   { label: 'High',   color: '#DC2626', bg: '#FEE2E2' },
  MEDIUM: { label: 'Medium', color: '#D97706', bg: '#FEF3C7' },
  LOW:    { label: 'Low',    color: '#059669', bg: '#D1FAE5' },
  PARKED: { label: 'Parked', color: '#6B7280', bg: '#F3F4F6' },
};

/* ─── IdeaCard ─────────────────────────────────────────────────────── */
interface IdeaCardProps {
  idea: Idea;
  onDelete: (id: string) => void;
  onMove: (id: string, status: IdeaStatus) => void;
  onPromote: (id: string) => void;
}

function IdeaCard({ idea, onDelete, onMove, onPromote }: IdeaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const pmeta = PRIORITY_META[idea.priority];
  const smeta = STATUS_META[idea.status];

  async function handlePromote() {
    setPromoting(true);
    setMenuOpen(false);
    try {
      await onPromote(idea.id);
    } finally { setPromoting(false); }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative"
      style={{
        background: 'var(--m3-surf0)',
        border: '1px solid var(--m3-outline-v)',
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        cursor: 'default',
      }}
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    >
      {/* Priority + menu row */}
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: pmeta.bg, color: pmeta.color }}>
          {pmeta.label}
        </span>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(m => !m)}
            style={{ padding: 5, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--m3-on-surf-var)' }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal size={16} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93 }}
                className="absolute right-0 top-8 z-20 py-1"
                style={{ background: 'var(--m3-surf1)', border: '1px solid var(--m3-outline-v)', borderRadius: 12, minWidth: 160, boxShadow: '0 4px 20px rgba(0,0,0,0.14)' }}
                onMouseLeave={() => setMenuOpen(false)}
              >
                {/* Move options */}
                {STATUS_COLUMNS.filter(s => s !== idea.status).map(s => (
                  <button key={s} onClick={() => { onMove(idea.id, s); setMenuOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', fontSize: 13, color: 'var(--m3-on-surf)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    className="hover:opacity-70"
                  >
                    <span style={{ color: STATUS_META[s].color }}>{STATUS_META[s].icon}</span>
                    Move to {STATUS_META[s].label}
                  </button>
                ))}
                {/* Promote */}
                {idea.status === 'APPROVED' && !idea.linkedCrId && (
                  <>
                    <div style={{ height: 1, background: 'var(--m3-outline-v)', margin: '4px 0' }} />
                    <button onClick={handlePromote}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', fontSize: 13, color: '#059669', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      className="hover:opacity-70"
                    >
                      <Rocket size={13} /> Promote to Board
                    </button>
                  </>
                )}
                <div style={{ height: 1, background: 'var(--m3-outline-v)', margin: '4px 0' }} />
                <button onClick={() => { onDelete(idea.id); setMenuOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 14px', fontSize: 13, color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  className="hover:opacity-70"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Title */}
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--m3-on-surf)', lineHeight: 1.4, marginBottom: 6 }}>
        {idea.title}
      </p>

      {/* Problem */}
      {idea.problem && (
        <p style={{ fontSize: 12, color: 'var(--m3-on-surf-var)', lineHeight: 1.5, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {idea.problem}
        </p>
      )}

      {/* Value */}
      {idea.value && (
        <div style={{ padding: '6px 10px', borderRadius: 8, background: 'color-mix(in srgb, #059669 6%, var(--m3-surf0))', marginBottom: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Value</p>
          <p style={{ fontSize: 12, color: 'var(--m3-on-surf)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {idea.value}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        {/* Source */}
        {idea.source && (
          <span style={{ fontSize: 11, color: 'var(--m3-on-surf-var)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
            via {idea.source}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {/* Linked CR badge */}
          {idea.linkedCrId && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#D1FAE5', color: '#059669' }}>
              <ExternalLink size={10} /> On Board
            </span>
          )}
          {/* Promoting indicator */}
          {promoting && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#059669' }}>
              <Rocket size={12} /> Promoting…
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── KanbanColumn ─────────────────────────────────────────────────── */
interface ColumnProps {
  status: IdeaStatus;
  ideas: Idea[];
  onDelete: (id: string) => void;
  onMove: (id: string, status: IdeaStatus) => void;
  onPromote: (id: string) => void;
}
function KanbanColumn({ status, ideas, onDelete, onMove, onPromote }: ColumnProps) {
  const meta = STATUS_META[status];
  return (
    <div style={{
      flex: '1 1 0', minWidth: 260, maxWidth: 340,
      background: meta.bg,
      border: `1px solid ${meta.border}`,
      borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Column header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span style={{ color: meta.color }}>{meta.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{meta.label}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: meta.border, color: meta.color }}>
          {ideas.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AnimatePresence mode="popLayout">
          {ideas.map(idea => (
            <IdeaCard key={idea.id} idea={idea} onDelete={onDelete} onMove={onMove} onPromote={onPromote} />
          ))}
        </AnimatePresence>
        {ideas.length === 0 && (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--m3-on-surf-var)', opacity: 0.5 }}>Empty</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── CreateModal ──────────────────────────────────────────────────── */
interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}
function CreateModal({ open, onClose, onSaved }: CreateModalProps) {
  const [form, setForm] = useState({ title: '', problem: '', value: '', priority: 'MEDIUM' as IdeaPriority, source: '' });
  const [saving, setSaving] = useState(false);

  const handle = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createIdea({
        title: form.title.trim(),
        problem: form.problem.trim() || undefined,
        value: form.value.trim() || undefined,
        priority: form.priority,
        source: form.source.trim() || undefined,
      });
      setForm({ title: '', problem: '', value: '', priority: 'MEDIUM', source: '' });
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
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              style={{ background: 'var(--m3-surf0)', borderRadius: 22, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}
              initial={{ scale: 0.94, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 24 }}
              transition={{ type: 'spring', stiffness: 400, damping: 36 }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div style={{ padding: 8, borderRadius: 10, background: 'var(--m3-prim-c)' }}>
                    <Lightbulb size={18} style={{ color: 'var(--m3-primary)' }} />
                  </div>
                  <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--m3-on-surf)' }}>Capture Idea</p>
                </div>
                <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--m3-on-surf-var)' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                {/* Title */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Idea *</label>
                  <input value={form.title} onChange={handle('title')} required placeholder="One-line summary of the idea"
                    style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                  />
                </div>

                {/* Priority + Source row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Priority</label>
                    <select value={form.priority} onChange={handle('priority')} style={inputStyle}>
                      {(Object.keys(PRIORITY_META) as IdeaPriority[]).map(p => (
                        <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Source</label>
                    <input value={form.source} onChange={handle('source')} placeholder="e.g. Customer call"
                      style={inputStyle}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                    />
                  </div>
                </div>

                {/* Problem */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Problem Statement</label>
                  <textarea value={form.problem} onChange={handle('problem')} rows={3} placeholder="What problem does this solve?"
                    style={{ ...inputStyle, resize: 'vertical' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                  />
                </div>

                {/* Value */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surf-var)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Business Value</label>
                  <textarea value={form.value} onChange={handle('value')} rows={2} placeholder="Why does this matter? Impact?"
                    style={{ ...inputStyle, resize: 'vertical' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--m3-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--m3-outline-v)'}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={onClose}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 500, border: '1.5px solid var(--m3-outline-v)', color: 'var(--m3-on-surf)', background: 'transparent', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    style={{ flex: 2, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'var(--m3-primary)', color: 'var(--m3-on-primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.6 : 1 }}>
                    <Sparkles size={15} /> Save Idea
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

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getIdeas();
      setIdeas(data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleMove(id: string, status: IdeaStatus) {
    const updated = await updateIdea(id, { status });
    setIdeas(i => i.map(x => x.id === id ? updated : x));
  }

  async function handleDelete(id: string) {
    await deleteIdea(id);
    setIdeas(i => i.filter(x => x.id !== id));
  }

  async function handlePromote(id: string) {
    const { idea } = await promoteIdea(id);
    setIdeas(i => i.map(x => x.id === id ? idea : x));
  }

  const byStatus = STATUS_COLUMNS.reduce((acc, s) => {
    acc[s] = ideas.filter(i => i.status === s);
    return acc;
  }, {} as Record<IdeaStatus, Idea[]>);

  const approvedCount = byStatus['APPROVED']?.length ?? 0;
  const promotedCount = ideas.filter(i => i.linkedCrId).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col" style={{ padding: 28 }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div style={{ padding: 10, borderRadius: 14, background: 'var(--m3-prim-c)' }}>
              <Lightbulb size={20} style={{ color: 'var(--m3-primary)' }} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--m3-on-surf)' }}>Idea Bank</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--m3-on-surf-var)', marginLeft: 50 }}>
            {ideas.length} ideas · {approvedCount} approved · {promotedCount} promoted to board
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => setModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'var(--m3-primary)', color: 'var(--m3-on-primary)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          <Plus size={18} /> Capture Idea
        </motion.button>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div style={{ width: 32, height: 32, border: '3px solid var(--m3-outline-v)', borderTopColor: 'var(--m3-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div className="flex gap-4 flex-1 overflow-x-auto overflow-y-hidden pb-2">
          {STATUS_COLUMNS.map(s => (
            <KanbanColumn
              key={s} status={s}
              ideas={byStatus[s] ?? []}
              onDelete={handleDelete}
              onMove={handleMove}
              onPromote={handlePromote}
            />
          ))}
        </div>
      )}

      <CreateModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} />
    </motion.div>
  );
}
