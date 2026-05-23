/* ═══════════════════════════════════════════════════════════════
   THEORY · UI PRIMITIVES
   One token-driven kit every page composes from, so the whole
   product reads as one designed system. Premium, restrained,
   accessible. No hardcoded colors — all via --m3-* / primitives.
   ═══════════════════════════════════════════════════════════════ */
import {
  type ReactNode, type ElementType, useEffect, useMemo, useState,
} from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  X, ArrowUpRight, ArrowDownRight, Search, Inbox,
  ChevronRight, type LucideIcon,
} from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── PageHeader ─────────────────────────────────────────────── */
export function PageHeader({
  eyebrow, title, description, actions, icon: Icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex items-start justify-between gap-6 mb-7"
    >
      <div className="min-w-0">
        {eyebrow && <div className="text-eyebrow mb-2">{eyebrow}</div>}
        <div className="flex items-center gap-3">
          {Icon && (
            <span
              className="grid place-items-center w-9 h-9 rounded-xl shrink-0"
              style={{ background: 'var(--m3-prim-c)', color: 'var(--m3-primary)' }}
            >
              <Icon size={18} strokeWidth={2} />
            </span>
          )}
          <h1 className="text-hero" style={{ color: 'var(--m3-on-surf)' }}>{title}</h1>
        </div>
        {description && (
          <p className="text-[13.5px] measure mt-2" style={{ color: 'var(--m3-on-surf-var)' }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </motion.div>
  );
}

/* ── Section ────────────────────────────────────────────────── */
export function Section({
  title, hint, actions, children, className = '',
}: {
  title?: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-8 ${className}`}>
      {(title || actions) && (
        <div className="flex items-end justify-between mb-3">
          <div>
            {title && (
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--m3-on-surf)' }}>
                {title}
              </h2>
            )}
            {hint && (
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--m3-on-surf-var)' }}>{hint}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/* ── StatTile — operational metric ──────────────────────────── */
export function StatTile({
  label, value, delta, deltaGood, sub, icon: Icon, accent,
}: {
  label: string;
  value: ReactNode;
  delta?: number;          // signed % change
  deltaGood?: boolean;     // is an increase good? default true
  sub?: string;
  icon?: LucideIcon;
  accent?: boolean;
}) {
  const up = (delta ?? 0) >= 0;
  const good = up === (deltaGood ?? true);
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="surface surface-lit lift p-5"
      style={accent ? { background: 'var(--m3-prim-c)' } : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-eyebrow" style={{ fontSize: 10.5 }}>{label}</span>
        {Icon && (
          <Icon size={15} style={{ color: 'var(--m3-on-surf-var)' }} />
        )}
      </div>
      <div className="text-metric" style={{ color: 'var(--m3-on-surf)' }}>{value}</div>
      <div className="flex items-center gap-2 mt-2">
        {delta !== undefined && (
          <span
            className="inline-flex items-center gap-0.5 text-[12px] font-medium"
            style={{ color: good ? 'var(--m3-success)' : 'var(--m3-error)' }}
          >
            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(delta)}%
          </span>
        )}
        {sub && (
          <span className="text-[12px]" style={{ color: 'var(--m3-on-surf-var)' }}>{sub}</span>
        )}
      </div>
    </motion.div>
  );
}

/* ── Severity system (shared by signals/badges) ─────────────── */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
const SEV: Record<Severity, { fg: string; bg: string; label: string }> = {
  critical: { fg: 'var(--m3-error)',     bg: 'color-mix(in srgb, var(--m3-error) 14%, transparent)',     label: 'Critical' },
  high:     { fg: 'var(--m3-warning)',   bg: 'color-mix(in srgb, var(--m3-warning) 16%, transparent)',   label: 'High' },
  medium:   { fg: 'var(--m3-primary)',   bg: 'var(--m3-prim-c)',                                          label: 'Medium' },
  low:      { fg: 'var(--m3-secondary)', bg: 'color-mix(in srgb, var(--m3-secondary) 14%, transparent)',  label: 'Low' },
  info:     { fg: 'var(--m3-on-surf-var)', bg: 'var(--elevated)',                                         label: 'Info' },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEV[severity];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
      style={{ color: s.fg, background: s.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.fg }} />
      {s.label}
    </span>
  );
}

/* ── SignalCard — the core operational-intelligence unit ────── */
export function SignalCard({
  severity, title, body, meta, onAction, actionLabel = 'Investigate', icon: Icon,
}: {
  severity: Severity;
  title: string;
  body?: string;
  meta?: string;
  onAction?: () => void;
  actionLabel?: string;
  icon?: LucideIcon;
}) {
  const s = SEV[severity];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="surface lift p-4 flex gap-3.5"
      style={{ borderLeft: `2px solid ${s.fg}` }}
    >
      <span
        className="grid place-items-center w-9 h-9 rounded-lg shrink-0 mt-0.5"
        style={{ background: s.bg, color: s.fg }}
      >
        {Icon ? <Icon size={16} /> : <span className="w-2 h-2 rounded-full" style={{ background: s.fg }} />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-[13.5px] font-semibold truncate" style={{ color: 'var(--m3-on-surf)' }}>
            {title}
          </h3>
          <SeverityBadge severity={severity} />
        </div>
        {body && (
          <p className="text-[12.5px] leading-snug" style={{ color: 'var(--m3-on-surf-var)' }}>{body}</p>
        )}
        {meta && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--m3-on-surf-var)', opacity: 0.7 }}>{meta}</p>
        )}
      </div>
      {onAction && (
        <button
          onClick={onAction}
          className="self-center shrink-0 inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--m3-primary)', background: 'var(--m3-prim-c)' }}
        >
          {actionLabel} <ChevronRight size={13} />
        </button>
      )}
    </motion.div>
  );
}

/* ── EmptyState ─────────────────────────────────────────────── */
export function EmptyState({
  icon: Icon = Inbox, title, description, action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center text-center py-16 px-6">
      <span
        className="grid place-items-center w-14 h-14 rounded-2xl mb-4"
        style={{ background: 'var(--elevated)', color: 'var(--m3-on-surf-var)' }}
      >
        <Icon size={24} />
      </span>
      <h3 className="text-[15px] font-semibold mb-1.5" style={{ color: 'var(--m3-on-surf)' }}>{title}</h3>
      {description && (
        <p className="text-[13px] measure-tight mb-5" style={{ color: 'var(--m3-on-surf-var)' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

/* ── Drawer — slide-over panel ──────────────────────────────── */
export function Drawer({
  open, onClose, title, children, width = 460,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: number;
}) {
  const reduce = useReducedMotion();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex justify-end"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          onMouseDown={onClose}
          role="dialog" aria-modal="true" aria-label={title}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(2,4,12,0.55)', backdropFilter: 'blur(4px)' }} />
          <motion.aside
            className="relative h-full overflow-y-auto surface-float"
            style={{ width, borderRadius: 0, borderRight: 0, borderTop: 0, borderBottom: 0 }}
            initial={{ x: reduce ? 0 : width }} animate={{ x: 0 }} exit={{ x: reduce ? 0 : width }}
            transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-5 h-14 sticky top-0 z-10"
              style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--m3-outline-v)', backdropFilter: 'blur(20px)' }}
            >
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--m3-on-surf)' }}>{title}</h2>
              <button
                onClick={onClose} aria-label="Close"
                className="grid place-items-center w-8 h-8 rounded-lg"
                style={{ color: 'var(--m3-on-surf-var)' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ── DataTable — Linear/Notion-grade table ──────────────────── */
export interface Column<T> {
  key: string;
  header: string;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
}

export interface SavedView {
  id: string;
  label: string;
  filter: (row: unknown) => boolean;
}

export function DataTable<T extends { id: string }>({
  columns, rows, onRowClick, searchKeys, views, emptyTitle = 'Nothing here yet',
  emptyDescription, rowActions,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  searchKeys?: (keyof T)[];
  views?: SavedView[];
  emptyTitle?: string;
  emptyDescription?: string;
  rowActions?: (row: T) => ReactNode;
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [view, setView] = useState<string>('all');
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    let r = rows;
    if (views && view !== 'all') {
      const v = views.find((x) => x.id === view);
      if (v) r = r.filter((row) => v.filter(row));
    }
    if (q && searchKeys) {
      const s = q.toLowerCase();
      r = r.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(s)),
      );
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        r = [...r].sort((a, b) => {
          const av = col.sortValue!(a), bv = col.sortValue!(b);
          return av < bv ? -sort.dir : av > bv ? sort.dir : 0;
        });
      }
    }
    return r;
  }, [rows, q, sort, view, views, searchKeys, columns]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!filtered.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter' && onRowClick) onRowClick(filtered[active]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, active, onRowClick]);

  return (
    <div className="surface overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 h-12" style={{ borderBottom: '1px solid var(--m3-outline-v)' }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search size={14} style={{ color: 'var(--m3-on-surf-var)' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter…"
            className="bg-transparent outline-none text-[13px] w-full"
            style={{ color: 'var(--m3-on-surf)' }}
          />
        </div>
        {views && (
          <div className="flex items-center gap-1">
            {[{ id: 'all', label: 'All' }, ...views].map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className="px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors"
                style={{
                  color: view === v.id ? 'var(--m3-primary)' : 'var(--m3-on-surf-var)',
                  background: view === v.id ? 'var(--m3-prim-c)' : 'transparent',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--m3-outline-v)' }}>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    onClick={() =>
                      c.sortValue &&
                      setSort((s) =>
                        s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 },
                      )
                    }
                    className="text-eyebrow px-4 py-2.5 text-left select-none"
                    style={{
                      width: c.width, fontSize: 10.5,
                      textAlign: c.align ?? 'left',
                      cursor: c.sortValue ? 'pointer' : 'default',
                      position: 'sticky', top: 0,
                      background: 'var(--m3-surf0)',
                    }}
                  >
                    {c.header}
                    {sort?.key === c.key && (sort.dir === 1 ? ' ↑' : ' ↓')}
                  </th>
                ))}
                {rowActions && <th style={{ width: 44, position: 'sticky', top: 0, background: 'var(--m3-surf0)' }} />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  onMouseEnter={() => setActive(i)}
                  className="transition-colors"
                  style={{
                    borderBottom: '1px solid var(--m3-outline-v)',
                    background: i === active ? 'var(--state-hover)' : 'transparent',
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className="px-4 py-3"
                      style={{ textAlign: c.align ?? 'left', color: 'var(--m3-on-surf)' }}
                    >
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Button helpers (thin wrappers over .btn-* tokens) ──────── */
export function Button({
  children, variant = 'filled', icon: Icon, ...rest
}: {
  children: ReactNode;
  variant?: 'filled' | 'tonal' | 'outlined' | 'text';
  icon?: LucideIcon;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = { filled: 'btn-filled', tonal: 'btn-tonal', outlined: 'btn-outlined', text: 'btn-text' }[variant];
  return (
    <button className={cls} {...rest}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

/* ── PlanGate — gentle upgrade boundary ─────────────────────── */
export function PlanGate({
  children, locked, plan = 'Pro', onUpgrade, feature,
}: {
  children: ReactNode;
  locked: boolean;
  plan?: string;
  onUpgrade?: () => void;
  feature?: string;
}) {
  if (!locked) return <>{children}</>;
  return (
    <div className="surface relative overflow-hidden p-8 text-center">
      <div className="pointer-events-none absolute inset-0 opacity-40 blur-sm">{children}</div>
      <div className="relative">
        <span className="text-eyebrow">{plan} feature</span>
        <h3 className="text-[16px] font-semibold mt-2 mb-1" style={{ color: 'var(--m3-on-surf)' }}>
          {feature ?? 'Unlock this with ' + plan}
        </h3>
        <p className="text-[13px] measure-tight mx-auto mb-5" style={{ color: 'var(--m3-on-surf-var)' }}>
          This is part of the {plan} plan. Upgrade your workspace to turn it on for everyone.
        </p>
        <Button variant="filled" icon={ArrowUpRight} onClick={onUpgrade}>Upgrade to {plan}</Button>
      </div>
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────────── */
export function Skeleton({ className = '', h = 16 }: { className?: string; h?: number }) {
  return <div className={`skeleton ${className}`} style={{ height: h }} />;
}

export const SEVERITY_META = SEV;
