import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bell, X, CheckCircle } from 'lucide-react';
import {
  fetchAnnouncements,
  acknowledgeAnnouncement,
  type Announcement,
} from '../../services/announcementService';

export default function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [acking, setAcking] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements()
      .then((all) => {
        // Show only unacknowledged ones, urgent first
        const pending = all
          .filter((a) => !a.acknowledged)
          .sort((a, b) => (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0));
        setItems(pending);
      })
      .catch(() => {/* silent fail — announcements are supplementary */});
  }, []);

  async function dismiss(ann: Announcement) {
    // Optimistically remove from list
    setItems((prev) => prev.filter((a) => a.id !== ann.id));
    if (ann.ackRequired) {
      setAcking(ann.id);
      try {
        await acknowledgeAnnouncement(ann.id);
      } catch {/* already removed from UI */}
      finally { setAcking(null); }
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {items.map((ann) => (
          <motion.div
            key={ann.id}
            layout
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden"
          >
            <div
              className="flex items-start gap-3 rounded-2xl px-4 py-3"
              style={{
                background: ann.isUrgent
                  ? 'color-mix(in srgb, #ef4444 10%, var(--m3-surf2))'
                  : 'color-mix(in srgb, var(--m3-primary) 8%, var(--m3-surf2))',
                border: ann.isUrgent
                  ? '1.5px solid color-mix(in srgb, #ef4444 30%, transparent)'
                  : '1.5px solid color-mix(in srgb, var(--m3-primary) 20%, transparent)',
              }}
            >
              {/* Icon */}
              <div className="shrink-0 mt-0.5">
                {ann.isUrgent
                  ? <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                  : <Bell size={16} style={{ color: 'var(--m3-primary)' }} />
                }
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold" style={{ color: 'var(--m3-on-surf)' }}>
                    {ann.title}
                  </span>
                  {ann.isUrgent && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{ background: '#ef4444', color: '#fff' }}
                    >
                      Urgent
                    </span>
                  )}
                  {ann.ackRequired && (
                    <span
                      className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--m3-surf4)', color: 'var(--m3-on-surf-var)' }}
                    >
                      Ack required
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--m3-on-surf-var)' }}>
                  {ann.body}
                </p>
                {ann.author && (
                  <p className="text-[10px] mt-1" style={{ color: 'var(--m3-on-surf-var)', opacity: 0.6 }}>
                    — {ann.author.name}
                  </p>
                )}
              </div>

              {/* Dismiss / Acknowledge button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => dismiss(ann)}
                disabled={acking === ann.id}
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'var(--state-hover)' }}
                title={ann.ackRequired ? 'Acknowledge' : 'Dismiss'}
              >
                {ann.ackRequired
                  ? <CheckCircle size={13} style={{ color: ann.isUrgent ? '#ef4444' : 'var(--m3-primary)' }} />
                  : <X size={13} style={{ color: 'var(--m3-on-surf-var)' }} />
                }
              </motion.button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
