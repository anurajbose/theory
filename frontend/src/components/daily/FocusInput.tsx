import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle, Loader2 } from 'lucide-react';
import { updateLog } from '../../services/dailyLogService';

interface Props { initial: string | null }

type SaveState = 'idle' | 'saving' | 'saved';

export default function FocusInput({ initial }: Props) {
  const [value, setValue]         = useState(initial || '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [focused, setFocused]     = useState(false);
  const timerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setValue(initial || ''); }, [initial]);

  function handleChange(text: string) {
    setValue(text);
    setSaveState('idle');
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!text.trim()) return;

    timerRef.current = setTimeout(async () => {
      setSaveState('saving');
      try {
        await updateLog({ focusText: text });
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } catch { setSaveState('idle'); }
    }, 3000);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="card"
      style={{
        border: focused
          ? '1px solid var(--m3-primary)'
          : '1px solid var(--m3-outline-v)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        boxShadow: focused ? '0 0 0 3px color-mix(in srgb, var(--m3-primary) 12%, transparent)' : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--m3-prim-c)' }}
          >
            <Target size={14} style={{ color: 'var(--m3-on-prim-c)' }} />
          </div>
          <h3 className="text-title-s" style={{ color: 'var(--m3-on-surf)' }}>
            Today's focus
          </h3>
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

      <textarea
        rows={2}
        className="w-full text-sm leading-relaxed resize-none outline-none bg-transparent"
        placeholder="What's the one thing that would make today successful?"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          color: 'var(--m3-on-surf)',
          caretColor: 'var(--m3-primary)',
        }}
      />
      <style>{`
        textarea::placeholder { color: var(--m3-on-surf-var); opacity: 0.5; }
      `}</style>
    </motion.div>
  );
}
