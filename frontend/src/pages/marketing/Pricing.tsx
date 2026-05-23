import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Check, ChevronDown, Sparkles, Building2, Zap,
  ShieldCheck,
} from 'lucide-react';
import { useBranding } from '../../theme/ThemeProvider';

/* ═══════════════════════════════════════════════════════════════
   PRICING — anchored 3-tier ladder, free during launch.
   The price is real and credible. The "Free during launch" stamp
   means every workspace pays $0 today; the value anchor stays so
   the eventual switch to paid is honest, not a bait-and-switch.
   ═══════════════════════════════════════════════════════════════ */

const ease = [0.16, 1, 0.3, 1] as const;
const rise = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number = 0) => ({
    opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.08, ease },
  }),
};

const TIERS = [
  {
    plan: 'Starter',
    icon: Zap,
    listPrice: '$0',
    period: 'forever',
    note: 'For teams of up to 10. Free, always.',
    cta: 'Start a workspace',
    feats: [
      'Daily mission control + signal engine',
      'Signal lifecycle (ack · snooze · resolve)',
      'Up to 10 seats',
      'Email + Google sign-in',
      'Community support',
    ],
    accent: false,
  },
  {
    plan: 'Growth',
    icon: Sparkles,
    listPrice: '$19',
    listSuffix: '/seat / month',
    period: 'billed per organisation',
    note: 'What most teams want. Free during launch.',
    cta: 'Start a workspace',
    free: true,
    feats: [
      'Everything in Starter',
      'AI standup digests & blocker triage',
      'Manager + leadership Intelligence surface',
      'Advanced search · data exports',
      'Slack delivery (when shipped)',
      'Priority email support',
    ],
    accent: true,
  },
  {
    plan: 'Enterprise',
    icon: Building2,
    listPrice: 'Custom',
    period: 'annual contract',
    note: 'For regulated orgs. Free during launch.',
    cta: 'Talk to founders',
    free: true,
    feats: [
      'Everything in Growth',
      'SSO + SCIM provisioning',
      'Audit explorer + retention policy',
      'Single-tenant dedicated cluster (opt-in)',
      'DPA, security questionnaire, SOC 2',
      'Custom branding · custom roles',
    ],
    accent: false,
  },
] as const;

const FAQ = [
  {
    q: 'Why is it free right now?',
    a: "THEORY is in its founder-led launch. We're prioritising adoption and feedback over revenue, so every paid tier is on for $0 today. The list price is the real price the product will be sold at once launch ends — no bait-and-switch, no surprise invoice.",
  },
  {
    q: "What happens when launch ends?",
    a: "Existing workspaces created during launch keep their current tier free for a generous grandfather period. We'll announce the end of the launch with at least 60 days' notice, and the Starter tier (10 seats, free) stays free forever.",
  },
  {
    q: 'How do you charge?',
    a: "Per organisation, not per user account. One subscription covers every member of the workspace. Growth is per-seat / month; Enterprise is an annual contract negotiated directly.",
  },
  {
    q: 'Is THEORY open source?',
    a: "No. THEORY is proprietary software — copyright THEORY, all rights reserved. We may publish components or SDKs under permissive licences in the future, but the product is not redistributable.",
  },
  {
    q: 'Can I trust you with my data?',
    a: "Yes — and we go to lengths to prove it. Multi-tenant isolation is enforced at the database boundary by a fail-closed query guard; private journals are AES-256-GCM encrypted and never returned by any API or AI; every privileged action writes an audit row. Read the full Security page for the receipts.",
  },
];

function Bar({ brand }: { brand: string }) {
  return (
    <nav
      className="fixed top-0 inset-x-0 z-40 backdrop-blur-md"
      style={{ background: 'rgba(8,10,20,0.55)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
        <Link to="/" className="font-serif italic text-[22px] text-white">{brand}</Link>
        <div className="flex items-center gap-6 text-[13px] text-white/65">
          <Link to="/how-it-works" className="hover:text-white transition-colors">How it works</Link>
          <Link to="/pricing" className="text-white">Pricing</Link>
          <Link to="/security" className="hover:text-white transition-colors">Security</Link>
          <Link
            to="/sign-up"
            className="rounded-full px-4 py-1.5 text-white"
            style={{ background: 'var(--brand-primary,#7C3AED)' }}
          >
            Start workspace
          </Link>
        </div>
      </div>
    </nav>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] py-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-[15px] text-white/85">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.22, ease }}>
          <ChevronDown size={17} className="text-white/45" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease }}
            className="text-[13.5px] text-white/55 leading-relaxed pt-2 max-w-[640px]"
          >
            {a}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Pricing() {
  const { brandName } = useBranding();
  const brand = (brandName || 'theory').toLowerCase();

  return (
    <div className="dot-canvas min-h-screen text-white">
      <div className="dot-grid dot-grid-2x dot-drift" aria-hidden />
      <div className="relative z-[1]">
        <Bar brand={brand} />

        {/* ── Hero ── */}
        <section className="relative overflow-hidden px-6 pt-40 pb-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[480px] w-[480px] rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(circle, var(--brand-primary,#7C3AED) 0%, transparent 65%)' }}
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <motion.span
              variants={rise} initial="hidden" animate="show"
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] text-white/70 mb-7"
              style={{ border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)' }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--brand-primary,#a78bfa)' }} />
              Launch pricing — every paid tier is free today
            </motion.span>

            <motion.h1
              variants={rise} custom={1} initial="hidden" animate="show"
              className="text-[40px] sm:text-[56px] font-semibold leading-[1.07] tracking-tight"
            >
              Built for what you'll pay for.
              <span className="block">
                <span className="font-serif italic" style={{ color: 'var(--brand-primary,#a78bfa)' }}>Free</span>
                {' '}until launch ends.
              </span>
            </motion.h1>

            <motion.p
              variants={rise} custom={2} initial="hidden" animate="show"
              className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-white/60"
            >
              These are the prices THEORY will sell at. While we're in
              founder-led launch, every paid tier is unlocked for $0 — keep what
              you build, on whichever plan you sign up for.
            </motion.p>
          </div>
        </section>

        {/* ── Tier ladder ── */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-6xl grid gap-5 md:grid-cols-3">
            {TIERS.map((t, i) => {
              const Icon = t.icon;
              return (
                <motion.div
                  key={t.plan}
                  variants={rise} custom={i} initial="hidden" whileInView="show"
                  viewport={{ once: true, amount: 0.3 }}
                  whileHover={{ y: -4 }}
                  className="rounded-2xl p-7 flex flex-col"
                  style={{
                    border: t.accent
                      ? '1px solid var(--brand-primary,#7C3AED)'
                      : '1px solid rgba(255,255,255,0.08)',
                    background: t.accent ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)',
                    boxShadow: t.accent ? '0 24px 60px -20px rgba(124,58,237,0.30)' : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <span
                      className="inline-grid place-items-center w-9 h-9 rounded-xl"
                      style={{
                        background: t.accent ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.05)',
                        color: 'var(--brand-primary,#a78bfa)',
                      }}
                    >
                      <Icon size={17} />
                    </span>
                    {t.accent && (
                      <span
                        className="text-[10px] font-semibold uppercase tracking-[0.14em] px-2 py-1 rounded-md"
                        style={{
                          color: 'var(--brand-primary,#a78bfa)',
                          background: 'rgba(124,58,237,0.16)',
                        }}
                      >
                        Most popular
                      </span>
                    )}
                  </div>

                  <h3 className="text-[20px] font-semibold text-white">{t.plan}</h3>

                  {/* Price block — anchor visible even when free */}
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`font-semibold tracking-tight ${
                          t.free ? 'line-through text-white/30 text-[28px]' : 'text-[36px] text-white'
                        }`}
                      >
                        {t.listPrice}
                      </span>
                      {'listSuffix' in t && t.listSuffix && (
                        <span
                          className={`text-[13px] ${t.free ? 'text-white/30 line-through' : 'text-white/55'}`}
                        >
                          {t.listSuffix}
                        </span>
                      )}
                    </div>
                    {t.free && (
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-[34px] font-semibold tracking-tight text-white">$0</span>
                        <span
                          className="text-[10.5px] font-semibold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-md"
                          style={{
                            color: 'var(--brand-primary,#a78bfa)',
                            background: 'rgba(124,58,237,0.18)',
                          }}
                        >
                          Free during launch
                        </span>
                      </div>
                    )}
                    <p className="mt-1 text-[12px] text-white/45">{t.period}</p>
                  </div>

                  <p className="mt-4 text-[13px] text-white/55">{t.note}</p>

                  <ul className="mt-5 space-y-2.5 flex-1">
                    {t.feats.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13.5px] text-white/85">
                        <Check size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--brand-primary,#a78bfa)' }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={t.plan === 'Enterprise' ? '/contact' : '/sign-up'}
                    className="mt-7 block rounded-full py-2.5 text-center text-[14px] font-medium transition-transform hover:-translate-y-0.5"
                    style={
                      t.accent
                        ? {
                            background: 'var(--brand-primary,#7C3AED)',
                            color: '#fff',
                            boxShadow: '0 10px 40px -10px rgba(124,58,237,0.5)',
                          }
                        : { border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.85)' }
                    }
                  >
                    {t.cta}
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <motion.p
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.2 }}
            className="mt-8 text-center text-[12.5px] text-white/40"
          >
            One subscription covers the whole organisation. Prices are USD.
            Existing workspaces are grandfathered when launch ends, with at
            least 60 days' notice.
          </motion.p>
        </section>

        {/* ── Trust strip ── */}
        <section className="px-6 pb-16">
          <div className="mx-auto max-w-5xl">
            <Link
              to="/security"
              className="block rounded-2xl p-6 sm:p-7"
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.025)',
              }}
            >
              <div className="flex items-start gap-5 flex-wrap">
                <span
                  className="inline-grid place-items-center w-10 h-10 rounded-xl shrink-0"
                  style={{ background: 'rgba(16,185,129,0.14)', color: '#10B981' }}
                >
                  <ShieldCheck size={18} />
                </span>
                <div className="flex-1 min-w-[260px]">
                  <h3 className="text-[16px] font-semibold text-white">Built so your data is defensible.</h3>
                  <p className="text-[13px] text-white/55 mt-1.5">
                    Tenant-isolated database queries (fail-closed), AES-256-GCM
                    encrypted private journals, audit log on every privileged
                    action, SSO + MFA via Clerk, Cloudflare Turnstile bot
                    defence, brute-force cooldown, secret rotation discipline.
                    <span className="text-white/75"> Full security details →</span>
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-[24px] font-semibold mb-6">Honest answers</h2>
            <div>
              {FAQ.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
            </div>

            <div className="mt-10 flex items-center justify-between flex-wrap gap-3">
              <p className="text-[13.5px] text-white/55">
                Still on the fence? Start a workspace — every paid tier is $0 today.
              </p>
              <Link
                to="/sign-up"
                className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13.5px] font-medium text-white"
                style={{ background: 'var(--brand-primary,#7C3AED)' }}
              >
                Start free <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/[0.06] py-10 text-center text-[12px] text-white/35">
          <Link to="/" className="font-serif italic text-white/55 hover:text-white/80 transition-colors">
            {brand}
          </Link> · operational intelligence · © 2026 THEORY. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
