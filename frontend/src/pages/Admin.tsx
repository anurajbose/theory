import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Building2, Shield, BarChart2, RefreshCw, Search,
  CheckCircle, XCircle, ChevronDown, AlertCircle, FileText,
} from 'lucide-react';
import {
  fetchAdminStats, fetchAdminUsers, updateAdminUser, fetchAuditLogs, fetchAdminTeams,
  type AdminUser, type AdminStats, type AuditLogEntry, type AdminTeam,
} from '../services/adminService';
import toast from 'react-hot-toast';

/* ── helpers ─────────────────────────────────────────────────────────── */
const ROLES = ['EMPLOYEE', 'MANAGER', 'LEADERSHIP', 'ADMIN'];
const ROLE_COLORS: Record<string, string> = {
  EMPLOYEE:   '#6366f1',
  MANAGER:    '#0ea5e9',
  LEADERSHIP: '#a855f7',
  ADMIN:      '#ef4444',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: `color-mix(in srgb, ${ROLE_COLORS[role] ?? '#64748b'} 15%, transparent)`, color: ROLE_COLORS[role] ?? '#64748b' }}
    >
      {role}
    </span>
  );
}

type Tab = 'overview' | 'users' | 'teams' | 'audit';

/* ── Stat tile ─────────────────────────────────────────────────────────── */
function StatTile({ icon: Icon, label, value, accent }:
  { icon: React.ElementType; label: string; value: string | number; accent?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)' }}
    >
      <Icon size={16} style={{ color: accent ?? 'var(--m3-primary)' }} />
      <p className="text-2xl font-bold" style={{ color: accent ?? 'var(--m3-on-surf)' }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--m3-on-surf-var)' }}>{label}</p>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const [tab, setTab]           = useState<Tab>('overview');
  const [stats, setStats]       = useState<AdminStats | null>(null);
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [teams, setTeams]       = useState<AdminTeam[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving]     = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, u, t, a] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAdminTeams(),
        fetchAuditLogs(),
      ]);
      setStats(s);
      setUsers(u.users);
      setTeams(t);
      setAuditLogs(a);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleToggleActive(user: AdminUser) {
    try {
      await updateAdminUser(user.id, { active: !user.active });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !u.active } : u));
      toast.success(`User ${user.active ? 'deactivated' : 'activated'}`);
    } catch { toast.error('Failed to update user'); }
  }

  async function handleSaveRole() {
    if (!editingUser || !editRole) return;
    setSaving(true);
    try {
      const updated = await updateAdminUser(editingUser.id, { role: editRole });
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, role: updated.role } : u));
      setEditingUser(null);
      toast.success('Role updated');
    } catch { toast.error('Failed to update role'); }
    finally { setSaving(false); }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
            <RefreshCw size={24} style={{ color: 'var(--m3-primary)' }} />
          </motion.div>
          <p className="text-sm" style={{ color: 'var(--m3-on-surf-var)' }}>Loading admin data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--m3-outline-v)' }}
      >
        <div>
          <h2 className="font-semibold text-base" style={{ color: 'var(--m3-on-surf)' }}>Admin Panel</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--m3-on-surf-var)' }}>
            {stats?.totalUsers ?? '—'} users · {stats?.totalTeams ?? '—'} teams
          </p>
        </div>
        <motion.button
          onClick={loadAll}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{ background: 'var(--m3-surf3)', color: 'var(--m3-on-surf)' }}
        >
          <RefreshCw size={12} />Refresh
        </motion.button>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 px-6 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--m3-outline-v)' }}
      >
        {([
          { id: 'overview', label: 'Overview',   icon: BarChart2 },
          { id: 'users',    label: 'Users',      icon: Users },
          { id: 'teams',    label: 'Teams',      icon: Building2 },
          { id: 'audit',    label: 'Audit Log',  icon: FileText },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{
              background: tab === id ? 'var(--m3-primary)' : 'transparent',
              color: tab === id ? 'var(--m3-on-primary)' : 'var(--m3-on-surf-var)',
            }}
          >
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && stats && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile icon={Users}     label="Total users"       value={stats.totalUsers} />
                <StatTile icon={CheckCircle} label="Active users"    value={stats.activeUsers} accent="#22c55e" />
                <StatTile icon={Building2} label="Teams"             value={stats.totalTeams} />
                <StatTile icon={BarChart2} label="Work items"        value={stats.totalWorkItems} />
                <StatTile icon={AlertCircle} label="Open blockers"   value={stats.openBlockers} accent={stats.openBlockers > 0 ? '#ef4444' : '#22c55e'} />
                <StatTile icon={Shield}    label="Pending follow-ups" value={stats.pendingFollowUps} accent={stats.pendingFollowUps > 0 ? '#f59e0b' : '#22c55e'} />
                <StatTile icon={FileText}  label="KB articles"       value={stats.kbArticles} />
                <StatTile icon={BarChart2} label="Time logs this wk" value={stats.weeklyTimeLogs} />
              </div>

              {/* Role breakdown */}
              <div className="rounded-2xl p-5" style={{ background: 'var(--m3-surf1)', border: '1px solid var(--m3-outline-v)' }}>
                <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--m3-on-surf)' }}>Role Distribution</h3>
                <div className="space-y-2">
                  {ROLES.map(role => {
                    const count = users.filter(u => u.role === role).length;
                    const pct = users.length > 0 ? (count / users.length) * 100 : 0;
                    return (
                      <div key={role}>
                        <div className="flex items-center justify-between mb-1">
                          <RoleBadge role={role} />
                          <span className="text-xs" style={{ color: 'var(--m3-on-surf-var)' }}>{count} user{count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--m3-surf4)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.1, ease: [0.2, 0, 0, 1] }}
                            className="h-full rounded-full"
                            style={{ background: ROLE_COLORS[role] ?? '#64748b' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── USERS TAB ── */}
          {tab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)', maxWidth: '360px' }}>
                <Search size={13} style={{ color: 'var(--m3-on-surf-var)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" className="flex-1 bg-transparent text-xs outline-none" style={{ color: 'var(--m3-on-surf)' }} />
              </div>

              {/* User table */}
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--m3-outline-v)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--m3-surf2)', borderBottom: '1px solid var(--m3-outline-v)' }}>
                      {['Name', 'Email', 'Role', 'Job Role', 'Team', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--m3-on-surf-var)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        style={{ borderBottom: '1px solid var(--m3-outline-v)', background: 'var(--m3-surf1)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--state-hover)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--m3-surf1)'}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ background: 'var(--m3-prim-c)', color: 'var(--m3-on-prim-c)' }}
                            >
                              {u.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <span className="font-medium" style={{ color: 'var(--m3-on-surf)' }}>{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--m3-on-surf-var)' }}>{u.email}</td>
                        <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3" style={{ color: 'var(--m3-on-surf-var)' }}>{u.jobRole}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--m3-on-surf-var)' }}>{u.team?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1" style={{ color: u.active ? '#22c55e' : '#ef4444' }}>
                            {u.active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {u.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {/* Role editor */}
                            <div className="relative">
                              <button
                                onClick={() => { setEditingUser(u); setEditRole(u.role); }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all"
                                style={{ background: 'var(--m3-surf3)', color: 'var(--m3-on-surf)' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--state-hover)'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--m3-surf3)'}
                              >
                                <Shield size={9} />Role <ChevronDown size={9} />
                              </button>
                            </div>
                            {/* Active toggle */}
                            <button
                              onClick={() => handleToggleActive(u)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all"
                              style={{
                                background: u.active ? 'color-mix(in srgb, #ef4444 10%, transparent)' : 'color-mix(in srgb, #22c55e 10%, transparent)',
                                color: u.active ? '#ef4444' : '#22c55e',
                              }}
                            >
                              {u.active ? <><XCircle size={9} />Deactivate</> : <><CheckCircle size={9} />Activate</>}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ── TEAMS TAB ── */}
          {tab === 'teams' && (
            <motion.div key="teams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {teams.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-2xl p-4"
                    style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--m3-on-surf)' }}>{t.name}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--m3-on-surf-var)' }}>
                          {[t.deptName, t.buName].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full"
                        style={{ background: 'var(--m3-prim-c)', color: 'var(--m3-on-prim-c)' }}
                      >
                        {t.memberCount}
                      </span>
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--m3-on-surf-var)' }}>
                      Manager: {t.managerName ?? 'Unassigned'}
                    </p>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--m3-surf4)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, t.memberCount * 20)}%`, background: 'var(--m3-primary)' }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── AUDIT LOG TAB ── */}
          {tab === 'audit' && (
            <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--m3-outline-v)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--m3-surf2)', borderBottom: '1px solid var(--m3-outline-v)' }}>
                      {['Timestamp', 'User', 'Action', 'Entity'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--m3-on-surf-var)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, i) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        style={{ borderBottom: '1px solid var(--m3-outline-v)', background: 'var(--m3-surf1)' }}
                      >
                        <td className="px-4 py-2.5" style={{ color: 'var(--m3-on-surf-var)' }}>
                          {new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--m3-on-surf)' }}>
                          {log.user?.name ?? 'System'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="px-2 py-0.5 rounded text-[9px] font-semibold"
                            style={{
                              background: log.action === 'CREATE' ? 'color-mix(in srgb, #22c55e 15%, transparent)'
                                : log.action === 'DELETE' ? 'color-mix(in srgb, #ef4444 15%, transparent)'
                                : log.action === 'UPDATE' ? 'color-mix(in srgb, #f59e0b 15%, transparent)'
                                : 'var(--m3-surf4)',
                              color: log.action === 'CREATE' ? '#22c55e'
                                : log.action === 'DELETE' ? '#ef4444'
                                : log.action === 'UPDATE' ? '#f59e0b'
                                : 'var(--m3-on-surf-var)',
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--m3-on-surf-var)' }}>
                          {log.entity} {log.entityId ? `#${log.entityId.slice(0, 8)}…` : ''}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {auditLogs.length === 0 && (
                  <p className="text-center py-8 text-sm" style={{ color: 'var(--m3-on-surf-var)' }}>No audit logs yet</p>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Role editor modal */}
      <AnimatePresence>
        {editingUser && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed inset-x-0 top-1/2 -translate-y-1/2 z-50 mx-auto w-full max-w-sm rounded-2xl shadow-e4 p-6"
              style={{ background: 'var(--m3-surf4)', border: '1px solid var(--m3-outline-v)' }}
            >
              <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--m3-on-surf)' }}>Change Role</h3>
              <p className="text-xs mb-4" style={{ color: 'var(--m3-on-surf-var)' }}>{editingUser.name} · {editingUser.email}</p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {ROLES.map(r => (
                  <button
                    key={r}
                    onClick={() => setEditRole(r)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: editRole === r ? ROLE_COLORS[r] : 'var(--m3-surf3)',
                      color: editRole === r ? '#fff' : 'var(--m3-on-surf)',
                    }}
                  >
                    <Shield size={12} />{r}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingUser(null)} className="flex-1 py-2 rounded-xl text-sm" style={{ background: 'var(--m3-surf3)', color: 'var(--m3-on-surf)' }}>Cancel</button>
                <motion.button
                  onClick={handleSaveRole} disabled={saving || editRole === editingUser.role}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--m3-primary)', color: 'var(--m3-on-primary)', opacity: saving || editRole === editingUser.role ? 0.5 : 1 }}
                >
                  {saving ? 'Saving…' : 'Save Role'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
