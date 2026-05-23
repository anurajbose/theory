import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, ChevronDown, LogOut, User,
  X, Check, CheckCheck, ExternalLink, Sun, Moon,
  AlertTriangle, ClipboardList, Sunrise, Sunset,
  OctagonAlert, Gauge, Trophy, Megaphone, Clock, Activity,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useCommandPalette } from '../CommandPalette';
import { UserButton, OrganizationSwitcher } from '@clerk/clerk-react';
import { clerkEnabled } from '../../auth/clerk';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTimeTheme } from '../../hooks/useTimeTheme';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type Notification,
} from '../../services/notificationService';
import toast from 'react-hot-toast';

/* ── Page title map ── */
const PAGE_TITLES: Record<string, string> = {
  '/daily':      'Daily',
  '/signals':      'Signals',
  '/intelligence': 'Intelligence',
  '/upgrade':      'Upgrade',
  '/board':      'Work Board',
  '/follow-ups': 'Follow-ups',
  '/time-log':   'Time Log',
  '/meetings':   'Meetings',
  '/ideas':      'Idea Bank',
  '/kb':         'Knowledge Base',
  '/reports':    'Reports',
  '/manager':    'Manager Console',
  '/org-intelligence': 'Org Intelligence',
  '/risk-radar': 'Risk Radar',
  '/admin':      'Admin Panel',
};

const NOTIF_ICONS: Record<string, LucideIcon> = {
  SLA_BREACH:        AlertTriangle,
  FOLLOW_UP_OVERDUE: ClipboardList,
  STANDUP_MISSING:   Sunrise,
  EOD_PROMPT:        Sunset,
  BLOCKER_ALERT:     OctagonAlert,
  OVERLOAD_ALERT:    Gauge,
  WIN_SPOTLIGHT:     Trophy,
  ANNOUNCEMENT:      Megaphone,
  ACTION_DUE:        Clock,
  SYSTEM:            Activity,
};

const NOTIF_TINT: Record<string, string> = {
  SLA_BREACH:        'var(--m3-error)',
  BLOCKER_ALERT:     'var(--m3-error)',
  OVERLOAD_ALERT:    '#d97706',
  WIN_SPOTLIGHT:     'var(--m3-secondary)',
};

/* ── Icon button helper ── */
function IconBtn({
  onClick, title, children, active,
}: {
  onClick: () => void; title?: string;
  children: React.ReactNode; active?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      title={title}
      className="relative w-9 h-9 flex items-center justify-center rounded-xl
                 transition-all duration-150 focus:outline-none"
      style={{
        background: active ? 'var(--m3-prim-c)' : 'transparent',
        color: active ? 'var(--m3-primary)' : 'var(--m3-on-surf-var)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'var(--state-hover)';
          (e.currentTarget as HTMLElement).style.color = 'var(--m3-on-surf)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--m3-on-surf-var)';
        }
      }}
    >
      {children}
    </motion.button>
  );
}

export default function Header() {
  const { user, logout }    = useAuthStore();
  const navigate            = useNavigate();
  const location            = useLocation();
  const { mode, toggle }    = useTimeTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const bellRef = useRef<HTMLDivElement>(null);
  const openPalette = useCommandPalette((s) => s.setOpen);

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'theory';

  /* ── Poll notifications ── */
  async function loadNotifications() {
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch { /* silent */ }
  }

  useEffect(() => {
    loadNotifications();
    const iv = setInterval(loadNotifications, 30_000);
    return () => clearInterval(iv);
  }, []);

  /* ── Close bell on outside click ── */
  useEffect(() => {
    if (!bellOpen) return;
    function handle(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [bellOpen]);

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    toast.success('All marked as read');
  }

  async function handleDelete(id: string, wasRead: boolean) {
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (!wasRead) setUnreadCount(prev => Math.max(0, prev - 1));
  }

  function handleNotifClick(n: Notification) {
    if (!n.read) handleMarkRead(n.id);
    if (n.link) navigate(n.link);
    setBellOpen(false);
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
    toast.success('Signed out');
  }

  const initials = (user?.name ?? '')
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '??';

  return (
    <header
      className="h-14 flex items-center px-5 gap-3 shrink-0 z-10"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        borderBottom: '1px solid var(--m3-outline-v)',
      }}
    >
      {/* ── Page title ── */}
      <AnimatePresence mode="wait">
        <motion.h1
          key={pageTitle}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          className="text-sm font-semibold tracking-tight shrink-0"
          style={{ color: 'var(--m3-on-surf)' }}
        >
          {pageTitle}
        </motion.h1>
      </AnimatePresence>

      {/* ── Centered command / global search ── */}
      <div className="flex-1 flex justify-center px-4">
        <button
          onClick={() => openPalette(true)}
          aria-label="Open command palette"
          className="group flex items-center gap-2.5 w-full max-w-[420px] h-9 px-3 rounded-xl transition-colors"
          style={{
            background: 'var(--elevated)',
            border: '1px solid var(--m3-outline-v)',
            color: 'var(--m3-on-surf-var)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'color-mix(in srgb, var(--m3-primary) 30%, var(--m3-outline-v))'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--m3-outline-v)'; }}
        >
          <Search size={15} className="shrink-0" />
          <span className="flex-1 text-left text-[13px] truncate">Search or jump to…</span>
          <span className="flex items-center gap-1 shrink-0">
            <span className="kbd">⌘</span><span className="kbd">K</span>
          </span>
        </button>
      </div>

      {/* ── Right controls ── */}
      <div className="flex items-center gap-1 shrink-0">

        {/* ── Theme toggle ── */}
        <IconBtn onClick={toggle} title={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}>
          <AnimatePresence mode="wait">
            <motion.span
              key={mode}
              initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'flex' }}
            >
              {mode === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </motion.span>
          </AnimatePresence>
        </IconBtn>

        {/* ── Bell ── */}
        <div className="relative" ref={bellRef}>
          <IconBtn onClick={() => setBellOpen(v => !v)} title="Notifications">
            <Bell size={17} />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5
                             rounded-full flex items-center justify-center
                             text-[8px] font-bold pointer-events-none"
                  style={{ background: 'var(--m3-error)', color: '#fff' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </IconBtn>

          {/* ── Notification panel ── */}
          <AnimatePresence>
            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
                className="absolute right-0 top-full mt-2 w-96 rounded-2xl z-30
                           overflow-hidden flex flex-col shadow-e3"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(24px) saturate(1.5)',
                  WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
                  border: '1px solid var(--m3-outline-v)',
                  maxHeight: '480px',
                }}
              >
                {/* Panel header */}
                <div
                  className="flex items-center justify-between px-4 py-3 shrink-0"
                  style={{ borderBottom: '1px solid var(--m3-outline-v)' }}
                >
                  <span className="font-semibold text-sm" style={{ color: 'var(--m3-on-surf)' }}>
                    Notifications
                    {unreadCount > 0 && (
                      <span
                        className="ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                        style={{ background: 'var(--m3-error)', color: '#fff' }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs font-medium
                                 px-2 py-1 rounded-lg transition-all"
                      style={{ color: 'var(--m3-primary)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--state-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <CheckCheck size={11} /> Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Bell size={26} style={{ color: 'var(--m3-on-surf-var)', opacity: 0.3 }} />
                      <p className="text-sm" style={{ color: 'var(--m3-on-surf-var)' }}>
                        All caught up
                      </p>
                    </div>
                  ) : (
                    notifications.map((n, i) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.025 }}
                        className="group relative flex gap-3 px-4 py-3 cursor-pointer transition-all duration-100"
                        style={{
                          background: n.read ? 'transparent' : 'color-mix(in srgb, var(--m3-primary) 5%, transparent)',
                          borderBottom: '1px solid var(--m3-outline-v)',
                        }}
                        onClick={() => handleNotifClick(n)}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--state-hover)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : 'color-mix(in srgb, var(--m3-primary) 5%, transparent)'}
                      >
                        {/* Unread dot */}
                        {!n.read && (
                          <span
                            className="absolute left-1.5 top-1/2 -translate-y-1/2
                                       w-1 h-1 rounded-full shrink-0"
                            style={{ background: 'var(--m3-primary)' }}
                          />
                        )}

                        {(() => {
                          const NI = NOTIF_ICONS[n.type] ?? Bell;
                          return (
                            <span
                              className="shrink-0 mt-0.5 grid place-items-center w-7 h-7 rounded-lg"
                              style={{
                                background: 'var(--m3-surf2)',
                                color: NOTIF_TINT[n.type] ?? 'var(--m3-on-surf-var)',
                              }}
                            >
                              <NI size={14} strokeWidth={2} />
                            </span>
                          );
                        })()}

                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs leading-snug"
                            style={{ color: n.read ? 'var(--m3-on-surf-var)' : 'var(--m3-on-surf)' }}
                          >
                            {n.message}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px]" style={{ color: 'var(--m3-on-surf-var)', opacity: 0.55 }}>
                              {new Date(n.createdAt).toLocaleString('en-IN', {
                                dateStyle: 'short', timeStyle: 'short',
                              })}
                            </span>
                            {n.link && <ExternalLink size={9} style={{ color: 'var(--m3-primary)' }} />}
                          </div>
                        </div>

                        {/* Hover actions */}
                        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {!n.read && (
                            <button
                              onClick={e => { e.stopPropagation(); handleMarkRead(n.id); }}
                              className="p-1 rounded-lg"
                              title="Mark read"
                              style={{ color: 'var(--m3-primary)' }}
                              onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = 'var(--state-hover)'}
                              onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = 'transparent'}
                            >
                              <Check size={11} />
                            </button>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(n.id, n.read); }}
                            className="p-1 rounded-lg"
                            title="Dismiss"
                            style={{ color: 'var(--m3-error)' }}
                            onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--m3-error) 10%, transparent)'}
                            onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                            <X size={11} />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Clerk account controls (when Clerk is enabled) ── */}
        {clerkEnabled() && (
          <div className="flex items-center gap-2 ml-1">
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl="/daily"
              afterSelectOrganizationUrl="/daily"
            />
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        )}

        {/* ── Legacy avatar + dropdown (hidden in Clerk mode) ── */}
        {!clerkEnabled() && (
        <div className="relative ml-1">
          <motion.button
            onClick={() => setMenuOpen(v => !v)}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 px-1.5 py-1 rounded-xl transition-all duration-150"
            style={{ color: 'var(--m3-on-surf)' }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--state-hover)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            {/* Avatar ring */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center
                         text-[11px] font-bold shrink-0 ring-1"
              style={{
                background: 'var(--m3-prim-c)',
                color: 'var(--m3-primary)',
                outline: '1.5px solid color-mix(in srgb, var(--m3-primary) 25%, transparent)',
              }}
            >
              {initials}
            </div>
            <div className="hidden sm:flex flex-col leading-none text-left">
              <span className="text-[12px] font-semibold" style={{ color: 'var(--m3-on-surf)' }}>
                {user?.name?.split(' ')[0]}
              </span>
              <span className="text-[9px] capitalize" style={{ color: 'var(--m3-on-surf-var)' }}>
                {user?.role?.toLowerCase()}
              </span>
            </div>
            <motion.span animate={{ rotate: menuOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
              <ChevronDown size={12} style={{ color: 'var(--m3-on-surf-var)' }} />
            </motion.span>
          </motion.button>

          {/* Dropdown */}
          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-e3 z-20 py-2 overflow-hidden"
                  style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(24px) saturate(1.5)',
                    WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
                    border: '1px solid var(--m3-outline-v)',
                  }}
                >
                  {/* User info */}
                  <div className="px-4 py-3 mb-1" style={{ borderBottom: '1px solid var(--m3-outline-v)' }}>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--m3-on-surf)' }}>
                      {user?.name}
                    </p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--m3-on-surf-var)' }}>
                      {user?.email}
                    </p>
                  </div>

                  {[
                    { icon: User,   label: 'Profile',  action: () => setMenuOpen(false), danger: false },
                    { icon: LogOut, label: 'Sign out', action: handleLogout,             danger: true  },
                  ].map(({ icon: Icon, label, action, danger }) => (
                    <motion.button
                      key={label}
                      onClick={() => { action(); setMenuOpen(false); }}
                      whileHover={{ x: 2 }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-100"
                      style={{
                        color: danger ? 'var(--m3-error)' : 'var(--m3-on-surf)',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = danger
                          ? 'color-mix(in srgb, var(--m3-error) 8%, transparent)'
                          : 'var(--state-hover)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <Icon size={14} className="shrink-0" />
                      {label}
                    </motion.button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        )}
      </div>
    </header>
  );
}
