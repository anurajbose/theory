import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Radio, ShieldAlert, Clock, AlertOctagon, Activity,
  Users, UserMinus, Gauge, TrendingDown,
  Check, Timer, CheckCircle2, XCircle, ThumbsUp, ThumbsDown,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  PageHeader, StatTile, SignalCard, EmptyState, Skeleton, Section,
} from '../components/ui';
import {
  getSignals, transitionSignal, feedbackSignal,
  type Signal, type SignalResponse, type SignalState,
} from '../services/signalService';

const TYPE_ICON: Record<string, LucideIcon> = {
  blocker_aging:     AlertOctagon,
  sla_breach:        ShieldAlert,
  sla_risk:          Clock,
  followup_overdue:  Clock,
  followup_cluster:  Clock,
  workload_imbalance: Gauge,
  person_silent:     UserMinus,
  person_low_morale: Users,
  momentum:          TrendingDown,
};

type Scope = 'all' | 'self' | 'team' | 'org';

export default function Signals() {
  const [data, setData] = useState<SignalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>('all');
  const navigate = useNavigate();

  const refetch = useCallback(async () => {
    try {
      const d = await getSignals();
      setData(d);
    } catch {
      setData({
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, health: 100 },
        signals: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  const scopes = useMemo(() => {
    const set = new Set(data?.signals.map((s) => s.scope) ?? []);
    const opts: { id: Scope; label: string }[] = [{ id: 'all', label: 'All' }];
    if (set.has('self')) opts.push({ id: 'self', label: 'Mine' });
    if (set.has('team')) opts.push({ id: 'team', label: 'Team' });
    if (set.has('org')) opts.push({ id: 'org', label: 'Organisation' });
    return opts;
  }, [data]);

  const visible = useMemo(
    () => (data?.signals ?? []).filter((s) => scope === 'all' || s.scope === scope),
    [data, scope],
  );

  function act(s: Signal) {
    if (s.type.startsWith('followup')) navigate('/follow-ups');
    else if (s.type === 'person_silent' || s.type === 'person_low_morale' || s.type === 'workload_imbalance')
      navigate('/manager');
    else navigate('/board');
  }

  const sum = data?.summary;

  return (
    <div>
      <PageHeader
        eyebrow="Operational intelligence"
        title="Signals"
        icon={Radio}
        description="What needs your attention right now — detected from how work actually moves, never manually gathered."
      />

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {loading || !sum ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface p-5"><Skeleton h={56} /></div>
          ))
        ) : (
          <>
            <StatTile
              label="Operational health"
              value={`${sum.health}`}
              sub="/ 100"
              icon={Activity}
              accent
            />
            <StatTile label="Critical" value={sum.bySeverity.critical} icon={ShieldAlert} />
            <StatTile label="High" value={sum.bySeverity.high} icon={AlertOctagon} />
            <StatTile label="Total signals" value={sum.total} icon={Radio} />
          </>
        )}
      </div>

      {/* Scope filter */}
      {scopes.length > 1 && (
        <div className="flex items-center gap-1.5 mb-5">
          {scopes.map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors"
              style={{
                color: scope === s.id ? 'var(--m3-primary)' : 'var(--m3-on-surf-var)',
                background: scope === s.id ? 'var(--m3-prim-c)' : 'transparent',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <Section>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface p-4"><Skeleton h={48} /></div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="All clear"
            description="No signals need attention in this scope. THEORY keeps watching — you'll see something here the moment work starts to drift."
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
            className="space-y-3"
          >
            {visible.map((s) => (
              <SignalRow key={s.id} signal={s} onAct={() => act(s)} onMutated={refetch} />
            ))}
          </motion.div>
        )}
      </Section>
    </div>
  );
}

/* ─── SignalRow — SignalCard + lifecycle action strip ────────────── */
function SignalRow({
  signal, onAct, onMutated,
}: {
  signal: Signal;
  onAct: () => void;
  onMutated: () => void;
}) {
  const [busy, setBusy] = useState<SignalState | 'FB' | null>(null);
  const lifecycle = signal.lifecycle?.state ?? 'OPEN';
  const fb = signal.lifecycle?.feedback ?? 0;

  async function transition(state: SignalState, label: string, opts: { snoozedUntil?: string } = {}) {
    setBusy(state);
    try {
      await transitionSignal(signal.id, state, opts);
      toast.success(label);
      onMutated();
    } catch {
      toast.error(`Could not ${label.toLowerCase()}`);
    } finally {
      setBusy(null);
    }
  }

  async function thumb(v: -1 | 1) {
    setBusy('FB');
    try {
      await feedbackSignal(signal.id, fb === v ? 0 : v);
      onMutated();
    } catch { /* silent */ }
    finally { setBusy(null); }
  }

  const Icon = TYPE_ICON[signal.type] ?? Radio;
  const snoozed = lifecycle === 'SNOOZED';
  const acked = lifecycle === 'ACK';

  return (
    <div
      className="surface lift overflow-hidden"
      style={snoozed ? { opacity: 0.55 } : undefined}
    >
      <SignalCard
        severity={signal.severity}
        title={signal.title}
        body={signal.body}
        meta={`${signal.meta}${signal.scope !== 'self' ? ` · ${signal.scope}` : ''}${acked ? ' · acknowledged' : ''}`}
        icon={Icon}
        onAction={onAct}
        actionLabel="Open"
      />

      <div
        className="flex items-center justify-between px-4 h-11"
        style={{ borderTop: '1px solid var(--m3-outline-v)', background: 'var(--elevated)' }}
      >
        <div className="flex items-center gap-1.5">
          <LifeBtn
            icon={Check}
            label="Ack"
            active={acked}
            disabled={busy !== null}
            onClick={() => transition('ACK', 'Acknowledged')}
          />
          <LifeBtn
            icon={Timer}
            label="Snooze 24h"
            disabled={busy !== null}
            onClick={() =>
              transition('SNOOZED', 'Snoozed 24h', {
                snoozedUntil: new Date(Date.now() + 86_400_000).toISOString(),
              })
            }
          />
          <LifeBtn
            icon={CheckCircle2}
            label="Resolve"
            disabled={busy !== null}
            onClick={() => transition('RESOLVED', 'Resolved')}
          />
          <LifeBtn
            icon={XCircle}
            label="Dismiss"
            disabled={busy !== null}
            onClick={() => transition('DISMISSED', 'Dismissed')}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: 'var(--m3-on-surf-var)' }}>
            Useful?
          </span>
          <FbBtn icon={ThumbsUp}   active={fb === 1}  onClick={() => thumb(1)}  />
          <FbBtn icon={ThumbsDown} active={fb === -1} onClick={() => thumb(-1)} />
        </div>
      </div>
    </div>
  );
}

function LifeBtn({
  icon: Icon, label, active, disabled, onClick,
}: {
  icon: LucideIcon; label: string; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors disabled:opacity-40"
      style={{
        color: active ? 'var(--m3-primary)' : 'var(--m3-on-surf-var)',
        background: active ? 'var(--m3-prim-c)' : 'transparent',
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function FbBtn({
  icon: Icon, active, onClick,
}: { icon: LucideIcon; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid place-items-center w-7 h-7 rounded-md transition-colors"
      style={{
        color: active ? 'var(--m3-primary)' : 'var(--m3-on-surf-var)',
        background: active ? 'var(--m3-prim-c)' : 'transparent',
      }}
    >
      <Icon size={13} />
    </button>
  );
}
