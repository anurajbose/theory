import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, CheckCircle, Loader2, Zap, RefreshCcw } from 'lucide-react';
import { getStandup, StandupData } from '../../services/dailyLogService';
import { format } from 'date-fns';

interface Props { onClose: () => void }

export default function StandupModal({ onClose }: Props) {
  const [data, setData]       = useState<StandupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const result = await getStandup();
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  // Auto-generate on mount
  useEffect(() => { generate(); }, []);

  function buildText(d: StandupData): string {
    const lines: string[] = [`📅 Standup — ${format(new Date(d.date), 'EEE d MMM')}`];
    lines.push('\n✅ Yesterday');
    if (d.yesterday.length)
      d.yesterday.forEach((i) => lines.push(`  • [${i.section}] ${i.title}`));
    else lines.push('  • No items logged');
    lines.push('\n🔵 Today');
    if (d.today.length)
      d.today.forEach((i) => lines.push(`  • [${i.section}] ${i.title}`));
    else if (d.focus)
      lines.push(`  • ${d.focus}`);
    else lines.push('  • Planning in progress');
    lines.push('\n🔴 Blockers');
    if (d.blockers.length)
      d.blockers.forEach((i) => lines.push(`  • [${i.section}] ${i.title}`));
    else lines.push('  • None');
    return lines.join('\n');
  }

  async function copy() {
    if (!data) return;
    await navigator.clipboard.writeText(buildText(data));
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        />

        {/* Modal — M3 dialog style */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="relative w-full max-w-md z-10 rounded-3xl overflow-hidden shadow-e4"
          style={{ background: 'var(--m3-surf4)' }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-6 pt-6 pb-4"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--m3-prim-c)' }}
              >
                <Zap size={16} style={{ color: 'var(--m3-on-prim-c)' }} />
              </div>
              <div>
                <h2 className="text-title-m" style={{ color: 'var(--m3-on-surf)' }}>
                  Standup Generator
                </h2>
                <p className="text-xs" style={{ color: 'var(--m3-on-surf-var)' }}>
                  Auto-built from your work items
                </p>
              </div>
            </div>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
              style={{ color: 'var(--m3-on-surf-var)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--state-hover)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <X size={16} />
            </motion.button>
          </div>

          {/* ── Divider ── */}
          <div className="h-px mx-6" style={{ background: 'var(--m3-outline-v)' }} />

          {/* ── Body ── */}
          <div className="px-6 py-5 min-h-[200px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div
                  className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'var(--m3-prim-c)', borderTopColor: 'var(--m3-primary)' }}
                />
                <p className="text-sm" style={{ color: 'var(--m3-on-surf-var)' }}>
                  Generating from your work items…
                </p>
              </div>
            ) : data ? (
              <div className="space-y-5">
                <Section
                  color="var(--m3-primary)"
                  bgColor="var(--m3-prim-c)"
                  title="✅ Yesterday"
                  items={data.yesterday.map((i) => `[${i.section}] ${i.title}`)}
                  empty="No items logged yesterday"
                />
                <Section
                  color="var(--m3-secondary)"
                  bgColor="var(--m3-sec-c)"
                  title="🔵 Today"
                  items={
                    data.today.length
                      ? data.today.map((i) => `[${i.section}] ${i.title}`)
                      : data.focus
                        ? [data.focus]
                        : []
                  }
                  empty="No items yet — add your focus above"
                />
                <Section
                  color="var(--m3-error)"
                  bgColor="color-mix(in srgb, var(--m3-error) 20%, transparent)"
                  title="🔴 Blockers"
                  items={data.blockers.map((i) => `[${i.section}] ${i.title}`)}
                  empty="No blockers 🎉"
                />
              </div>
            ) : (
              <p
                className="text-sm text-center py-8"
                style={{ color: 'var(--m3-on-surf-var)' }}
              >
                Add work items to your board to generate a standup.
              </p>
            )}
          </div>

          {/* ── Footer ── */}
          <div
            className="flex gap-3 px-6 pb-6 pt-2"
          >
            <motion.button
              onClick={generate}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="btn-outlined flex items-center gap-2 text-sm"
            >
              <RefreshCcw size={13} />
              Regenerate
            </motion.button>
            <motion.button
              onClick={copy}
              disabled={!data}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="btn-filled flex-1 flex items-center justify-center gap-2 text-sm"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle size={14} /> Copied!
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Copy size={14} /> Copy to clipboard
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function Section({
  title, items, empty, color, bgColor,
}: {
  title: string; items: string[]; empty: string; color: string; bgColor: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: color }}
        />
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color }}
        >
          {title}
        </p>
      </div>
      {items.length ? (
        <ul className="space-y-1.5 pl-4">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm"
              style={{ color: 'var(--m3-on-surf)' }}>
              <span
                className="w-1 h-1 rounded-full mt-2 shrink-0"
                style={{ background: color, opacity: 0.6 }}
              />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs pl-4" style={{ color: 'var(--m3-on-surf-var)', fontStyle: 'italic' }}>
          {empty}
        </p>
      )}
    </div>
  );
}
