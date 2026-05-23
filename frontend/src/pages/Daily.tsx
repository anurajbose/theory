import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Activity, ShieldAlert, Radio, ChevronRight,
} from 'lucide-react';
import { getTodayLog, getEodStatus, DailyLog } from '../services/dailyLogService';
import { getSignals, type Signal } from '../services/signalService';
import { useAuthStore } from '../store/authStore';
import {
  PageHeader, Section, StatTile, SignalCard, EmptyState, Skeleton, Button,
} from '../components/ui';
import MorningCards       from '../components/daily/MorningCards';
import FocusInput          from '../components/daily/FocusInput';
import JournalInput        from '../components/daily/JournalInput';
import MoodCheckIn         from '../components/daily/MoodCheckIn';
import EodPrompt           from '../components/daily/EodPrompt';
import StandupModal        from '../components/daily/StandupModal';
import AnnouncementBanner  from '../components/daily/AnnouncementBanner';

/* ═══════════════════════════════════════════════════════════════
   DAILY · personal mission control
   The first surface every morning: signals on your radar, your
   focus for today, your follow-ups, your private journal.
   Editorial 2-col layout — work + signals on the left, the
   reflective surface on the right.
   ═══════════════════════════════════════════════════════════════ */

export default function Daily() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [log, setLog] = useState<DailyLog | null>(null);
  const [logLoading, setLogLoading] = useState(true);
  const [eod, setEod] = useState<{ showPrompt: boolean; filled: boolean }>({
    showPrompt: false, filled: false,
  });
  const [showStandup, setShowStandup] = useState(false);

  const [signals, setSignals] = useState<Signal[]>([]);
  const [health, setHealth] = useState<number | null>(null);
  const [critical, setCritical] = useState<number>(0);
  const [signalsLoading, setSignalsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTodayLog().then(setLog).catch(() => null),
      getEodStatus().then(setEod).catch(() => null),
    ]).finally(() => setLogLoading(false));

    getSignals()
      .then((d) => {
        const mine = d.signals.filter(
          (s) => s.scope === 'self' || s.subjectUserId === user?.id,
        );
        setSignals(mine.slice(0, 4));
        setHealth(d.summary.health);
        setCritical(d.summary.bySeverity.critical);
      })
      .catch(() => { setSignals([]); setHealth(100); })
      .finally(() => setSignalsLoading(false));
  }, [user?.id]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <PageHeader
        eyebrow={format(new Date(), 'EEEE · d MMMM').toUpperCase()}
        title={`${greeting}, ${user?.name?.split(' ')[0] ?? 'there'}.`}
        description="What needs your attention today, drawn from how work is actually moving."
        actions={
          <Button variant="filled" icon={Zap} onClick={() => setShowStandup(true)}>
            Generate standup
          </Button>
        }
      />

      <div className="mb-6">
        <AnnouncementBanner />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ─── LEFT · Operational column ─── */}
        <div className="lg:col-span-8 space-y-6">
          <Section
            title="Signals on your radar"
            hint="Acted on these? They'll disappear from here automatically."
            actions={
              <button
                onClick={() => navigate('/signals')}
                className="inline-flex items-center gap-1 text-[12.5px] font-medium"
                style={{ color: 'var(--m3-primary)' }}
              >
                View all <ChevronRight size={13} />
              </button>
            }
          >
            {signalsLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="surface p-4"><Skeleton h={48} /></div>
                ))}
              </div>
            ) : signals.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="All clear on your side"
                description="No signals need your attention right now. THEORY keeps watching."
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
                    icon={Radio}
                    onAction={() => navigate('/signals')}
                    actionLabel="Open"
                  />
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Your focus"
            hint="One sentence on what today is for. Visible to your manager only."
          >
            {logLoading ? (
              <div className="surface p-5"><Skeleton h={88} /></div>
            ) : (
              <FocusInput initial={log?.focusText ?? null} />
            )}
          </Section>

          <Section
            title="Private journal"
            hint="Encrypted and never returned by any API or AI. Yours alone."
          >
            <JournalInput />
          </Section>
        </div>

        {/* ─── RIGHT · At-a-glance column ─── */}
        <div className="lg:col-span-4 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {signalsLoading || health === null ? (
              <>
                <div className="surface p-5"><Skeleton h={56} /></div>
                <div className="surface p-5"><Skeleton h={56} /></div>
              </>
            ) : (
              <>
                <StatTile
                  label="Op. health"
                  value={health}
                  sub="/ 100"
                  icon={Activity}
                  accent
                />
                <StatTile
                  label="Critical"
                  value={critical}
                  icon={ShieldAlert}
                />
              </>
            )}
          </div>

          <Section title="How are you today?">
            {logLoading ? (
              <div className="surface p-5"><Skeleton h={56} /></div>
            ) : (
              <MoodCheckIn initial={log?.moodScore ?? null} />
            )}
          </Section>

          <Section title="This week">
            <MorningCards />
          </Section>

          {eod.showPrompt && <EodPrompt filled={eod.filled} />}
        </div>
      </div>

      {showStandup && <StandupModal onClose={() => setShowStandup(false)} />}
    </motion.div>
  );
}
