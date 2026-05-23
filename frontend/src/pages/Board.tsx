import {
  useCallback, useEffect, useMemo, useRef, useState, type DragEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isPast } from 'date-fns';
import {
  Plus, KanbanSquare, MoreHorizontal, Trash2, Clock, X,
  LayoutGrid, List as ListIcon, Loader2,
} from 'lucide-react';
import {
  PageHeader, Section, EmptyState, Skeleton, Button, SeverityBadge,
  type Severity,
} from '../components/ui';
import {
  WorkItem, WorkItemStatus, Priority,
  getWorkItems, createWorkItem, updateWorkItem, moveWorkItem, deleteWorkItem,
} from '../services/workItemService';
import { useAuthStore } from '../store/authStore';
import { ROLE_CONFIG, JobRoleKey } from '../utils/roleConfig';

/* ═══════════════════════════════════════════════════════════════
   BOARD · premium kanban
   Five columns (TODO → IN_PROGRESS → BLOCKED → IN_REVIEW → DONE),
   native HTML5 drag-and-drop, layered cards with severity-tinted
   priority rails. Optimistic moves via the existing /work-items
   /:id/move endpoint. Primitive-driven layout.
   ═══════════════════════════════════════════════════════════════ */

const COLUMNS: WorkItemStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE'];

const COL_META: Record<WorkItemStatus, { label: string; accent: string }> = {
  TODO:        { label: 'To do',       accent: 'var(--m3-on-surf-var)' },
  IN_PROGRESS: { label: 'In progress', accent: 'var(--m3-secondary)' },
  BLOCKED:     { label: 'Blocked',     accent: 'var(--m3-error)' },
  IN_REVIEW:   { label: 'In review',   accent: 'var(--m3-primary)' },
  DONE:        { label: 'Done',        accent: 'var(--m3-success)' },
  CANCELLED:   { label: 'Cancelled',   accent: 'var(--m3-on-surf-var)' },
};

const PRIO_META: Record<Priority, { label: string; severity: Severity; rail: string }> = {
  P1:  { label: 'P1',  severity: 'critical', rail: 'var(--m3-error)' },
  P2:  { label: 'P2',  severity: 'high',     rail: 'var(--m3-warning)' },
  P3:  { label: 'P3',  severity: 'medium',   rail: 'var(--m3-primary)' },
  LOW: { label: 'Low', severity: 'low',      rail: 'var(--m3-secondary)' },
};

const PRIO_ORDER: Priority[] = ['P1', 'P2', 'P3', 'LOW'];

export default function BoardPage() {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [activeSection, setSection] = useState<string>('');
  const [quickAdd, setQuickAdd] = useState<WorkItemStatus | null>(null);
  const [dragOver, setDragOver] = useState<WorkItemStatus | null>(null);

  /* ── Section list (from role config + actual items) ── */
  const defaultSections: string[] = user?.jobRole
    ? (ROLE_CONFIG[user.jobRole as JobRoleKey]?.sections ?? [])
    : [];
  const sections = useMemo(
    () => Array.from(new Set([...defaultSections, ...items.map((i) => i.sectionType)])),
    [defaultSections, items],
  );

  useEffect(() => {
    setLoading(true);
    getWorkItems()
      .then((data) => {
        setItems(data);
        if (!activeSection) {
          if (data.length) setSection(data[0].sectionType);
          else if (defaultSections.length) setSection(defaultSections[0]);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdate = useCallback(async (id: string, data: Partial<WorkItem>) => {
    try {
      const updated = await updateWorkItem(id, data);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch { /* api interceptor handles toast */ }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try { await deleteWorkItem(id); } catch { /* silent — already removed locally */ }
  }, []);

  const handleAdd = useCallback(
    async (section: string, status: WorkItemStatus, title: string, priority: Priority) => {
      const item = await createWorkItem({ title, sectionType: section, priority, status });
      setItems((prev) => [...prev, item]);
    },
    [],
  );

  /* ── Optimistic column move ── */
  const handleMove = useCallback(async (id: string, status: WorkItemStatus) => {
    const before = items;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    try { await moveWorkItem(id, { status }); }
    catch { setItems(before); }
  }, [items]);

  /* ── Scoped data ── */
  const sectionItems = items.filter((i) => i.sectionType === activeSection);
  const byCol = useMemo(() => {
    const m: Record<WorkItemStatus, WorkItem[]> = {
      TODO: [], IN_PROGRESS: [], BLOCKED: [], IN_REVIEW: [], DONE: [], CANCELLED: [],
    };
    for (const item of sectionItems) m[item.status]?.push(item);
    return m;
  }, [sectionItems]);

  const stats = {
    total:   sectionItems.length,
    blocked: byCol.BLOCKED.length,
    done:    byCol.DONE.length,
  };

  return (
    <div>
      <PageHeader
        eyebrow="Work board"
        title={activeSection || 'Work board'}
        icon={KanbanSquare}
        description="Drag a card between columns to move it. Status changes sync in real time."
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle view={view} setView={setView} />
            <Button
              variant="filled"
              icon={Plus}
              onClick={() => setQuickAdd(quickAdd ? null : 'TODO')}
            >
              New work item
            </Button>
          </div>
        }
      />

      {/* ── Section tabs ── */}
      {sections.length > 0 && (
        <div className="flex items-center gap-1.5 mb-6 flex-wrap">
          {sections.map((sec) => {
            const count = items.filter((i) => i.sectionType === sec).length;
            const active = sec === activeSection;
            return (
              <button
                key={sec}
                onClick={() => setSection(sec)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors"
                style={{
                  color: active ? 'var(--m3-primary)' : 'var(--m3-on-surf-var)',
                  background: active ? 'var(--m3-prim-c)' : 'transparent',
                }}
              >
                {sec}
                <span className="kbd" style={{ minWidth: 18 }}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Stat strip ── */}
      <div className="flex items-center gap-4 mb-5 text-[12.5px]" style={{ color: 'var(--m3-on-surf-var)' }}>
        <span>{stats.total} total</span>
        <span className="opacity-50">·</span>
        <span style={{ color: stats.blocked > 0 ? 'var(--m3-error)' : undefined }}>
          {stats.blocked} blocked
        </span>
        <span className="opacity-50">·</span>
        <span style={{ color: 'var(--m3-success)' }}>{stats.done} done</span>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
          {COLUMNS.map((c) => (
            <div key={c} className="surface p-4 h-[420px]"><Skeleton h={300} /></div>
          ))}
        </div>
      ) : view === 'kanban' ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
          {COLUMNS.map((status) => (
            <Column
              key={status}
              status={status}
              items={byCol[status]}
              dragOver={dragOver === status}
              onDragEnter={() => setDragOver(status)}
              onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
              onDrop={(id) => { setDragOver(null); void handleMove(id, status); }}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onMove={handleMove}
              quickAdd={quickAdd === status}
              onOpenQuickAdd={() => setQuickAdd(status)}
              onCloseQuickAdd={() => setQuickAdd(null)}
              onAdd={(title, priority) => handleAdd(activeSection, status, title, priority)}
            />
          ))}
        </div>
      ) : (
        <ListView
          items={sectionItems}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

/* ─── Column ─── */

function Column({
  status, items, dragOver, onDragEnter, onDragLeave, onDrop,
  onUpdate, onDelete, onMove,
  quickAdd, onOpenQuickAdd, onCloseQuickAdd, onAdd,
}: {
  status: WorkItemStatus;
  items: WorkItem[];
  dragOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (id: string) => void;
  onUpdate: (id: string, data: Partial<WorkItem>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, status: WorkItemStatus) => void;
  quickAdd: boolean;
  onOpenQuickAdd: () => void;
  onCloseQuickAdd: () => void;
  onAdd: (title: string, priority: Priority) => Promise<void>;
}) {
  const meta = COL_META[status];

  function allowDrop(e: DragEvent) {
    if (e.dataTransfer.types.includes('text/x-theory-id')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  }

  return (
    <motion.div
      layout
      onDragOver={allowDrop}
      onDragEnter={(e) => { allowDrop(e); onDragEnter(); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/x-theory-id');
        if (id) onDrop(id);
      }}
      className="surface lift overflow-hidden"
      style={{
        borderColor: dragOver
          ? 'color-mix(in srgb, var(--m3-primary) 45%, var(--m3-outline-v))'
          : undefined,
        background: dragOver
          ? 'color-mix(in srgb, var(--m3-primary) 6%, var(--m3-surf0))'
          : undefined,
      }}
    >
      <div
        className="flex items-center justify-between px-4 h-11"
        style={{ borderBottom: '1px solid var(--m3-outline-v)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.accent }} />
          <span className="text-eyebrow truncate" style={{ fontSize: 10.5, color: 'var(--m3-on-surf)' }}>
            {meta.label}
          </span>
          <span className="kbd" style={{ minWidth: 18 }}>{items.length}</span>
        </div>
        <button
          onClick={onOpenQuickAdd}
          aria-label="Add card"
          className="grid place-items-center w-7 h-7 rounded-lg transition-colors"
          style={{ color: 'var(--m3-on-surf-var)' }}
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="p-2.5 space-y-2.5 min-h-[60px]">
        <AnimatePresence mode="popLayout">
          {quickAdd && (
            <QuickAdd
              key="quick-add"
              onSubmit={async (title, priority) => { await onAdd(title, priority); onCloseQuickAdd(); }}
              onCancel={onCloseQuickAdd}
            />
          )}
          {items.length === 0 && !quickAdd ? (
            <div
              key="empty"
              className="text-center py-7 text-[12px]"
              style={{ color: 'var(--m3-on-surf-var)', opacity: 0.55 }}
            >
              Drop a card here
            </div>
          ) : (
            items.map((it) => (
              <WorkCard
                key={it.id}
                item={it}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onMove={onMove}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── Work card ─── */

function WorkCard({
  item, onUpdate, onDelete, onMove,
}: {
  item: WorkItem;
  onUpdate: (id: string, data: Partial<WorkItem>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, status: WorkItemStatus) => void;
}) {
  const prio = PRIO_META[item.priority];
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);
  const overdue =
    item.dueDate && isPast(new Date(item.dueDate)) &&
    item.status !== 'DONE' && item.status !== 'CANCELLED';

  function handleNativeDragStart(e: DragEvent) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/x-theory-id', item.id);
    e.dataTransfer.setData('text/plain', item.title);
  }

  function commit() {
    const t = draft.trim();
    if (t && t !== item.title) onUpdate(item.id, { title: t });
    setEditing(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        draggable
        onDragStart={handleNativeDragStart}
        className="relative rounded-xl p-3 cursor-grab active:cursor-grabbing"
        style={{
          background: 'var(--m3-surf1)',
          border: '1px solid var(--m3-outline-v)',
          boxShadow: 'var(--elev-1)',
        }}
      >
      {/* Priority rail */}
      <span
        aria-hidden
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
        style={{ background: prio.rail }}
      />

      <div className="flex items-start gap-2 pl-2">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              else if (e.key === 'Escape') { setDraft(item.title); setEditing(false); }
            }}
            className="flex-1 bg-transparent outline-none text-[13.5px] font-medium"
            style={{ color: 'var(--m3-on-surf)' }}
          />
        ) : (
          <div
            onDoubleClick={() => setEditing(true)}
            className="flex-1 text-[13.5px] font-medium leading-snug"
            style={{ color: 'var(--m3-on-surf)' }}
          >
            {item.title}
          </div>
        )}
        <button
          onClick={() => setMenu((v) => !v)}
          aria-label="More"
          className="grid place-items-center w-6 h-6 rounded-md transition-colors shrink-0"
          style={{ color: 'var(--m3-on-surf-var)' }}
        >
          <MoreHorizontal size={13} />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-2.5 pl-2 flex-wrap">
        <SeverityBadge severity={prio.severity} />
        {item.dueDate && (
          <span
            className="inline-flex items-center gap-1 text-[11px]"
            style={{ color: overdue ? 'var(--m3-error)' : 'var(--m3-on-surf-var)' }}
          >
            <Clock size={11} />
            {format(new Date(item.dueDate), 'd MMM')}
          </span>
        )}
        {(item.tags ?? []).slice(0, 2).map((t) => (
          <span
            key={t}
            className="text-[10.5px] px-1.5 py-0.5 rounded-md"
            style={{ background: 'var(--elevated)', color: 'var(--m3-on-surf-var)' }}
          >
            {t}
          </span>
        ))}
      </div>

      <AnimatePresence>
        {menu && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onMouseLeave={() => setMenu(false)}
            className="absolute right-2 top-9 z-10 surface-float p-1 text-[12.5px]"
            style={{ minWidth: 160 }}
          >
            <MenuItem onClick={() => { setEditing(true); setMenu(false); }}>Rename</MenuItem>
            <div className="px-2 pt-1.5 pb-0.5 text-eyebrow" style={{ fontSize: 10 }}>
              Move to
            </div>
            {COLUMNS.filter((s) => s !== item.status).map((s) => (
              <MenuItem key={s} onClick={() => { onMove(item.id, s); setMenu(false); }}>
                {COL_META[s].label}
              </MenuItem>
            ))}
            <div className="my-1 h-px" style={{ background: 'var(--m3-outline-v)' }} />
            <MenuItem
              danger
              onClick={() => { if (confirm('Delete this card?')) { onDelete(item.id); setMenu(false); } }}
            >
              <Trash2 size={12} /> Delete
            </MenuItem>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}

function MenuItem({
  children, onClick, danger,
}: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors"
      style={{ color: danger ? 'var(--m3-error)' : 'var(--m3-on-surf)' }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--state-hover)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

/* ─── Quick add ─── */

function QuickAdd({
  onSubmit, onCancel,
}: { onSubmit: (title: string, priority: Priority) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('P3');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  async function commit() {
    const t = title.trim();
    if (!t) { onCancel(); return; }
    setBusy(true);
    try { await onSubmit(t, priority); } finally { setBusy(false); }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-xl p-3"
      style={{ background: 'var(--m3-surf1)', border: '1px solid var(--m3-outline-v)' }}
    >
      <input
        ref={ref}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void commit();
          else if (e.key === 'Escape') onCancel();
        }}
        placeholder="Title…"
        className="w-full bg-transparent outline-none text-[13.5px] font-medium mb-2.5"
        style={{ color: 'var(--m3-on-surf)' }}
      />
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRIO_ORDER.map((p) => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            className="px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors"
            style={{
              color: priority === p ? PRIO_META[p].rail : 'var(--m3-on-surf-var)',
              background: priority === p ? `color-mix(in srgb, ${PRIO_META[p].rail} 14%, transparent)` : 'transparent',
            }}
          >
            {PRIO_META[p].label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="grid place-items-center w-6 h-6 rounded-md"
          style={{ color: 'var(--m3-on-surf-var)' }}
        >
          <X size={12} />
        </button>
        <button
          onClick={commit}
          disabled={!title.trim() || busy}
          className="btn-filled"
          style={{ padding: '4px 12px', fontSize: 11.5 }}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : 'Add'}
        </button>
      </div>
    </motion.div>
  );
}

/* ─── List view (minimal fallback — primary surface is Kanban) ─── */

function ListView({
  items, onUpdate, onDelete,
}: {
  items: WorkItem[];
  onUpdate: (id: string, data: Partial<WorkItem>) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return <EmptyState title="Nothing in this section yet" description="Switch to Kanban to add cards quickly." />;
  }
  return (
    <Section>
      <div className="surface overflow-hidden">
        {items.map((it, i) => {
          const prio = PRIO_META[it.priority];
          const overdue =
            it.dueDate && isPast(new Date(it.dueDate)) &&
            it.status !== 'DONE' && it.status !== 'CANCELLED';
          return (
            <div
              key={it.id}
              className="flex items-center gap-3 px-4 py-3 group"
              style={{
                borderTop: i === 0 ? undefined : '1px solid var(--m3-outline-v)',
              }}
            >
              <span className="w-1 h-6 rounded-r" style={{ background: prio.rail }} />
              <SeverityBadge severity={prio.severity} />
              <button
                onDoubleClick={() => {
                  const next = prompt('New title', it.title);
                  if (next && next.trim() && next.trim() !== it.title) {
                    onUpdate(it.id, { title: next.trim() });
                  }
                }}
                className="flex-1 text-left text-[13.5px] truncate"
                style={{ color: 'var(--m3-on-surf)' }}
              >
                {it.title}
              </button>
              <span
                className="text-[11px]"
                style={{ color: 'var(--m3-on-surf-var)', opacity: 0.7 }}
              >
                {COL_META[it.status].label}
              </span>
              {it.dueDate && (
                <span
                  className="text-[11px]"
                  style={{ color: overdue ? 'var(--m3-error)' : 'var(--m3-on-surf-var)' }}
                >
                  {format(new Date(it.dueDate), 'd MMM')}
                </span>
              )}
              <button
                onClick={() => { if (confirm('Delete this card?')) onDelete(it.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--m3-on-surf-var)' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ─── View toggle ─── */

function ViewToggle({
  view, setView,
}: { view: 'kanban' | 'list'; setView: (v: 'kanban' | 'list') => void }) {
  return (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded-lg"
      style={{ background: 'var(--elevated)', border: '1px solid var(--m3-outline-v)' }}
    >
      {([
        { id: 'kanban' as const, icon: LayoutGrid },
        { id: 'list'   as const, icon: ListIcon },
      ]).map(({ id, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setView(id)}
          aria-label={id}
          className="grid place-items-center w-7 h-7 rounded-md transition-colors"
          style={{
            background: view === id ? 'var(--m3-surf2)' : 'transparent',
            color: view === id ? 'var(--m3-on-surf)' : 'var(--m3-on-surf-var)',
          }}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  );
}
