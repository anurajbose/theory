import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Loader2, CheckCircle, PenLine } from 'lucide-react';
import { saveJournal } from '../../services/dailyLogService';

type SaveState = 'idle' | 'saving' | 'saved';

export default function JournalInput() {
  const [value, setValue]         = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [expanded, setExpanded]   = useState(false);
  const [focused, setFocused]     = useState(false);
  const timerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(text: string) {
    setValue(text);
    setSaveState('idle');
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!text.trim()) return;

    timerRef.current = setTimeout(async () => {
      setSaveState('saving');
      try {
        await saveJournal(text);
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } catch { setSaveState('idle'); }
    }, 3000);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <motion.div
      layout
      className="card"
      style={{
        border: focused
          ? '1px solid var(--m3-primary)'
          : '1px solid var(--m3-outline-v)',
        boxShadow: focused ? '0 0 0 3px color-mix(in srgb, var(--m3-primary) 12%, transparent)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--m3-outline-v) 80%, var(--m3-surf2))' }}
          >
            <Lock size={13} style={{ color: 'var(--m3-on-surf-var)' }} />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-title-s" style={{ color: 'var(--m3-on-surf)' }}>
              Private journal
            </h3>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: 'var(--m3-surf3)',
                color: 'var(--m3-on-surf-var)',
              }}
            >
              Encrypted · Never shared
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {saveState !== 'idle' && (
            <motion.span
              key={saveState}
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs"
              style={{ color: 'var(--m3-on-surf-var)' }}
            >
              {saveState === 'saving'
                ? <><Loader2 size={11} className="animate-spin" /> Saving…</>
                : <><CheckCircle size={11} style={{ color: 'var(--m3-primary)' }} /> Saved</>
              }
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.textarea
            key="textarea"
            initial={{ opacity: 0, height: 40 }}
            animate={{ opacity: 1, height: 'auto' }}
            autoFocus
            rows={5}
            className="w-full text-sm leading-relaxed resize-none outline-none bg-transparent"
            placeholder="What's on your mind? Thoughts, wins, frustrations — this is just for you."
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); if (!value.trim()) setExpanded(false); }}
            style={{ color: 'var(--m3-on-surf)', caretColor: 'var(--m3-primary)' }}
          />
        ) : (
          <motion.button
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setExpanded(true)}
            whileHover={{ scale: 1.005 }}
            className="w-full text-left text-sm py-3 px-3 rounded-xl flex items-center gap-2
                       transition-all duration-200"
            style={{
              background: 'var(--m3-surf2)',
              color: 'var(--m3-on-surf-var)',
              border: '1px dashed var(--m3-outline-v)',
            }}
          >
            <PenLine size={14} className="shrink-0 opacity-60" />
            {value.trim() ? `${value.slice(0, 70)}…` : 'Tap to write your private journal entry…'}
          </motion.button>
        )}
      </AnimatePresence>

      <p className="text-[10px] mt-2.5" style={{ color: 'var(--m3-on-surf-var)', opacity: 0.5 }}>
        Your manager and leadership cannot see this — ever.
      </p>
      <style>{`
        textarea::placeholder { color: var(--m3-on-surf-var); opacity: 0.45; }
      `}</style>
    </motion.div>
  );
}
