import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { JOB_ROLES, JobRoleKey } from '../../utils/roleConfig';

interface Props {
  selected: JobRoleKey | null;
  onSelect: (role: JobRoleKey) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2JobRole({ selected, onSelect, onNext, onBack }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="flex flex-col gap-5"
    >
      <div>
        <h2 className="text-headline-s font-semibold" style={{ color: 'var(--m3-on-surf)' }}>
          What's your role?
        </h2>
        <p className="text-body-m mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>
          Your work board sections will be pre-configured for you.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
        {JOB_ROLES.map(([key, cfg]) => {
          const active = selected === key;
          return (
            <motion.button
              key={key}
              onClick={() => onSelect(key)}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="text-left p-3.5 rounded-2xl transition-all duration-200"
              style={{
                background: active ? 'var(--m3-prim-c)' : 'var(--m3-surf1)',
                border: `2px solid ${active ? 'var(--m3-primary)' : 'transparent'}`,
                color: active ? 'var(--m3-on-prim-c)' : 'var(--m3-on-surf)',
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--m3-surf2)';
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--m3-surf1)';
              }}
            >
              <div className="text-xl mb-1">{cfg.icon}</div>
              <div className="text-sm font-semibold">{cfg.label}</div>
              <div
                className="text-xs mt-0.5 leading-snug opacity-70"
                style={{ color: active ? 'var(--m3-on-prim-c)' : 'var(--m3-on-surf-var)' }}
              >
                {cfg.description}
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="btn-outlined flex items-center gap-1.5"
        >
          <ArrowLeft size={15} /> Back
        </motion.button>
        <motion.button
          onClick={onNext}
          disabled={!selected}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          className="btn-filled flex-1 flex items-center justify-center gap-2"
        >
          Continue <ArrowRight size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
}
