import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smile } from 'lucide-react';
import { updateLog } from '../../services/dailyLogService';
import toast from 'react-hot-toast';

const MOODS = [
  { score: 1, emoji: '😞', label: 'Rough',  hue: 'var(--m3-error)' },
  { score: 2, emoji: '😕', label: 'Low',    hue: '#F59E0B' },
  { score: 3, emoji: '😐', label: 'Okay',   hue: 'var(--m3-on-surf-var)' },
  { score: 4, emoji: '🙂', label: 'Good',   hue: '#4ADE80' },
  { score: 5, emoji: '😄', label: 'Great',  hue: 'var(--m3-primary)' },
];

interface Props { initial: number | null }

export default function MoodCheckIn({ initial }: Props) {
  const [selected, setSelected] = useState<number | null>(initial);
  const [saving, setSaving]     = useState(false);

  async function pick(score: number) {
    if (saving) return;
    setSelected(score);
    setSaving(true);
    try {
      await updateLog({ moodScore: score });
    } catch {
      toast.error('Could not save mood');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ border: '1px solid var(--m3-outline-v)' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--m3-prim-c)' }}
        >
          <Smile size={14} style={{ color: 'var(--m3-on-prim-c)' }} />
        </div>
        <h3 className="text-title-s" style={{ color: 'var(--m3-on-surf)' }}>
          How are you feeling?
        </h3>
      </div>

      <div className="flex gap-2">
        {MOODS.map(({ score, emoji, label, hue }) => {
          const isSelected = selected === score;
          return (
            <motion.button
              key={score}
              onClick={() => pick(score)}
              disabled={saving}
              whileHover={{ scale: 1.06, y: -2 }}
              whileTap={{ scale: 0.94 }}
              className="flex flex-col items-center gap-1.5 flex-1 py-3 rounded-2xl
                         transition-all duration-200 focus:outline-none"
              style={{
                background: isSelected
                  ? `color-mix(in srgb, ${hue} 15%, var(--m3-surf2))`
                  : 'var(--m3-surf1)',
                border: `2px solid ${isSelected ? hue : 'transparent'}`,
                color: isSelected ? hue : 'var(--m3-on-surf-var)',
              }}
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <span className="text-xs font-medium">{label}</span>
            </motion.button>
          );
        })}
      </div>

      <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--m3-on-surf-var)', opacity: 0.6 }}>
        Anonymous — only team average is visible to others
      </p>
    </div>
  );
}
