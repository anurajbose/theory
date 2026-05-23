import { motion } from 'framer-motion';
import { ArrowRight, Shield, BarChart2, BookOpen } from 'lucide-react';
import TheoryLogo from '../TheoryLogo';
import { useTimeTheme } from '../../hooks/useTimeTheme';

interface Props { onNext: () => void; userName: string; }

const features = [
  { icon: BookOpen,  label: 'Private work notebook — your space, your pace' },
  { icon: BarChart2, label: 'Team signals travel up, content never does' },
  { icon: Shield,    label: 'Built for Indian NBFC — Risk-first, AI-first' },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0, 0, 1] } },
};

export default function Step1Welcome({ onNext, userName }: Props) {
  const { resolved: theme } = useTimeTheme();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="flex flex-col items-center text-center gap-6"
    >
      <TheoryLogo size="md" dark={theme === 'dark'} animate />

      <motion.div variants={stagger} initial="hidden" animate="show" className="w-full space-y-2">
        <motion.div variants={fadeUp}>
          <h2 className="text-headline-s font-semibold" style={{ color: 'var(--m3-on-surf)' }}>
            Welcome, {userName.split(' ')[0]} 👋
          </h2>
          <p className="text-body-m mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>
            Let's set up your personal workspace in 2 minutes.
          </p>
        </motion.div>

        <div className="w-full space-y-2 text-left mt-4">
          {features.map(({ icon: Icon, label }, i) => (
            <motion.div
              key={label}
              variants={fadeUp}
              custom={i}
              whileHover={{ x: 3 }}
              className="flex items-start gap-3 p-3.5 rounded-2xl transition-all duration-200"
              style={{
                background: 'var(--m3-surf1)',
                border: '1px solid var(--m3-outline-v)',
              }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--m3-prim-c)' }}
              >
                <Icon size={15} style={{ color: 'var(--m3-on-prim-c)' }} />
              </div>
              <p className="text-sm leading-snug" style={{ color: 'var(--m3-on-surf)' }}>
                {label}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.button
        onClick={onNext}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.97 }}
        className="btn-filled w-full flex items-center justify-center gap-2"
      >
        Get started <ArrowRight size={16} />
      </motion.button>
    </motion.div>
  );
}
