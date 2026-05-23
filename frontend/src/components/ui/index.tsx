import { ButtonHTMLAttributes, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';

/* ── Spinner ── */
export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" aria-label="Loading" />;
}

/* ── Skeleton ── */
export function Skeleton({ className = '', rounded = 'rounded-lg' }: { className?: string; rounded?: string }) {
  return (
    <div
      className={`animate-pulse bg-black/[0.06] dark:bg-white/[0.06] ${rounded} ${className}`}
      aria-hidden="true"
    />
  );
}

/* ── Card ── */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-white/[0.03] ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Button ── */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
}

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12px]',
  md: 'h-9 px-4 text-[13px]',
  lg: 'h-11 px-5 text-[14px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  children,
  className = '',
  disabled,
  ...rest
}: BtnProps) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium ' +
    'transition-[filter,background,opacity] duration-150 disabled:opacity-40 ' +
    'disabled:cursor-not-allowed focus-visible:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--brand-primary)]';

  const styles: Record<Variant, React.CSSProperties> = {
    primary: { background: 'var(--brand-primary)', color: '#fff' },
    secondary: {},
    ghost: {},
    danger: { background: '#ef4444', color: '#fff' },
  };
  const classes: Record<Variant, string> = {
    primary: 'hover:brightness-110',
    secondary:
      'border border-black/[0.12] dark:border-white/[0.14] text-black/80 dark:text-white/80 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
    ghost: 'text-black/70 dark:text-white/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]',
    danger: 'hover:brightness-110',
  };

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading}
      style={styles[variant]}
      className={`${base} ${SIZE[size]} ${classes[variant]} ${className}`}
    >
      {loading ? <Spinner size={14} /> : leftIcon}
      {children}
    </button>
  );
}

/* ── Modal ── */
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className={`relative z-10 w-full ${maxWidth} rounded-xl border border-black/[0.08] dark:border-white/[0.09] bg-white dark:bg-[#0e0e16] p-5 shadow-2xl`}
            initial={{ y: 20, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-black/90 dark:text-white/90">{title}</h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-md p-1 text-black/40 hover:text-black/80 dark:text-white/40 dark:hover:text-white/80"
                >
                  <X size={15} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
