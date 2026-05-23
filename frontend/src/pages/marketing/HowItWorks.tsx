import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, User, Users, Building2, Sparkles, Lock,
} from 'lucide-react';
import { useBranding } from '../../theme/ThemeProvider';

const ease = [0.16, 1, 0.3, 1] as const;
const rise = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.08, ease } }),
};

function TopBar({ brand }: { brand: string }) {
  return (
    <div className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl"
      style={{ background: 'rgba(8,10,20,0.55)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
        <Link to="/" className="inline-flex items-center gap-2 text-white/65 hover:text-white text-[13px] transition-colors">
          <ArrowLeft size={15} /> <span className="font-serif italic text-lg text-white lowercase">{brand}</span>
        </Link>
        <div className="flex items-center gap-7 text-[13px] text-white/65">
          <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link to="/login" className="hover:text-white transition-colors">Sign in</Link>
          <Link to="/login" className="rounded-full px-4 py-2 font-medium text-white transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--brand-primary,#5457E5)' }}>Get started</Link>
        </div>
      </div>
    </div>
  );
}

const LOOP = [
  { n: '01', t: 'Capture', d: 'People log focus, blockers, follow-ups and time in minutes — structured, low-friction, on one screen.' },
  { n: '02', t: 'Surface', d: 'Signals roll up automatically. Nobody compiles a status report; the data is already shaped per audience.' },
  { n: '03', t: 'Act', d: 'Realtime alerts, AI digests on metadata, exports and audit. Decisions happen on signal, not anecdote.' },
];

const ALTITUDES = [
  {
    icon: User, tag: 'Individual',
    t: 'A calmer, clearer day',
    d: 'Plan the day, capture blockers the moment they appear, track follow-ups before they slip. Private journals are encrypted and never leave your control — not to managers, not to AI.',
    points: ['Daily focus & end-of-day note', 'Work board with SLA awareness', 'Follow-up aging that nudges you'],
  },
  {
    icon: Users, tag: 'Manager',
    t: 'Signals, not status meetings',
    d: 'See real workload, blocker age and SLA health across your team — continuously, scoped to exactly your people. No spreadsheets, no Monday stand-up archaeology.',
    points: ['Live team health score', 'Blocker triage queue', 'Where time actually goes'],
  },
  {
    icon: Building2, tag: 'Leadership',
    t: 'Patterns across the org',
    d: 'Org-wide compliance, throughput and trends as cached read models — instant, tenant-isolated, always current. The month-end report is just… the live screen.',
    points: ['Org health & SLA by department', 'Cross-team blocker hotspots', 'Trend lines, not snapshots'],
  },
  {
    icon: Sparkles, tag: 'AI',
    t: 'Intelligence on metadata only',
    d: 'Standup digests and blocker triage are generated from operational signals through a single governed gateway — every call redacted, moderated, audited. Journals and secrets never reach a model.',
    points: ['Prompt registry & AI audit log', 'Redaction before any model call', 'Confidence + token governance'],
  },
];

export default function HowItWorks() {
  const { brandName } = useBranding();
  const brand = (brandName || 'theory').toLowerCase();

  return (
    <div className="dot-canvas min-h-screen text-white">
      <div className="dot-grid dot-grid-2x dot-drift" aria-hidden />
      <div className="relative z-[1]">
      <TopBar brand={brand} />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-40 pb-20">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, var(--brand-primary,#5457E5) 0%, transparent 65%)' }} />
        <div className="relative mx-auto max-w-3xl text-center">
          <motion.h1 variants={rise} initial="hidden" animate="show"
            className="text-[40px] sm:text-[56px] font-semibold leading-[1.07] tracking-tight">
            How {brand} <span className="font-serif italic" style={{ color: 'var(--brand-primary,#8b8ef5)' }}>works</span>
          </motion.h1>
          <motion.p variants={rise} custom={1} initial="hidden" animate="show"
            className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-white/60">
            One capture loop feeds four altitudes. The same work becomes personal
            clarity, manager signals, leadership patterns and governed AI — with
            privacy enforced at every layer, not promised in a policy.
          </motion.p>
        </div>
      </section>

      {/* The loop */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {LOOP.map((s, i) => (
            <motion.div key={s.n} variants={rise} custom={i} initial="hidden" whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              className="relative rounded-2xl p-7"
              style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
              <span className="font-serif italic text-3xl" style={{ color: 'var(--brand-primary,#8b8ef5)' }}>{s.n}</span>
              <h3 className="mt-3 text-[19px] font-semibold">{s.t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-white/55">{s.d}</p>
              {i < LOOP.length - 1 && (
                <ArrowRight size={18} className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 text-white/25" />
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Altitudes — alternating deep dives */}
      <section className="mx-auto max-w-5xl px-6 py-16 space-y-20">
        {ALTITUDES.map((a, i) => (
          <motion.div key={a.tag}
            variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }}
            className={`flex flex-col gap-8 md:flex-row md:items-center ${i % 2 ? 'md:flex-row-reverse' : ''}`}>
            <div className="md:w-1/2">
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] text-white/70"
                style={{ border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)' }}>
                <a.icon size={14} style={{ color: 'var(--brand-primary,#8b8ef5)' }} /> {a.tag}
              </span>
              <h3 className="mt-4 text-[26px] font-semibold tracking-tight">{a.t}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-white/60">{a.d}</p>
            </div>
            <div className="md:w-1/2">
              <motion.div whileHover={{ y: -6 }}
                className="rounded-2xl p-6"
                style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <ul className="space-y-3">
                  {a.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-[14.5px] text-white/70">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: 'var(--brand-primary,#8b8ef5)' }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Privacy differentiator */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}
          className="rounded-2xl p-8 text-center"
          style={{ border: '1px solid var(--brand-primary,#5457E5)', background: 'rgba(84,87,229,0.06)' }}>
          <Lock size={22} className="mx-auto mb-4" style={{ color: 'var(--brand-primary,#8b8ef5)' }} />
          <h3 className="text-[24px] font-semibold tracking-tight">Privacy is the architecture, not a setting</h3>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-white/60">
            Journals are AES-encrypted and provably never returned by any API or
            reachable by AI — enforced centrally and verified by automated tests.
            Every tenant is hard-isolated at the data, search, realtime and AI layers.
          </p>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <motion.h2 variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}
          className="text-[30px] sm:text-[42px] font-semibold tracking-tight">
          See it on your own work
        </motion.h2>
        <p className="mx-auto mt-4 max-w-lg text-white/55">Every paid tier is free during founder-led launch — keep your tier when launch ends.</p>
        <div className="mt-9 flex items-center justify-center gap-4">
          <Link to="/login"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--brand-primary,#5457E5)', boxShadow: '0 10px 40px -10px rgba(84,87,229,0.6)' }}>
            Start free <ArrowRight size={17} />
          </Link>
          <Link to="/pricing"
            className="rounded-full px-7 py-3.5 text-[15px] text-white/80 hover:text-white transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.14)' }}>
            View pricing
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-10 text-center text-[12px] text-white/35">
        <Link to="/" className="font-serif italic text-white/55 hover:text-white/80 transition-colors">{brand}</Link> · work intelligence
      </footer>
      </div>
    </div>
  );
}
