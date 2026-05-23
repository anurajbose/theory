import { motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════
   THEORY · brand mark + wordmark
   The mark is a geometric theta glyph (the mathematical sign of
   "theory") — a perfect ring crossed by a horizontal bar. Renders
   crisply from 16px (favicon) to 256px (social avatar). The
   wordmark is the calligraphy "theory" in Cormorant Garamond
   italic. Together they're the THEORY identity.
   © 2026 THEORY. All rights reserved.
   ═══════════════════════════════════════════════════════════════ */

/* ─── Mark (geometric theta glyph) ─────────────────────────────── */

interface MarkProps {
  size?: number;
  /** Stroke + fill colour. Defaults to the brand accent CSS variable. */
  color?: string;
  /** Render as a solid filled badge (good for social avatars / favicon). */
  filled?: boolean;
  /** Subtle entrance draw animation. */
  animate?: boolean;
  className?: string;
  title?: string;
}

export function TheoryMark({
  size = 24,
  color = 'var(--brand-primary, #7C3AED)',
  filled = false,
  animate = false,
  className,
  title = 'theory',
}: MarkProps) {
  const stroke = Math.max(1.4, size * 0.07);
  const inner = filled ? (
    /* Solid theta on a tinted disc */
    <>
      <circle cx="12" cy="12" r="11" fill={color} opacity="0.14" />
      <circle cx="12" cy="12" r="8" fill="none" stroke={color} strokeWidth={stroke} />
      <line x1="5.4" y1="12" x2="18.6" y2="12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </>
  ) : animate ? (
    <>
      <motion.circle
        cx="12" cy="12" r="8.4"
        fill="none" stroke={color} strokeWidth={stroke}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.line
        x1="5.4" y1="12" x2="18.6" y2="12"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
      />
      {/* Signal node — the tiny operational pulse on the crossbar */}
      <motion.circle
        cx="12" cy="12" r="1.3" fill={color}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, delay: 1.05 }}
      />
    </>
  ) : (
    <>
      <circle cx="12" cy="12" r="8.4" fill="none" stroke={color} strokeWidth={stroke} />
      <line x1="5.4" y1="12" x2="18.6" y2="12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.3" fill={color} />
    </>
  );

  return (
    <svg
      role="img"
      aria-label={title}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {inner}
    </svg>
  );
}

/* ─── Wordmark (calligraphy "theory") ──────────────────────────── */

interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  dark?: boolean;
  animate?: boolean;
  className?: string;
}

const WORD_SIZES = {
  sm:   { word: 'text-[20px]',  line: 40  },
  md:   { word: 'text-[28px]',  line: 56  },
  lg:   { word: 'text-[40px]',  line: 72  },
  hero: { word: 'text-[64px]',  line: 100 },
};
const LETTERS = 'theory'.split('');

export function TheoryWordmark({
  size = 'md', dark = false, animate = true, className,
}: WordmarkProps) {
  const s = WORD_SIZES[size];
  const textColor = dark ? 'text-white' : 'text-[#0B1020]';

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
  };
  const letter = {
    hidden:  { opacity: 0, y: 16, filter: 'blur(3px)' },
    visible: {
      opacity: 1, y: 0, filter: 'blur(0px)',
      transition: { type: 'spring' as const, damping: 16, stiffness: 130 },
    },
  };

  return (
    <span className={`relative inline-block leading-none ${className ?? ''}`}>
      <motion.span
        className={`flex items-baseline ${s.word} ${textColor} leading-none`}
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: 'italic',
          fontWeight: 500,
          letterSpacing: '-0.005em',
        }}
        variants={animate ? container : undefined}
        initial={animate ? 'hidden' : false}
        animate={animate ? 'visible' : false}
      >
        {LETTERS.map((ch, i) => (
          <motion.span
            key={i}
            variants={animate ? letter : undefined}
            style={{ display: 'inline-block' }}
          >
            {ch}
          </motion.span>
        ))}
      </motion.span>
      {/* Signature flourish — drawn underline */}
      <motion.svg
        className="absolute -bottom-1 left-0 w-full overflow-visible pointer-events-none"
        height="6" viewBox={`0 0 ${s.line} 6`} preserveAspectRatio="none" fill="none"
      >
        <motion.path
          d={`M1,4 Q${s.line * 0.3},0 ${s.line * 0.55},3 Q${s.line * 0.8},6 ${s.line - 1},2`}
          stroke="var(--brand-primary, #7C3AED)"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={animate ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.85, delay: 0.45, ease: 'easeOut' }}
        />
      </motion.svg>
    </span>
  );
}

/* ─── Default composed logo (mark + wordmark) ─────────────────── */

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  dark?: boolean;
  animate?: boolean;
  /** Show "operational intelligence" sub-label under the wordmark. */
  showSub?: boolean;
  /** Horizontal mark + wordmark vs. centred stack. Default: horizontal. */
  layout?: 'inline' | 'stack';
  className?: string;
}

const MARK_PX: Record<NonNullable<LogoProps['size']>, number> = {
  sm: 22, md: 30, lg: 44, hero: 68,
};

export default function TheoryLogo({
  size = 'md', dark = false, animate = true, showSub = false,
  layout = 'inline', className,
}: LogoProps) {
  const subColor = dark ? 'text-white/45' : 'text-slate-500/70';
  const subSize = size === 'hero' ? 'text-sm'
                : size === 'lg' ? 'text-xs'
                : 'text-[10px]';
  const wrap = layout === 'stack' ? 'flex-col items-center gap-2' : 'items-center gap-2.5';

  return (
    <div className={`flex ${wrap} select-none ${className ?? ''}`}>
      <TheoryMark
        size={MARK_PX[size]}
        animate={animate}
        color={dark ? '#a78bfa' : 'var(--brand-primary, #7C3AED)'}
      />
      <div className={layout === 'stack' ? 'flex flex-col items-center gap-1.5' : 'flex flex-col gap-0.5'}>
        <TheoryWordmark size={size} dark={dark} animate={animate} />
        {showSub && (
          <motion.span
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: animate ? 0.85 : 0, duration: 0.45 }}
            className={`${subColor} ${subSize} uppercase font-sans font-medium`}
            style={{ letterSpacing: '0.22em' }}
          >
            operational intelligence
          </motion.span>
        )}
      </div>
    </div>
  );
}

/* ─── Compact icon for sidebar collapsed / favicon fallback ────── */

export function TheoryIcon({ dark = true, size = 22 }: { dark?: boolean; size?: number }) {
  return (
    <TheoryMark
      size={size}
      color={dark ? '#a78bfa' : 'var(--brand-primary, #7C3AED)'}
    />
  );
}
