import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import {
  LayoutDashboard, KanbanSquare, UserCheck,
  Clock, Lightbulb, BookOpen,
} from 'lucide-react';

interface Props {
  onFinish: () => void;
  onBack: () => void;
  saving: boolean;
}

const SLIDES = [
  {
    icon: LayoutDashboard,
    color: 'var(--m3-primary)',
    bg:    'var(--m3-prim-c)',
    title: 'Daily Page',
    desc:  "Start every morning here. Set your focus, log your mood, and generate your standup in one click.",
  },
  {
    icon: KanbanSquare,
    color: '#0093B2',
    bg:    'rgba(0,147,178,0.12)',
    title: 'Work Board',
    desc:  "Your personal kanban. Drag cards across columns, tag effort types, and never lose track of what's in flight.",
  },
  {
    icon: UserCheck,
    color: '#E8501A',
    bg:    'rgba(232,80,26,0.10)',
    title: 'Follow-up Tracker',
    desc:  "Log every 'waiting on…' moment. theory ages them so nothing slips past 3 days unnoticed.",
  },
  {
    icon: Clock,
    color: '#9B5DE5',
    bg:    'rgba(155,93,229,0.10)',
    title: 'Time Log',
    desc:  "One-click timer on any card. See your weekly Work DNA: how much is strategic vs reactive.",
  },
  {
    icon: Lightbulb,
    color: '#F59E0B',
    bg:    'rgba(245,158,11,0.10)',
    title: 'Idea Bank',
    desc:  "Capture a thought in under 10 seconds. Promote any idea to a CR with one click.",
  },
  {
    icon: BookOpen,
    color: '#22C55E',
    bg:    'rgba(34,197,94,0.10)',
    title: 'Knowledge Base',
    desc:  "Every resolved ticket can become a KB article. Build your team's institutional memory.",
  },
];

export default function Step5Tour({ onFinish, onBack, saving }: Props) {
  const [slide, setSlide] = useState(0);
  const current           = SLIDES[slide];
  const isLast            = slide === SLIDES.length - 1;
  const Icon              = current.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="flex flex-col gap-6"
    >
      <div>
        <h2 className="text-headline-s font-semibold" style={{ color: 'var(--m3-on-surf)' }}>
          Quick tour
        </h2>
        <p className="text-body-m mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>
          Here's what's waiting for you.
        </p>
      </div>

      {/* Slide */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          height: 190,
          background: 'var(--m3-surf1)',
          border: '1px solid var(--m3-outline-v)',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="absolute inset-0 flex flex-col items-center justify-center text-center gap-4 p-5"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: current.bg }}
            >
              <Icon size={26} style={{ color: current.color }} />
            </div>
            <div>
              <h3 className="text-title-m font-semibold" style={{ color: 'var(--m3-on-surf)' }}>
                {current.title}
              </h3>
              <p className="text-body-s mt-1.5 max-w-xs leading-relaxed" style={{ color: 'var(--m3-on-surf-var)' }}>
                {current.desc}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5">
        {SLIDES.map((_, i) => (
          <motion.button
            key={i}
            onClick={() => setSlide(i)}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === slide ? 20 : 8,
              height: 8,
              background: i === slide ? 'var(--m3-primary)' : 'var(--m3-surf3)',
            }}
          />
        ))}
      </div>

      {/* Nav */}
      <div className="flex gap-3">
        <motion.button
          onClick={() => (slide > 0 ? setSlide(slide - 1) : onBack())}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="btn-outlined flex items-center gap-1.5"
        >
          <ArrowLeft size={15} /> Back
        </motion.button>

        {isLast ? (
          <motion.button
            onClick={onFinish}
            disabled={saving}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="btn-filled flex-1 flex items-center justify-center gap-2"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {saving ? 'Setting up…' : "Let's go!"}
          </motion.button>
        ) : (
          <motion.button
            onClick={() => setSlide(slide + 1)}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="btn-filled flex-1 flex items-center justify-center gap-2"
          >
            Next <ArrowRight size={16} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
