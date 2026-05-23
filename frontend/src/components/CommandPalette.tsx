import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { create } from 'zustand';
import {
  Search, CornerDownLeft, ArrowUp, ArrowDown,
  LayoutGrid, KanbanSquare, ListChecks, Clock3, CalendarDays,
  Lightbulb, BookOpen, BarChart3, Radar, Building2, Shield,
  Plus, SunMoon, LogOut, Sparkles, type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTimeTheme } from '../hooks/useTimeTheme';

/* ── Open-state store (lets the header / shortcuts trigger it) ── */
interface CmdState { open: boolean; setOpen: (v: boolean) => void; toggle: () => void; }
export const useCommandPalette = create<CmdState>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open })),
}));

type Role = 'EMPLOYEE' | 'MANAGER' | 'LEADERSHIP' | 'ADMIN';

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: 'Navigate' | 'Create' | 'AI' | 'Account';
  icon: LucideIcon;
  keywords?: string;
  roles?: Role[];
  run: (ctx: CommandCtx) => void;
}

interface CommandCtx {
  navigate: (to: string) => void;
  toggleTheme: () => void;
  logout: () => void;
}

const COMMANDS: Command[] = [
  { id: 'nav-daily',    label: 'Daily',            group: 'Navigate', icon: LayoutGrid,    keywords: 'home today standup', run: (c) => c.navigate('/daily') },
  { id: 'nav-board',    label: 'Work Board',       group: 'Navigate', icon: KanbanSquare,  keywords: 'kanban tasks',       run: (c) => c.navigate('/board') },
  { id: 'nav-follow',   label: 'Follow-ups',       group: 'Navigate', icon: ListChecks,    keywords: 'reminders chase',    run: (c) => c.navigate('/follow-ups') },
  { id: 'nav-time',     label: 'Time Log',         group: 'Navigate', icon: Clock3,        keywords: 'hours timesheet',    run: (c) => c.navigate('/time-log') },
  { id: 'nav-meet',     label: 'Meetings',         group: 'Navigate', icon: CalendarDays,  keywords: 'calendar agenda',    run: (c) => c.navigate('/meetings') },
  { id: 'nav-ideas',    label: 'Idea Bank',        group: 'Navigate', icon: Lightbulb,     keywords: 'suggestions',        run: (c) => c.navigate('/ideas') },
  { id: 'nav-kb',       label: 'Knowledge Base',   group: 'Navigate', icon: BookOpen,      keywords: 'docs wiki notes',    run: (c) => c.navigate('/kb') },
  { id: 'nav-reports',  label: 'Reports',          group: 'Navigate', icon: BarChart3,     keywords: 'analytics export',   run: (c) => c.navigate('/reports') },
  { id: 'nav-manager',  label: 'Manager Console',  group: 'Navigate', icon: Radar,         keywords: 'team signals',       roles: ['MANAGER', 'LEADERSHIP', 'ADMIN'], run: (c) => c.navigate('/manager') },
  { id: 'nav-pulse',    label: 'Org Pulse',        group: 'Navigate', icon: Building2,     keywords: 'leadership health',  roles: ['LEADERSHIP', 'ADMIN'],            run: (c) => c.navigate('/org-pulse') },
  { id: 'nav-admin',    label: 'Admin Panel',      group: 'Navigate', icon: Shield,        keywords: 'settings users',     roles: ['ADMIN'],                          run: (c) => c.navigate('/admin') },

  { id: 'new-task',     label: 'New work item',    group: 'Create',   icon: Plus,          hint: 'Open board',  keywords: 'add create task card', run: (c) => c.navigate('/board?new=1') },
  { id: 'new-followup', label: 'New follow-up',    group: 'Create',   icon: ListChecks,    hint: 'Open follow-ups', keywords: 'add reminder',     run: (c) => c.navigate('/follow-ups?new=1') },

  { id: 'ai-digest',    label: 'Generate standup digest', group: 'AI', icon: Sparkles,     hint: 'AI',  keywords: 'summary ai assistant', run: (c) => c.navigate('/daily?ai=digest') },
  { id: 'ai-triage',    label: 'Triage my blockers',      group: 'AI', icon: Sparkles,     hint: 'AI',  keywords: 'ai blockers',          run: (c) => c.navigate('/board?ai=triage') },

  { id: 'acc-theme',    label: 'Toggle theme',     group: 'Account',  icon: SunMoon,       keywords: 'dark light appearance', run: (c) => c.toggleTheme() },
  { id: 'acc-logout',   label: 'Sign out',         group: 'Account',  icon: LogOut,        keywords: 'log out exit',          run: (c) => c.logout() },
];

const GROUP_ORDER: Command['group'][] = ['Navigate', 'Create', 'AI', 'Account'];

export default function CommandPalette() {
  const { open, setOpen, toggle } = useCommandPalette();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role) as Role | undefined;
  const logout = useAuthStore((s) => s.logout);
  const { toggle: toggleTheme } = useTimeTheme();
  const reduce = useReducedMotion();

  /* Global shortcut: ⌘K / Ctrl-K, and ⌘P guard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  /* Reset + focus on open */
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COMMANDS.filter((c) => {
      if (c.roles && (!role || !c.roles.includes(role))) return false;
      if (!q) return true;
      return (
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        (c.keywords?.includes(q) ?? false)
      );
    });
  }, [query, role]);

  const grouped = useMemo(() => {
    const map = new Map<Command['group'], Command[]>();
    for (const g of GROUP_ORDER) {
      const items = visible.filter((c) => c.group === g);
      if (items.length) map.set(g, items);
    }
    return [...map.entries()];
  }, [visible]);

  const flat = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  useEffect(() => {
    if (active >= flat.length) setActive(flat.length ? flat.length - 1 : 0);
  }, [flat.length, active]);

  const runCommand = useCallback(
    (cmd?: Command) => {
      if (!cmd) return;
      setOpen(false);
      cmd.run({
        navigate,
        toggleTheme,
        logout: () => { void logout(); navigate('/login'); },
      });
    },
    [navigate, toggleTheme, logout, setOpen],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); runCommand(flat[active]); }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let runningIdx = -1;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          onMouseDown={() => setOpen(false)}
        >
          {/* Scrim */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(2,4,12,0.62)', backdropFilter: 'blur(6px)' }}
          />

          <motion.div
            className="relative w-full max-w-[640px] overflow-hidden"
            initial={{ opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : 8, scale: reduce ? 1 : 0.99 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(28px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
              border: '1px solid var(--glass-border)',
              borderRadius: 18,
              boxShadow: 'var(--elev-3)',
            }}
          >
            {/* Search row */}
            <div
              className="flex items-center gap-3 px-4"
              style={{ height: 56, borderBottom: '1px solid var(--m3-outline-v)' }}
            >
              <Search size={18} style={{ color: 'var(--m3-on-surf-var)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                placeholder="Search or jump to…"
                aria-label="Command search"
                className="flex-1 bg-transparent outline-none text-[15px]"
                style={{ color: 'var(--m3-on-surf)' }}
              />
              <span className="kbd">esc</span>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
              {flat.length === 0 && (
                <div
                  className="px-5 py-10 text-center text-[13px]"
                  style={{ color: 'var(--m3-on-surf-var)' }}
                >
                  No matches for “{query}”.
                </div>
              )}

              {grouped.map(([group, items]) => (
                <div key={group} className="px-2 pb-1">
                  <div
                    className="px-3 pt-3 pb-1.5 text-eyebrow"
                    style={{ fontSize: 10, letterSpacing: '0.12em' }}
                  >
                    {group}
                  </div>
                  {items.map((cmd) => {
                    runningIdx += 1;
                    const idx = runningIdx;
                    const isActive = idx === active;
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        data-idx={idx}
                        onMouseMove={() => setActive(idx)}
                        onClick={() => runCommand(cmd)}
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                        style={{
                          background: isActive ? 'var(--state-hover)' : 'transparent',
                          color: 'var(--m3-on-surf)',
                        }}
                      >
                        <span
                          className="grid place-items-center w-8 h-8 rounded-lg shrink-0"
                          style={{
                            background: 'var(--elevated)',
                            border: '1px solid var(--m3-outline-v)',
                            color: isActive ? 'var(--m3-primary)' : 'var(--m3-on-surf-var)',
                          }}
                        >
                          <Icon size={15} strokeWidth={2} />
                        </span>
                        <span className="flex-1 text-[14px]">{cmd.label}</span>
                        {cmd.hint && (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-md"
                            style={{
                              color: 'var(--m3-on-surf-var)',
                              background: 'var(--elevated)',
                            }}
                          >
                            {cmd.hint}
                          </span>
                        )}
                        {isActive && (
                          <CornerDownLeft
                            size={14}
                            style={{ color: 'var(--m3-on-surf-var)' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-4"
              style={{
                height: 40,
                borderTop: '1px solid var(--m3-outline-v)',
                color: 'var(--m3-on-surf-var)',
                fontSize: 11,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <ArrowUp size={11} /><ArrowDown size={11} /> navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <CornerDownLeft size={11} /> select
                </span>
              </div>
              <span className="flex items-center gap-1.5">
                <span className="kbd">⌘</span><span className="kbd">K</span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
