import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, CalendarDays } from 'lucide-react';
import { getMorningStats } from '../../services/dailyLogService';
import { format } from 'date-fns';

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.2, 0, 0, 1] } },
};

export default function MorningCards() {
  const [stats, setStats] = useState({ overdueFollowUps: 0, slaBreaches: 0 });

  useEffect(() => {
    getMorningStats().then(setStats);
  }, []);

  const cards = [
    {
      icon:  AlertCircle,
      label: 'Overdue follow-ups',
      value: stats.overdueFollowUps,
      alert: stats.overdueFollowUps > 0,
      variant: 'warning',
    },
    {
      icon:  Clock,
      label: 'SLA breaches',
      value: stats.slaBreaches,
      alert: stats.slaBreaches > 0,
      variant: 'error',
    },
    {
      icon:    CalendarDays,
      label:   'Today',
      value:   format(new Date(), 'EEE, d MMM'),
      alert:   false,
      variant: 'neutral',
      isText:  true,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(({ icon: Icon, label, value, alert, variant, isText }, i) => {
        const bgStyle = alert
          ? variant === 'error'
            ? { background: 'color-mix(in srgb, var(--m3-error) 10%, var(--m3-surf0))' }
            : { background: 'color-mix(in srgb, #F59E0B 10%, var(--m3-surf0))' }
          : { background: 'var(--m3-surf0)' };

        const iconColor = alert
          ? variant === 'error' ? 'var(--m3-error)' : '#B45309'
          : 'var(--m3-primary)';

        return (
          <motion.div
            key={label}
            variants={cardVariants}
            custom={i}
            whileHover={{ y: -2, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
            className="rounded-2xl p-4 transition-all duration-200 cursor-default"
            style={{
              ...bgStyle,
              border: `1px solid ${alert ? 'color-mix(in srgb, var(--m3-error) 20%, transparent)' : 'var(--m3-outline-v)'}`,
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
              style={{ background: alert
                ? 'color-mix(in srgb, var(--m3-error) 15%, transparent)'
                : 'var(--m3-prim-c)',
              }}
            >
              <Icon size={16} style={{ color: iconColor }} />
            </div>
            <p
              className={`font-bold leading-tight mb-0.5 ${isText ? 'text-sm' : 'text-2xl'}`}
              style={{ color: alert ? iconColor : 'var(--m3-on-surf)' }}
            >
              {value}
            </p>
            <p className="text-xs" style={{ color: 'var(--m3-on-surf-var)' }}>
              {label}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
