import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radio, Activity, ShieldAlert, AlertOctagon, Users, Gauge,
  TrendingUp, type LucideIcon,
} from 'lucide-react';
import {
  PageHeader, Section, StatTile, SignalCard, EmptyState, Skeleton, DataTable,
  type Column,
} from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { getSignals, type Signal } from '../services/signalService';
import {
  fetchManagerOverview, fetchManagerWorkItems, fetchManagerBlockers,
  type ManagerOverview, type MemberWorkItems, type BlockerItem,
} from '../services/managerService';
import {
  fetchOrgOverview, fetchOrgTeamSignals, fetchOrgBlockers,
  type OrgOverview, type TeamSignalRow, type OrgBlocker,
} from '../services/leadershipService';

/* ═══════════════════════════════════════════════════════════════
   INTELLIGENCE · one role-adaptive operational surface.
   Replaces three overlapping pages (Manager · Org Pulse · Reports)
   with one credible view that adapts to scope:
     · MANAGER       → Team
     · LEADERSHIP    → Organisation (+ optional Team if they manage)
     · ADMIN        → Organisation
   All metrics are read-models from existing endpoints; signals
   come from the live engine; nothing is invented or fabricated.
   ═══════════════════════════════════════════════════════════════ */

type Scope = 'team' | 'org';

const TYPE_ICON: Record<string, LucideIcon> = {
  blocker_aging:      AlertOctagon,
  sla_breach:         ShieldAlert,
  sla_risk:           ShieldAlert,
  followup_overdue:   AlertOctagon,
  followup_cluster:   AlertOctagon,
  workload_imbalance: Gauge,
  person_silent:      Users,
  person_low_morale:  Users,
  momentum:           TrendingUp,
};

export default function Intelligence() {
  const role = useAuthStore((s) => s.user?.role);
  const navigate = useNavigate();

  const canOrg = role === 'LEADERSHIP' || role === 'ADMIN';
  const canTeam = role === 'MANAGER' || role === 'LEADERSHIP' || role === 'ADMIN';
  const defaultScope: Scope = canOrg ? 'org' : 'team';
  const [scope, setScope] = useState<Scope>(defaultScope);

  /* ── signals (always; engine filters by role server-side) ── */
  const [signals, setSignals] = useState<Signal[]>([]);
  const [health, setHealth] = useState<number>(100);

  /* ── team scope datasets ── */
  const [mgrOv, setMgrOv] = useState<ManagerOverview | null>(null);
  const [mgrWork, setMgrWork] = useState<MemberWorkItems[]>([]);
  const [mgrBlockers, setMgrBlockers] = useState<BlockerItem[]>([]);

  /* ── org scope datasets ── */
  const [orgOv, setOrgOv] = useState<OrgOverview | null>(null);
  const [orgTeams, setOrgTeams] = useState<TeamSignalRow[]>([]);
  const [orgBlockers, setOrgBlockers] = useState<OrgBlocker[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    const signalsP = getSignals()
      .then((d) => {
        if (!alive) return;
        const scoped = d.signals.filter((s) =>
          scope === 'org' ? s.scope === 'org' || s.scope === 'team' : s.scope === 'team' || s.scope === 'self',
        );
        setSignals(scoped.slice(0, 6));
        setHealth(d.summary.health);
      })
      .catch(() => { setSignals([]); setHealth(100); });

    const dataP =
      scope === 'team'
        ? Promise.all([
            fetchManagerOverview().then(setMgrOv).catch(() => null),
            fetchManagerWorkItems().then(setMgrWork).catch(() => null),
            fetchManagerBlockers().then(setMgrBlockers).catch(() => null),
          ])
        : Promise.all([
            fetchOrgOverview().then(setOrgOv).catch(() => null),
            fetchOrgTeamSignals().then(setOrgTeams).catch(() => null),
            fetchOrgBlockers().then(setOrgBlockers).catch(() => null),
          ]);

    Promise.all([signalsP, dataP]).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [scope]);

  /* ── headline tiles, scope-adaptive ── */
  const tiles = useMemo(() => {
    if (scope === 'team') {
      return [
        { label: 'Op. health',    value: mgrOv?.healthScore ?? '—', icon: Activity,    accent: true, sub: '/ 100' },
        { label: 'Blockers',      value: mgrOv?.blockers ?? 0,       icon: AlertOctagon },
        { label: 'SLA compliance', value: `${mgrOv?.slaCompliance ?? 0}%`, icon: ShieldAlert },
        { label: 'Overdue F/Us',   value: mgrOv?.overdueFollowUps ?? 0, icon: Gauge },
      ];
    }
    return [
      { label: 'Op. health',     value: health,                    icon: Activity, accent: true, sub: '/ 100' },
      { label: 'Active people',  value: orgOv?.userCount ?? 0,     icon: Users },
      { label: 'Open blockers',  value: orgOv?.blockers ?? 0,      icon: AlertOctagon },
      { label: 'SLA compliance', value: `${orgOv?.slaCompliance ?? 0}%`, icon: ShieldAlert },
    ];
  }, [scope, mgrOv, orgOv, health]);

  /* ── workload / teams column definitions ── */
  type MemberRow = MemberWorkItems & { id: string };
  const teamCols: Column<MemberRow>[] = [
    { key: 'name',       header: 'Member', sortValue: (r) => r.name },
    { key: 'todo',       header: 'To do',       align: 'right', sortValue: (r) => r.todo },
    { key: 'inProgress', header: 'In progress', align: 'right', sortValue: (r) => r.inProgress },
    { key: 'blocked',    header: 'Blocked',     align: 'right',
      sortValue: (r) => r.blocked,
      render: (r) => (
        <span style={{ color: r.blocked > 0 ? 'var(--m3-error)' : undefined }}>{r.blocked}</span>
      ),
    },
    { key: 'total',      header: 'Total open',  align: 'right', sortValue: (r) => r.total },
  ];
  const teamRows: MemberRow[] = mgrWork.map((r) => ({ ...r, id: r.userId }));

  const orgCols: Column<TeamSignalRow>[] = [
    { key: 'name', header: 'Team',
      render: (r) => (
        <div>
          <div style={{ color: 'var(--m3-on-surf)', fontWeight: 500 }}>{r.name}</div>
          <div className="text-[11px]" style={{ color: 'var(--m3-on-surf-var)' }}>
            {r.dept?.name ?? '—'} · {r._count.members} member{r._count.members === 1 ? '' : 's'}
          </div>
        </div>
      ),
    },
    { key: 'manager', header: 'Manager',
      render: (r) => r.manager?.name ?? <span style={{ opacity: 0.5 }}>—</span> },
    { key: 'health', header: 'Health', align: 'right',
      sortValue: (r) => r.signal?.healthScore ?? 0,
      render: (r) => <HealthChip score={r.signal?.healthScore ?? null} /> },
    { key: 'blockers', header: 'Blockers', align: 'right',
      sortValue: (r) => r.signal?.blockerCount ?? 0,
      render: (r) => <span>{r.signal?.blockerCount ?? 0}</span> },
    { key: 'sla', header: 'SLA', align: 'right',
      sortValue: (r) => r.signal?.slaCompliance ?? 0,
      render: (r) => <span>{r.signal ? `${Math.round(r.signal.slaCompliance)}%` : '—'}</span> },
  ];

  const blockerColsTeam: Column<BlockerItem>[] = [
    { key: 'title',      header: 'Item' },
    { key: 'memberName', header: 'Owner' },
    { key: 'priority',   header: 'Priority', width: 88,
      render: (r) => <span className="text-eyebrow">{r.priority}</span> },
    { key: 'blockedDays', header: 'Blocked', align: 'right',
      sortValue: (r) => r.blockedDays,
      render: (r) => <span>{r.blockedDays}d</span> },
  ];

  const blockerColsOrg: Column<OrgBlocker>[] = [
    { key: 'title',    header: 'Item' },
    { key: 'owner',    header: 'Owner',
      render: (r) => (r as unknown as { user?: { name?: string } }).user?.name ?? '—' },
    { key: 'priority', header: 'Priority', width: 88,
      render: (r) => <span className="text-eyebrow">{r.priority}</span> },
    { key: 'days',     header: 'Blocked', align: 'right',
      sortValue: (r) => (r as unknown as { blockedDays?: number }).blockedDays ?? 0,
      render: (r) =>
        <span>{(r as unknown as { blockedDays?: number }).blockedDays ?? 0}d</span> },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={scope === 'team' ? 'Team intelligence' : 'Organisation intelligence'}
        title={scope === 'team' ? 'Team intelligence' : 'Organisation intelligence'}
        icon={Radio}
        description={
          scope === 'team'
            ? 'Workload, blockers and signals across the people you manage — derived from how work is actually moving.'
            : 'Operational health across the organisation — teams, blockers, compliance and the signals behind them.'
        }
        actions={
          canOrg && canTeam ? (
            <div className="flex items-center gap-1.5">
              <ScopeTab active={scope === 'team'} onClick={() => setScope('team')}>Team</ScopeTab>
              <ScopeTab active={scope === 'org'}  onClick={() => setScope('org')}>Organisation</ScopeTab>
            </div>
          ) : null
        }
      />

      {/* ─── Headline tiles ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface p-5"><Skeleton h={56} /></div>
          ))
        ) : (
          tiles.map((t) => (
            <StatTile
              key={t.label}
              label={t.label}
              value={t.value}
              icon={t.icon}
              accent={(t as { accent?: boolean }).accent}
              sub={(t as { sub?: string }).sub}
            />
          ))
        )}
      </div>

      {/* ─── Signals ─── */}
      <Section
        title="Signals on this scope"
        actions={
          <button
            onClick={() => navigate('/signals')}
            className="text-[12.5px] font-medium"
            style={{ color: 'var(--m3-primary)' }}
          >
            All signals →
          </button>
        }
      >
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="surface p-4"><Skeleton h={48} /></div>
            ))}
          </div>
        ) : signals.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="All clear"
            description="No signals need attention in this scope right now."
          />
        ) : (
          <div className="space-y-3">
            {signals.map((s) => (
              <SignalCard
                key={s.id}
                severity={s.severity}
                title={s.title}
                body={s.body}
                meta={s.meta}
                icon={TYPE_ICON[s.type] ?? Radio}
                onAction={() => navigate('/signals')}
                actionLabel="Open"
              />
            ))}
          </div>
        )}
      </Section>

      {/* ─── Workload / Teams ─── */}
      <Section title={scope === 'team' ? 'Workload by member' : 'Teams'}>
        {loading ? (
          <div className="surface p-5"><Skeleton h={120} /></div>
        ) : scope === 'team' ? (
          <DataTable
            columns={teamCols}
            rows={teamRows}
            searchKeys={['name']}
            emptyTitle="No people in your team yet"
          />
        ) : (
          <DataTable
            columns={orgCols}
            rows={orgTeams.map((t) => ({ ...t, id: t.id }))}
            searchKeys={['name']}
            emptyTitle="No teams configured yet"
          />
        )}
      </Section>

      {/* ─── Blockers ─── */}
      <Section title="Open blockers" hint="Aging blockers are the strongest predictor of slip.">
        {loading ? (
          <div className="surface p-5"><Skeleton h={120} /></div>
        ) : scope === 'team' ? (
          <DataTable
            columns={blockerColsTeam}
            rows={mgrBlockers}
            searchKeys={['title', 'memberName']}
            emptyTitle="No blockers right now"
          />
        ) : (
          <DataTable
            columns={blockerColsOrg}
            rows={orgBlockers.map((b) => ({ ...b, id: b.id }))}
            searchKeys={['title']}
            emptyTitle="No blockers across the organisation"
          />
        )}
      </Section>
    </div>
  );
}

/* ─── Helpers ─── */

function ScopeTab({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors"
      style={{
        color: active ? 'var(--m3-primary)' : 'var(--m3-on-surf-var)',
        background: active ? 'var(--m3-prim-c)' : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

function HealthChip({ score }: { score: number | null }) {
  if (score == null) return <span style={{ color: 'var(--m3-on-surf-var)' }}>—</span>;
  const fg =
    score >= 80 ? 'var(--m3-success)' :
    score >= 60 ? 'var(--m3-warning)' :
    'var(--m3-error)';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: fg }} />
      <span style={{ color: fg, fontFeatureSettings: '"tnum"' }}>{score}</span>
    </span>
  );
}
