import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight, Activity, Radar, LineChart, Sparkles, ShieldCheck, Workflow,
} from 'lucide-react';
import { useBranding } from '../../theme/ThemeProvider';

/* Brand-driven, zero hardcoded brand. Professional, minimal emoji.
   Award-style: aurora + cursor-parallax hero, scroll reveals, magnetic hovers. */

const ease = [0.16, 1, 0.3, 1] as const;
const rise = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.08, ease } }),
};

function Nav({ brand }: { brand: string }) {
  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl"
      style={{ background: 'rgba(8,10,20,0.55)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
        <span className="font-serif italic text-xl tracking-tight text-white lowercase">{brand}</span>
        <div className="flex items-center gap-7 text-[13px] text-white/65">
          <Link to="/how-it-works" className="hidden sm:block hover:text-white transition-colors">How it works</Link>
          <Link to="/pricing" className="hidden sm:block hover:text-white transition-colors">Pricing</Link>
          <Link to="/login" className="hover:text-white transition-colors">Sign in</Link>
          <Link
            to="/login"
            className="rounded-full px-4 py-2 text-[13px] font-medium text-white transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--brand-primary, #5457E5)' }}
          >
            Get started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

function Hero({ brand }: { brand: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const gx = useTransform(sx, (v) => v * 0.5);
  const gy = useTransform(sy, (v) => v * 0.5);

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set(e.clientX - r.left - r.width / 2);
        my.set(e.clientY - r.top - r.height / 2);
      }}
      className="relative overflow-hidden pt-40 pb-28 px-6"
    >
      <motion.div
        aria-hidden
        style={{ x: gx, y: gy }}
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[620px] w-[620px] rounded-full blur-3xl"
      >
        <div className="h-full w-full rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, var(--brand-primary,#5457E5) 0%, transparent 65%)' }} />
      </motion.div>

      <div className="relative mx-auto max-w-4xl text-center">
        <motion.span
          variants={rise} initial="hidden" animate="show"
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] text-white/70 mb-7"
          style={{ border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)' }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--brand-primary,#5457E5)' }} />
          Operational intelligence, not status meetings
        </motion.span>

        <motion.h1
          variants={rise} custom={1} initial="hidden" animate="show"
          className="text-[42px] sm:text-[64px] leading-[1.05] font-semibold tracking-tight text-white"
        >
          Run your organisation on
          <span className="block">
            <span className="font-serif italic" style={{ color: 'var(--brand-primary,#8b8ef5)' }}>
              signals
            </span>
            , not slide decks.
          </span>
        </motion.h1>

        <motion.p
          variants={rise} custom={2} initial="hidden" animate="show"
          className="mx-auto mt-7 max-w-2xl text-[16px] sm:text-[18px] leading-relaxed text-white/60"
        >
          {brand} turns everyday work — tasks, blockers, follow-ups, time — into
          live signals for people, patterns for leadership, and metadata-only
          intelligence for AI. Private journals stay private. Always.
        </motion.p>

        <motion.div
          variants={rise} custom={3} initial="hidden" animate="show"
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--brand-primary,#5457E5)', boxShadow: '0 10px 40px -10px rgba(84,87,229,0.6)' }}
          >
            Start free
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/how-it-works"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] text-white/80 transition-colors hover:text-white"
            style={{ border: '1px solid rgba(255,255,255,0.14)' }}
          >
            See how it works
          </Link>
        </motion.div>

        <motion.p
          variants={rise} custom={4} initial="hidden" animate="show"
          className="mt-6 text-[12px] text-white/35"
        >
          Free during launch · Per-organisation pricing · No credit card to start
        </motion.p>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Activity, title: 'Daily clarity', body: 'Each person plans the day, logs blockers and follow-ups in seconds. One screen, zero noise.' },
  { icon: Radar, title: 'Manager signals', body: 'Real workload, blockers and SLA health per team — surfaced, never manually gathered.' },
  { icon: LineChart, title: 'Leadership patterns', body: 'Org-wide health, compliance and trends as live read models, not month-end reports.' },
  { icon: Sparkles, title: 'AI on metadata only', body: 'Standup digests and blocker triage from operational signals — never your private notes.' },
  { icon: ShieldCheck, title: 'Private by design', body: 'Journals are encrypted and never returned by any API or AI. Multi-tenant isolation, enforced.' },
  { icon: Workflow, title: 'Built to run on', body: 'Realtime, search, exports, audit and SSO — the operational backbone for the whole org.' },
];

function Features() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24">
      <motion.h2
        variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.5 }}
        className="text-center text-[28px] sm:text-[36px] font-semibold tracking-tight text-white"
      >
        One system. Every altitude.
      </motion.h2>
      <motion.p
        variants={rise} custom={1} initial="hidden" whileInView="show" viewport={{ once: true }}
        className="mx-auto mt-4 max-w-xl text-center text-white/55"
      >
        The same data serves the individual, the manager, leadership and AI —
        each sees only what their altitude needs.
      </motion.p>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            variants={rise} custom={i} initial="hidden" whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            whileHover={{ y: -6 }}
            className="group rounded-2xl p-6 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
          >
            <div
              className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--brand-primary,#8b8ef5)' }}
            >
              <f.icon size={20} />
            </div>
            <h3 className="text-[17px] font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-white/55">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { n: '01', t: 'Capture', d: 'People log the day’s focus, blockers and follow-ups — five minutes, not a meeting.' },
  { n: '02', t: 'Surface', d: 'Signals roll up automatically: managers see health, leadership sees patterns.' },
  { n: '03', t: 'Act', d: 'AI digests + triage on metadata, realtime alerts, exports and audit — the org just runs.' },
];

function How() {
  return (
    <section id="how" className="relative mx-auto max-w-5xl px-6 py-24 scroll-mt-20">
      <motion.h2
        variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.5 }}
        className="text-center text-[28px] sm:text-[36px] font-semibold tracking-tight text-white"
      >
        How it works
      </motion.h2>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            variants={rise} custom={i} initial="hidden" whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="relative rounded-2xl p-7"
            style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
          >
            <span className="font-serif italic text-3xl" style={{ color: 'var(--brand-primary,#8b8ef5)' }}>{s.n}</span>
            <h3 className="mt-3 text-[18px] font-semibold text-white">{s.t}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-white/55">{s.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const TEASER_TIERS = [
  { name: 'Starter', list: '$0',  suffix: 'forever',          free: false, note: 'Up to 10 seats',           highlight: false },
  { name: 'Growth',  list: '$19', suffix: '/ seat / month',   free: true,  note: 'Most teams pick this',     highlight: true  },
  { name: 'Enterprise', list: 'Custom', suffix: 'annual',     free: true,  note: 'SSO · SCIM · audit · SLA', highlight: false },
];

function PricingTeaser() {
  return (
    <section id="pricing" className="relative mx-auto max-w-5xl px-6 py-24 scroll-mt-20">
      <motion.div
        variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}
        className="text-center"
      >
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11.5px] text-white/70 mb-6"
          style={{ border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)' }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--brand-primary,#a78bfa)' }} />
          Launch pricing — every paid tier free today
        </span>
        <h2 className="text-[28px] sm:text-[40px] font-semibold tracking-tight text-white">
          Built for what you'll pay for.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-white/55">
          Real prices, real product. Free during founder-led launch — keep
          your workspace and your tier when launch ends.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {TEASER_TIERS.map((t, i) => (
          <motion.div
            key={t.name}
            variants={rise} custom={i} initial="hidden" whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            whileHover={{ y: -4 }}
            className="rounded-2xl p-6 flex flex-col"
            style={{
              border: t.highlight
                ? '1px solid var(--brand-primary,#7C3AED)'
                : '1px solid rgba(255,255,255,0.08)',
              background: t.highlight ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)',
              boxShadow: t.highlight ? '0 24px 60px -20px rgba(124,58,237,0.28)' : undefined,
            }}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-semibold text-white">{t.name}</span>
              {t.highlight && (
                <span
                  className="text-[9.5px] font-semibold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
                  style={{ color: 'var(--brand-primary,#a78bfa)', background: 'rgba(124,58,237,0.18)' }}
                >
                  Popular
                </span>
              )}
            </div>
            {t.free ? (
              <>
                <span className="mt-2.5 text-[18px] line-through text-white/30">{t.list} <span className="text-[12px]">{t.suffix}</span></span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-[28px] font-semibold tracking-tight text-white">$0</span>
                  <span
                    className="text-[9.5px] font-semibold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
                    style={{ color: 'var(--brand-primary,#a78bfa)', background: 'rgba(124,58,237,0.18)' }}
                  >
                    Free during launch
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-baseline gap-1.5 mt-2.5">
                <span className="text-[28px] font-semibold tracking-tight text-white">{t.list}</span>
                <span className="text-[12px] text-white/55">{t.suffix}</span>
              </div>
            )}
            <p className="text-[12px] text-white/45 mt-1.5">{t.note}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-9 flex items-center justify-center gap-3">
        <Link
          to="/sign-up"
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14.5px] font-medium text-white"
          style={{ background: 'var(--brand-primary,#7C3AED)', boxShadow: '0 10px 40px -10px rgba(124,58,237,0.5)' }}
        >
          Start your workspace
        </Link>
        <Link
          to="/pricing"
          className="inline-flex items-center gap-1.5 text-[13.5px] text-white/70 hover:text-white transition-colors"
        >
          See full pricing →
        </Link>
      </div>
    </section>
  );
}

function CTA({ brand }: { brand: string }) {
  return (
    <section className="relative mx-auto max-w-4xl px-6 py-28 text-center">
      <motion.div
        variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}
      >
        <h2 className="text-[32px] sm:text-[44px] font-semibold tracking-tight text-white">
          Stop chasing status. Start reading signals.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-white/55">
          Bring {brand} to your organisation today — free for your first team.
        </p>
        <Link
          to="/login"
          className="mt-9 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5"
          style={{ background: 'var(--brand-primary,#5457E5)', boxShadow: '0 10px 40px -10px rgba(84,87,229,0.6)' }}
        >
          Start free <ArrowRight size={17} />
        </Link>
      </motion.div>
    </section>
  );
}

export default function Landing() {
  const { brandName } = useBranding();
  const brand = (brandName || 'theory').toLowerCase();
  return (
    <div className="dot-canvas min-h-screen text-white">
      <div className="dot-grid dot-grid-2x dot-drift" aria-hidden />
      <div className="relative z-[1]">
      <Nav brand={brand} />
      <main>
        <Hero brand={brand} />
        <Features />
        <How />
        <PricingTeaser />
        <CTA brand={brand} />
      </main>
      <footer className="border-t border-white/[0.06] py-10 text-center text-[12px] text-white/35">
        <span className="font-serif italic text-white/55">{brand}</span> · work intelligence
        <span className="mx-2">·</span>
        <Link to="/login" className="hover:text-white/70 transition-colors">Sign in</Link>
      </footer>
      </div>
    </div>
  );
}
