import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sunset, Loader2, CheckCircle, PartyPopper } from 'lucide-react';
import { updateLog } from '../../services/dailyLogService';
import toast from 'react-hot-toast';

interface Props { filled: boolean }

export default function EodPrompt({ filled: initialFilled }: Props) {
  const [finished, setFinished]   = useState('');
  const [carryFwd, setCarryFwd]   = useState('');
  const [submitted, setSubmitted] = useState(initialFilled);
  const [saving, setSaving]       = useState(false);

  async function handleSubmit() {
    if (!finished.trim() && !carryFwd.trim()) return;
    setSaving(true);
    try {
      const note = `Finished: ${finished}\nCarries forward: ${carryFwd}`;
      await updateLog({ eodNote: note });
      setSubmitted(true);
      toast.success('End-of-day logged!');
    } catch {
      toast.error('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="rounded-2xl p-5 flex items-center gap-4"
        style={{
          background: 'color-mix(in srgb, var(--m3-primary) 10%, var(--m3-surf0))',
          border: '1px solid color-mix(in srgb, var(--m3-primary) 25%, transparent)',
        }}
      >
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--m3-prim-c)' }}
        >
          <PartyPopper size={18} style={{ color: 'var(--m3-on-prim-c)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--m3-primary)' }}>
            End of day logged ✓
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--m3-on-surf-var)' }}>
            Great work today. See you tomorrow.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      className="rounded-2xl p-5"
      style={{
        background: 'color-mix(in srgb, var(--m3-error) 6%, var(--m3-surf0))',
        border: '1px solid color-mix(in srgb, var(--m3-error) 20%, transparent)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--m3-error) 15%, var(--m3-surf2))' }}
        >
          <Sunset size={17} style={{ color: 'var(--m3-error)' }} />
        </div>
        <div>
          <h3 className="text-title-s" style={{ color: 'var(--m3-on-surf)' }}>
            End of day — wrap up
          </h3>
          <p className="text-xs" style={{ color: 'var(--m3-on-surf-var)' }}>
            Log what you finished and what carries forward
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-label-s mb-1.5" style={{ color: 'var(--m3-on-surf-var)' }}>
            What did you finish today?
          </label>
          <textarea
            rows={2}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none
                       transition-all duration-200"
            placeholder="e.g. Closed 3 tickets, finished CR-204 analysis…"
            value={finished}
            onChange={(e) => setFinished(e.target.value)}
            style={{
              background: 'var(--m3-surf2)',
              color: 'var(--m3-on-surf)',
              border: '1px solid var(--m3-outline-v)',
              caretColor: 'var(--m3-primary)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--m3-primary)';
              e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--m3-primary) 12%, transparent)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--m3-outline-v)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        <div>
          <label className="block text-label-s mb-1.5" style={{ color: 'var(--m3-on-surf-var)' }}>
            What carries forward?
          </label>
          <textarea
            rows={2}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none
                       transition-all duration-200"
            placeholder="e.g. UAT pending on CR-210, follow up with Priya tomorrow…"
            value={carryFwd}
            onChange={(e) => setCarryFwd(e.target.value)}
            style={{
              background: 'var(--m3-surf2)',
              color: 'var(--m3-on-surf)',
              border: '1px solid var(--m3-outline-v)',
              caretColor: 'var(--m3-primary)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--m3-primary)';
              e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--m3-primary) 12%, transparent)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--m3-outline-v)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      <motion.button
        onClick={handleSubmit}
        disabled={saving || (!finished.trim() && !carryFwd.trim())}
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.98 }}
        className="btn-filled w-full mt-4 flex items-center justify-center gap-2"
      >
        {saving ? (
          <><Loader2 size={14} className="animate-spin" /> Saving…</>
        ) : (
          <><CheckCircle size={14} /> Log end of day</>
        )}
      </motion.button>

      <style>{`
        textarea::placeholder { color: var(--m3-on-surf-var); opacity: 0.45; }
      `}</style>
    </motion.div>
  );
}
