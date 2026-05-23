import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Building2, Zap, Check, Loader2, ShieldCheck, ArrowUpRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, Section } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { getEntitlements, upgrade, type Plan } from '../services/billingService';

/* ═══════════════════════════════════════════════════════════════
   UPGRADE / PLAN
   THEORY is in founder-led launch: every paid tier is unlocked for
   $0 today, so this surface lets a workspace admin "switch tier"
   (which is currently a no-op cost-wise) and see what the list
   price will be once launch ends. No bait-and-switch — value
   anchor visible, price stamp honest.
   ═══════════════════════════════════════════════════════════════ */

const ease = [0.16, 1, 0.3, 1] as const;

interface TierCard {
  plan: Plan;
  name: string;
  icon: typeof Zap;
  listPrice: string;
  listSuffix?: string;
  tagline: string;
  feats: string[];
  highlight?: boolean;
}

const TIERS: TierCard[] = [
  {
    plan: 'FREE',
    name: 'Starter',
    icon: Zap,
    listPrice: '$0',
    listSuffix: 'forever',
    tagline: 'Up to 10 seats · stays free',
    feats: [
      'Daily mission control',
      'Signal engine + lifecycle',
      'Email + Google sign-in',
    ],
  },
  {
    plan: 'PRO',
    name: 'Growth',
    icon: Sparkles,
    listPrice: '$19',
    listSuffix: '/seat / month',
    tagline: 'What most teams want',
    highlight: true,
    feats: [
      'Everything in Starter',
      'AI digests + blocker triage',
      'Manager + leadership Intelligence',
      'Advanced search · exports',
      'Slack delivery (when shipped)',
    ],
  },
  {
    plan: 'ENTERPRISE',
    name: 'Enterprise',
    icon: Building2,
    listPrice: 'Custom',
    tagline: 'For regulated organisations',
    feats: [
      'Everything in Growth',
      'SSO + SCIM provisioning',
      'Audit explorer + retention',
      'Dedicated cluster (opt-in)',
      'DPA · SOC 2 · custom roles',
    ],
  },
];

const RANK: Record<Plan, number> = { FREE: 0, PRO: 1, ENTERPRISE: 2 };

export default function Upgrade() {
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'ADMIN';

  const [current, setCurrent] = useState<Plan>('FREE');
  const [busy, setBusy] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEntitlements()
      .then((e) => setCurrent(e.plan))
      .catch(() => setCurrent('FREE'))
      .finally(() => setLoading(false));
  }, []);

  async function choose(plan: Plan) {
    if (plan === 'ENTERPRISE') {
      window.location.href = 'mailto:founders@theory.in?subject=THEORY Enterprise';
      return;
    }
    if (!isAdmin) {
      toast.error('Only a workspace admin can change the plan.');
      return;
    }
    setBusy(plan);
    try {
      const r = await upgrade(plan);
      if (r.mode === 'checkout' && r.checkoutUrl) {
        window.location.href = r.checkoutUrl;
        return;
      }
      toast.success(`Switched to ${plan}. (Free during launch.)`);
      setCurrent(plan);
    } catch {
      toast.error('Could not change the plan. Try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace plan"
        title="Pick your tier."
        icon={Sparkles}
        description={
          'Every paid tier is unlocked for $0 during founder-led launch. ' +
          'Choose the one that fits — the price you see is what it will sell at when launch ends.'
        }
      />

      <Section>
        <div className="grid gap-5 lg:grid-cols-3">
          {TIERS.map((t, i) => {
            const isCurrent = t.plan === current;
            const isDown = RANK[t.plan] < RANK[current];
            const Icon = t.icon;
            return (
              <motion.div
                key={t.plan}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.06, ease }}
                className="surface surface-lit p-6 flex flex-col"
                style={
                  t.highlight
                    ? { borderColor: 'color-mix(in srgb, var(--m3-primary) 45%, var(--m3-outline-v))' }
                    : undefined
                }
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="grid place-items-center w-9 h-9 rounded-xl"
                    style={{ background: 'var(--m3-prim-c)', color: 'var(--m3-primary)' }}
                  >
                    <Icon size={17} />
                  </span>
                  <div className="flex items-center gap-1.5">
                    {t.highlight && (
                      <span
                        className="text-eyebrow px-1.5 py-0.5 rounded-md"
                        style={{ background: 'var(--m3-prim-c)', color: 'var(--m3-primary)', fontSize: 10 }}
                      >
                        Most popular
                      </span>
                    )}
                    {isCurrent && (
                      <span
                        className="text-eyebrow"
                        style={{ color: 'var(--m3-primary)', fontSize: 10 }}
                      >
                        Current
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-[18px] font-semibold" style={{ color: 'var(--m3-on-surf)' }}>
                  {t.name}
                </h3>

                <div className="mt-2">
                  {t.plan === 'FREE' ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-metric" style={{ color: 'var(--m3-on-surf)' }}>{t.listPrice}</span>
                      <span className="text-[12px]" style={{ color: 'var(--m3-on-surf-var)' }}>{t.listSuffix}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className="text-[24px] font-semibold tracking-tight line-through"
                          style={{ color: 'var(--m3-on-surf-var)', opacity: 0.55 }}
                        >
                          {t.listPrice}
                        </span>
                        {t.listSuffix && (
                          <span
                            className="text-[12px] line-through"
                            style={{ color: 'var(--m3-on-surf-var)', opacity: 0.45 }}
                          >
                            {t.listSuffix}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-metric" style={{ color: 'var(--m3-on-surf)' }}>$0</span>
                        <span
                          className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md"
                          style={{
                            letterSpacing: '0.14em',
                            color: 'var(--m3-primary)',
                            background: 'var(--m3-prim-c)',
                          }}
                        >
                          Free during launch
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-[12.5px] mt-2 mb-5" style={{ color: 'var(--m3-on-surf-var)' }}>
                  {t.tagline}
                </p>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {t.feats.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--m3-on-surf)' }}>
                      <Check size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--m3-secondary)' }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent || isDown || loading || busy !== null}
                  onClick={() => choose(t.plan)}
                  className={t.highlight && !isCurrent ? 'btn-filled w-full' : 'btn-outlined w-full'}
                >
                  {busy === t.plan ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : isCurrent ? (
                    'Current plan'
                  ) : isDown ? (
                    'Included in current plan'
                  ) : t.plan === 'ENTERPRISE' ? (
                    'Talk to founders'
                  ) : (
                    `Switch to ${t.name}`
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {!isAdmin && (
          <p className="text-[12.5px] mt-5 text-center" style={{ color: 'var(--m3-on-surf-var)' }}>
            Only a workspace admin can change the plan.
          </p>
        )}

        <a
          href="/security"
          className="mt-8 surface lift block p-5 flex items-start gap-4"
          style={{ textDecoration: 'none' }}
        >
          <span
            className="grid place-items-center w-10 h-10 rounded-xl shrink-0"
            style={{ background: 'color-mix(in srgb, var(--m3-success) 14%, transparent)', color: 'var(--m3-success)' }}
          >
            <ShieldCheck size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold" style={{ color: 'var(--m3-on-surf)' }}>
              Why your org can trust THEORY with its data
            </p>
            <p className="text-[12.5px] mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>
              Multi-tenant isolation, encryption at rest, audit log on every
              privileged action, SSO/MFA, brute-force protection.
              <span className="inline-flex items-center gap-1 ml-1" style={{ color: 'var(--m3-primary)' }}>
                Read the Security page <ArrowUpRight size={12} />
              </span>
            </p>
          </div>
        </a>
      </Section>
    </div>
  );
}
