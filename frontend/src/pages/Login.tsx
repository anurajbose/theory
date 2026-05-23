import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  motion, AnimatePresence,
  useMotionValue, useSpring, useTransform, useScroll,
} from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import {
  Eye, EyeOff, ArrowRight,
  ChevronLeft as IconLeft, ChevronRight as IconRight,
  Check, X, Loader2, Mail, Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import Turnstile, { captchaEnabled } from '../components/Turnstile';

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════════ */
const FONT = {
  serif:   'Georgia, "Times New Roman", serif',
  display: '"Inter", system-ui, -apple-system, sans-serif',
  mono:    '"SF Mono", "JetBrains Mono", ui-monospace, monospace',
};
const EXPO   = [0.16, 1, 0.3, 1] as const;
const SMOOTH = [0.65, 0, 0.35, 1] as const;

function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

/* ═══════════════════════════════════════════════════════════════
   SCENES — a corporate professional's day, each its own colour world
═══════════════════════════════════════════════════════════════ */
type Scene = 'intro' | 'clarity' | 'aligned' | 'speed' | 'report' | 'scale';
interface Slide {
  id: string; scene: Scene; number: string | null;
  time: string; context: string; accent: string; tint: string;
}
const SLIDES: Slide[] = [
  { id: 'intro',   scene: 'intro',   number: null, time: 'every day · 09:00', context: 'A workspace that moves with you, not against you.', accent: '#E8B974', tint: 'rgba(232,185,116,0.10)' },
  { id: 'clarity', scene: 'clarity', number: '01', time: 'morning · 08:42',   context: 'You open one tab. The noise simply isn’t there.',   accent: '#56D9C0', tint: 'rgba(86,217,192,0.11)'  },
  { id: 'aligned', scene: 'aligned', number: '02', time: 'standup · 09:15',   context: 'Your whole team — holding the same picture.',       accent: '#E08FD0', tint: 'rgba(224,143,208,0.11)' },
  { id: 'speed',   scene: 'speed',   number: '03', time: 'sync · 09:30',      context: 'The standup that hands your morning back.',         accent: '#F0A878', tint: 'rgba(240,168,120,0.11)' },
  { id: 'report',  scene: 'report',  number: '04', time: 'wrap-up · 17:00',   context: 'You did the work. The write-up did itself.',        accent: '#8FA8F0', tint: 'rgba(143,168,240,0.11)' },
  { id: 'scale',   scene: 'scale',   number: '05', time: 'always · 24 / 7',   context: 'Five people or five thousand — one steady rhythm.', accent: '#9FD98A', tint: 'rgba(159,217,138,0.11)' },
];


/* ═══════════════════════════════════════════════════════════════
   PROVIDER LOGOS
═══════════════════════════════════════════════════════════════ */
const GoogleLogo = () => (
  <svg width="15" height="15" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
    <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
);
const MicrosoftLogo = () => (
  <svg width="14" height="14" viewBox="0 0 20 20">
    <rect x="0" y="0" width="9" height="9" fill="#f25022"/><rect x="11" y="0" width="9" height="9" fill="#7fba00"/>
    <rect x="0" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
  </svg>
);
const GitHubLogo = () => (
  <svg width="15" height="15" viewBox="0 0 24 24"><path fill="#c9d1d9" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.745 0 .267.18.578.688.48C19.137 20.164 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>
);
const AppleLogo = () => (
  <svg width="12" height="15" viewBox="0 0 814 1000"><path fill="#e2e2f0" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.3-161-39.3c-73.5 0-98.9 40.2-158.9 40.2s-96.2-56.4-155.6-127.7C97.8 769.4 24.2 666.2 24.2 558.4c0-177.8 117.2-271.9 232.6-271.9 63.2 0 115.7 41.7 155.5 41.7 38 0 97.1-44.5 168.5-44.5 26.8 0 108.2 2.6 168.5 80.7zm-234.6-137.6c23.2-26.8 40.2-62.2 40.2-97.7 0-5.2-.6-10.4-1.3-15.5-38.6 1.3-86.7 26.2-115.5 57.7-21.5 24.5-41.7 60.5-41.7 96 0 5.8.6 11.6 1.3 13.5 3.2.6 7.1 1.3 11 1.3 35.5 0 80.7-23.9 106-55.3z"/></svg>
);
const LinkedInLogo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
);
const SlackLogo = () => (
  <svg width="14" height="14" viewBox="0 0 122.8 122.8">
    <path fill="#E01E5A" d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9z"/><path fill="#E01E5A" d="M32.3 77.6c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"/>
    <path fill="#36C5F0" d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2z"/><path fill="#36C5F0" d="M45.2 32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"/>
    <path fill="#2EB67D" d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2z"/><path fill="#2EB67D" d="M90.5 45.2c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"/>
    <path fill="#ECB22E" d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9z"/><path fill="#ECB22E" d="M77.6 90.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"/>
  </svg>
);

/* ═══════════════════════════════════════════════════════════════
   KINETIC TYPOGRAPHY
═══════════════════════════════════════════════════════════════ */
function ScatterChars({ text, delay = 0, size, font, color, italic }: {
  text: string; delay?: number; size: string; font: string; color: string; italic?: boolean;
}) {
  return (
    <span style={{ display: 'inline-block', whiteSpace: 'pre' }}>
      {text.split('').map((ch, i) => (
        <motion.span key={i}
          style={{ display: 'inline-block', fontFamily: font, fontSize: size, fontWeight: 700, fontStyle: italic ? 'italic' : 'normal', letterSpacing: '-0.03em', color, lineHeight: 1.05 }}
          initial={{ opacity: 0, x: (Math.random() - 0.5) * 180, y: (Math.random() - 0.5) * 140, rotate: (Math.random() - 0.5) * 55, filter: 'blur(7px)' }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.15, delay: delay + i * 0.045, ease: EXPO }}>
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </span>
  );
}
function BlurFocus({ text, delay = 0, size, font, color }: {
  text: string; delay?: number; size: string; font: string; color: string;
}) {
  return (
    <motion.span
      style={{ display: 'inline-block', fontFamily: font, fontSize: size, fontWeight: 700, letterSpacing: '-0.035em', color, lineHeight: 1.04 }}
      initial={{ opacity: 0, filter: 'blur(22px)', scale: 1.1, letterSpacing: '0.1em' }}
      animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, letterSpacing: '-0.035em' }}
      transition={{ duration: 1.5, delay, ease: EXPO }}>
      {text}
    </motion.span>
  );
}
function CurtainWords({ text, delay = 0, size, font, color, weight = 700, italic }: {
  text: string; delay?: number; size: string; font: string; color: string; weight?: number; italic?: boolean;
}) {
  const words = text.split(' ');
  return (
    <span style={{ display: 'block' }}>
      {words.map((w, i) => (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.09em', marginBottom: '-0.09em', verticalAlign: 'bottom' }}>
          <motion.span
            style={{ display: 'inline-block', fontFamily: font, fontSize: size, fontWeight: weight, fontStyle: italic ? 'italic' : 'normal', letterSpacing: '-0.03em', color, lineHeight: 1.08 }}
            initial={{ y: '118%' }} animate={{ y: 0 }}
            transition={{ duration: 1.15, delay: delay + i * 0.1, ease: EXPO }}>
            {w}{i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
function Typewriter({ text, delay = 0, size, font, color, caret }: {
  text: string; delay?: number; size: string; font: string; color: string; caret: string;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let i = 0;
    const s = setTimeout(() => {
      const iv = setInterval(() => { i += 1; setN(i); if (i >= text.length) clearInterval(iv); }, 46);
    }, delay * 1000);
    return () => clearTimeout(s);
  }, [text, delay]);
  return (
    <span style={{ fontFamily: font, fontSize: size, fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.02em', color, lineHeight: 1.1 }}>
      {text.slice(0, n)}
      <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} style={{ color: caret, fontWeight: 300 }}>|</motion.span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SVG GRAPHICS — hover-reactive, accent-aware
═══════════════════════════════════════════════════════════════ */
function GraphicConverge({ accent }: { accent: string }) {
  const cols = 5, rows = 4, gap = 36;
  const [hot, setHot] = useState(false);
  const pts: { x: number; y: number; rx: number; ry: number }[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++)
    pts.push({ x: x * gap, y: y * gap, rx: (Math.random() - 0.5) * 240, ry: (Math.random() - 0.5) * 240 });
  return (
    <svg width={cols * gap} height={rows * gap} style={{ overflow: 'visible', cursor: 'crosshair' }}
      onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}>
      {pts.map((p, i) => (
        <motion.circle key={i} cx={p.x} cy={p.y} fill={accent}
          initial={{ cx: p.x + p.rx, cy: p.y + p.ry, opacity: 0, r: 3 }}
          animate={{ cx: p.x, cy: p.y, opacity: hot ? 0.95 : [0, 0.95, 0.42], r: hot ? 4.5 : 3 }}
          transition={{ duration: hot ? 0.4 : 1.5, delay: hot ? i * 0.004 : 0.6 + i * 0.022, ease: EXPO }} />
      ))}
    </svg>
  );
}
function GraphicNetwork({ accent }: { accent: string }) {
  const nodes = [{ x: 20, y: 90 }, { x: 90, y: 30 }, { x: 150, y: 110 }, { x: 210, y: 50 }, { x: 130, y: 175 }, { x: 60, y: 165 }];
  const edges = [[0,1],[1,2],[2,3],[2,4],[4,5],[5,0],[1,3]];
  const [hi, setHi] = useState<number | null>(null);
  return (
    <svg width="240" height="210" style={{ overflow: 'visible' }}>
      {edges.map(([a, b], i) => {
        const lit = hi !== null && (a === hi || b === hi);
        return (
          <motion.line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
            stroke={lit ? accent : hexA(accent, 0.4)} strokeWidth={lit ? 1.8 : 1}
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.0, delay: 1.0 + i * 0.11, ease: EXPO }}
            style={{ transition: 'stroke 0.2s' }} />
        );
      })}
      {nodes.map((n, i) => (
        <motion.circle key={i} cx={n.x} cy={n.y} r={hi === i ? 8 : 5}
          fill={hi === i ? accent : '#0a0a12'} stroke={accent} strokeWidth="1.5"
          onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55 + i * 0.1, ease: EXPO }}
          style={{ transformOrigin: `${n.x}px ${n.y}px`, cursor: 'pointer', transition: 'r 0.18s, fill 0.18s' }} />
      ))}
    </svg>
  );
}
function GraphicClock({ accent }: { accent: string }) {
  return (
    <svg width="170" height="170" viewBox="0 0 170 170" style={{ overflow: 'visible' }}>
      <motion.circle cx="85" cy="85" r="62" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.4, ease: EXPO }} />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return <motion.line key={i} x1={85 + Math.cos(a) * 54} y1={85 + Math.sin(a) * 54} x2={85 + Math.cos(a) * 60} y2={85 + Math.sin(a) * 60}
          stroke="rgba(255,255,255,0.20)" strokeWidth="1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 + i * 0.045 }} />;
      })}
      <motion.line x1="85" y1="85" x2="85" y2="34" stroke={accent} strokeWidth="2.5" strokeLinecap="round"
        style={{ transformOrigin: '85px 85px' }} initial={{ rotate: 0, opacity: 0 }}
        animate={{ rotate: [0, 1080, 1080], opacity: [0, 1, 1] }} transition={{ duration: 2.2, delay: 1.0, ease: EXPO }} />
      <circle cx="85" cy="85" r="4" fill={accent} />
    </svg>
  );
}
function GraphicDoc({ accent }: { accent: string }) {
  const lines = [130, 90, 0, 120, 70, 0, 100, 55];
  return (
    <svg width="180" height="220" style={{ overflow: 'visible' }}>
      <motion.rect x="10" y="10" width="160" height="200" rx="9" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.10)" strokeWidth="1"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.1, delay: 0.4, ease: EXPO }} />
      {lines.map((w, i) => w === 0 ? null : (
        <motion.rect key={i} x="26" y={36 + i * 22} height="6" rx="3" fill={i === 0 ? accent : 'rgba(255,255,255,0.20)'}
          initial={{ width: 0, opacity: 0 }} animate={{ width: w, opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.0 + i * 0.14, ease: EXPO }} />
      ))}
    </svg>
  );
}
function GraphicSignalGrid({ accent }: { accent: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-end' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 10px)', gap: 11 }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: accent, display: 'block' }}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1, 0.62, 1], opacity: [0, 1, 0.4, 0.9] }}
            transition={{ duration: 2.4, delay: 0.55 + (i % 8) * 0.06, repeat: Infinity, repeatDelay: 0.7, ease: 'easeInOut' }} />
        ))}
      </div>
      <svg width="120" height="56" viewBox="0 0 120 56">
        <motion.path d="M30 28 C30 10, 56 10, 60 28 C64 46, 90 46, 90 28 C90 10, 64 10, 60 28 C56 46, 30 46, 30 28 Z"
          fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 2.0, delay: 0.9, ease: EXPO }} />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCENE RENDERERS
═══════════════════════════════════════════════════════════════ */
function SceneIntro({ accent }: { accent: string }) {
  return (
    <div>
      <CurtainWords text="Your work day," delay={0.05} size="clamp(2.6rem,5.2vw,5.4rem)" font={FONT.display} color="#f4f2ee" />
      <div style={{ marginTop: 6 }}>
        <CurtainWords text="rewritten." delay={0.4} size="clamp(3rem,6.2vw,6.8rem)" font={FONT.serif} color={accent} weight={400} italic />
      </div>
      <svg width="300" height="14" style={{ marginTop: 22, display: 'block' }}>
        <motion.path d="M2 8 Q 88 2, 176 7 T 298 6" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.85 }} transition={{ duration: 1.4, delay: 0.95, ease: EXPO }} />
      </svg>
    </div>
  );
}
function SceneClarity({ accent }: { accent: string }) {
  return (
    <div className="flex items-center gap-14">
      <div>
        <motion.span style={{ fontFamily: FONT.mono, fontSize: 'clamp(0.85rem,1.3vw,1.05rem)', color: 'rgba(255,255,255,0.30)', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}
          initial={{ opacity: 0 }} animate={{ opacity: [0, 0.55, 0] }} transition={{ duration: 3.0, delay: 0.3, times: [0, 0.4, 1] }}>
          48 tabs · 12 pings · 6 threads —
        </motion.span>
        <BlurFocus text="Clarity." delay={0.7} size="clamp(3.4rem,6.8vw,7.6rem)" font={FONT.display} color="#f4f2ee" />
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7, duration: 0.9, ease: EXPO }}
          style={{ marginTop: 18, fontFamily: FONT.serif, fontStyle: 'italic', fontSize: '1.05rem', color: 'rgba(255,255,255,0.42)', maxWidth: 360, lineHeight: 1.6 }}>
          One screen. Everything that matters — nothing that doesn’t.
        </motion.p>
      </div>
      <GraphicConverge accent={accent} />
    </div>
  );
}
function SceneAligned({ accent }: { accent: string }) {
  return (
    <div className="flex items-center gap-16">
      <div>
        <ScatterChars text="Aligned." delay={0.25} size="clamp(3.2rem,6.4vw,7.2rem)" font={FONT.display} color="#f4f2ee" />
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.9, ease: EXPO }}
          style={{ marginTop: 20, fontSize: '0.95rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.40)', maxWidth: 380 }}>
          Every teammate, every task, every dependency —{' '}
          <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', color: accent }}>held in one living picture.</span>
        </motion.p>
      </div>
      <GraphicNetwork accent={accent} />
    </div>
  );
}
function SceneSpeed({ accent }: { accent: string }) {
  return (
    <div className="flex items-center gap-16">
      <div>
        <div className="flex items-baseline gap-3">
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <motion.span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 'clamp(2.4rem,4.4vw,4.4rem)', color: 'rgba(255,255,255,0.24)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}>30</motion.span>
            <motion.span style={{ position: 'absolute', left: -4, right: -4, top: '52%', height: 3, background: '#ef5a5a', borderRadius: 2, transformOrigin: 'left' }}
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.0, duration: 0.5, ease: EXPO }} />
          </span>
          <motion.span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 'clamp(3.6rem,7.2vw,8.2rem)', color: '#f4f2ee', letterSpacing: '-0.04em' }}
            initial={{ scale: 2, opacity: 0, filter: 'blur(10px)' }} animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={{ delay: 1.5, duration: 0.7, ease: EXPO }}>3</motion.span>
          <motion.span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 'clamp(1.4rem,2.4vw,2.4rem)', color: accent }}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.95, duration: 0.6 }}>minutes</motion.span>
        </div>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.3, duration: 0.9, ease: EXPO }}
          style={{ marginTop: 18, fontSize: '0.95rem', color: 'rgba(255,255,255,0.40)', maxWidth: 360, lineHeight: 1.6 }}>
          The standup that gives your whole morning back.
        </motion.p>
      </div>
      <GraphicClock accent={accent} />
    </div>
  );
}
function SceneReport({ accent }: { accent: string }) {
  return (
    <div className="flex items-center gap-16">
      <div>
        <div style={{ marginBottom: 10 }}>
          <CurtainWords text="The report" delay={0.15} size="clamp(2.6rem,4.8vw,5.2rem)" font={FONT.display} color="#f4f2ee" />
        </div>
        <Typewriter text="writes itself." delay={1.05} size="clamp(2.6rem,4.8vw,5.2rem)" font={FONT.serif} color={accent} caret={accent} />
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.6, duration: 0.9, ease: EXPO }}
          style={{ marginTop: 20, fontSize: '0.95rem', color: 'rgba(255,255,255,0.40)', maxWidth: 360, lineHeight: 1.6 }}>
          You did the work. theory does the paperwork.
        </motion.p>
      </div>
      <GraphicDoc accent={accent} />
    </div>
  );
}
function SceneScale({ accent }: { accent: string }) {
  return (
    <div className="flex items-center gap-16">
      <div>
        <div className="flex items-baseline gap-4 flex-wrap">
          <CurtainWords text="One" delay={0.1} size="clamp(2.8rem,5.4vw,6rem)" font={FONT.display} color="#f4f2ee" />
          <CurtainWords text="rhythm." delay={0.35} size="clamp(3rem,5.8vw,6.6rem)" font={FONT.serif} color={accent} weight={400} italic />
        </div>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.9, ease: EXPO }}
          style={{ marginTop: 20, fontSize: '0.95rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.40)', maxWidth: 380 }}>
          From a five-person team to a five-thousand-person org —{' '}
          <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', color: accent }}>theory keeps the beat.</span>
        </motion.p>
      </div>
      <GraphicSignalGrid accent={accent} />
    </div>
  );
}
const SCENES: Record<Scene, (p: { accent: string }) => JSX.Element> = {
  intro: SceneIntro, clarity: SceneClarity, aligned: SceneAligned,
  speed: SceneSpeed, report: SceneReport, scale: SceneScale,
};

/* ═══════════════════════════════════════════════════════════════
   SLIDE DISPLAY
═══════════════════════════════════════════════════════════════ */
function SlideDisplay({ slide }: { slide: Slide }) {
  const Scene = SCENES[slide.scene];
  const [narrow, setNarrow] = useState(typeof window !== 'undefined' ? window.innerWidth < 760 : false);
  useEffect(() => {
    const r = () => setNarrow(window.innerWidth < 760);
    window.addEventListener('resize', r, { passive: true });
    return () => window.removeEventListener('resize', r);
  }, []);
  return (
    <div className="absolute inset-0 flex flex-col"
      style={narrow
        ? { justifyContent: 'flex-start', paddingLeft: 28, paddingRight: 24, paddingTop: 76, paddingBottom: 24 }
        : { justifyContent: 'center', paddingLeft: 'max(340px, 22vw)', paddingRight: '6vw', paddingBottom: 96, paddingTop: 56 }}>
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: EXPO }}
        className="flex items-center gap-3 mb-8">
        {slide.number && (
          <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.32em', color: 'rgba(255,255,255,0.24)' }}>{slide.number}</span>
        )}
        <motion.div style={{ height: 1, background: slide.accent }} initial={{ width: 0 }} animate={{ width: 32 }}
          transition={{ delay: 0.2, duration: 0.9, ease: EXPO }} />
        <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)' }}>
          {slide.time}
        </span>
      </motion.div>
      <Scene accent={slide.accent} />
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 1.0, ease: SMOOTH }}
        style={{ marginTop: 34, fontFamily: FONT.mono, fontSize: 11, letterSpacing: '0.03em', color: 'rgba(255,255,255,0.26)' }}>
        {slide.context}
      </motion.p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PANEL INPUT
═══════════════════════════════════════════════════════════════ */
function PanelInput({ type, value, onChange, placeholder, autoComplete, disabled, suffix, accent }: {
  type: 'email' | 'password' | 'text'; value: string; onChange: (v: string) => void;
  placeholder: string; autoComplete: string; disabled?: boolean; suffix?: React.ReactNode; accent: string;
}) {
  const [f, setF] = useState(false);
  return (
    <div className="relative rounded-lg overflow-hidden" style={{
      background: f ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${f ? hexA(accent, 0.55) : 'rgba(255,255,255,0.085)'}`,
      boxShadow: f ? `0 0 0 3px ${hexA(accent, 0.10)}` : 'none',
      transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <input type={type} autoComplete={autoComplete} placeholder={placeholder} value={value} disabled={disabled}
        onFocus={() => setF(true)} onBlur={() => setF(false)} onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent px-3 py-2.5 text-[12.5px] outline-none"
        style={{ color: 'rgba(255,255,255,0.88)', caretColor: accent, paddingRight: suffix ? '2.4rem' : '0.75rem' }} />
      {suffix && <div className="absolute inset-y-0 right-2.5 flex items-center">{suffix}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REQUEST ACCESS MODAL
═══════════════════════════════════════════════════════════════ */
function RequestAccessModal({ onClose, accent }: { onClose: () => void; accent: string }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [dept, setDept] = useState(''); const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false); const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); if (!name || !email) return; setLoading(true); await new Promise(r => setTimeout(r, 900)); setSent(true); setLoading(false); }
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)' }} onClick={onClose} />
      <motion.div className="relative w-full max-w-sm rounded-2xl p-6 z-10"
        style={{ background: 'rgba(10,10,16,0.97)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 40px 100px rgba(0,0,0,0.95)', backdropFilter: 'blur(32px)' }}
        initial={{ y: 26, scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 26, scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3, ease: EXPO }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md" style={{ color: 'rgba(255,255,255,0.28)' }}><X size={13} /></button>
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div key="ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
              <motion.div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: hexA(accent, 0.12) }}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 18 }}>
                <Check size={20} style={{ color: accent }} />
              </motion.div>
              <p className="font-semibold text-[13px] mb-1" style={{ color: '#e6e6f2' }}>Request sent</p>
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.30)' }}>Your admin will review and send an invite within 24 hours.</p>
              <button onClick={onClose} className="mt-5 text-[12px] font-medium px-4 py-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.65)' }}>Close</button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: hexA(accent, 0.14) }}>
                  <Mail size={13} style={{ color: accent }} />
                </div>
                <div>
                  <p className="font-semibold text-[13px]" style={{ color: '#e6e6f2' }}>Request Access</p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.26)' }}>Admin will send you an invite</p>
                </div>
              </div>
              <form onSubmit={submit} className="space-y-3">
                {([
                  { label: 'Full name', val: name, set: setName, ph: 'Priya Sharma', type: 'text' as const, ac: 'name' },
                  { label: 'Work email', val: email, set: setEmail, ph: 'priya@company.com', type: 'email' as const, ac: 'email' },
                ] as const).map(({ label, val, set, ph, type, ac }) => (
                  <div key={label}>
                    <label className="block text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.28)' }}>{label}</label>
                    <PanelInput type={type} value={val} onChange={set} placeholder={ph} autoComplete={ac} accent={accent} />
                  </div>
                ))}
                <div>
                  <label className="block text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    Department <span style={{ opacity: 0.45 }}>(optional)</span>
                  </label>
                  <select value={dept} onChange={e => setDept(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-[12.5px] outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.085)', color: dept ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.22)' }}>
                    <option value="">Select department…</option>
                    {['Engineering', 'Product', 'Operations', 'Sales', 'Finance', 'HR'].map(d => (
                      <option key={d} value={d} style={{ background: '#0a0a14', color: '#e6e6f2' }}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    Message <span style={{ opacity: 0.45 }}>(optional)</span>
                  </label>
                  <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Why do you need access?" rows={2}
                    className="w-full rounded-lg px-3 py-2.5 text-[12.5px] outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.085)', color: 'rgba(255,255,255,0.86)' }} />
                </div>
                <motion.button type="submit" disabled={loading || !name || !email}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12.5px] font-semibold disabled:opacity-25 disabled:cursor-not-allowed"
                  style={{ background: accent, color: '#0a0a12' }} whileHover={{ filter: 'brightness(1.08)' }} whileTap={{ scale: 0.97 }}>
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <><Send size={12} /> Send Request</>}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOADING SCREEN
═══════════════════════════════════════════════════════════════ */
function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const duration = 1900, start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      setProgress(Math.round(e * 100));
      if (p < 1) requestAnimationFrame(tick);
      else { setTimeout(() => setReady(true), 280); setTimeout(() => onDone(), 1000); }
    };
    const f = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(f);
  }, [onDone]);
  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: '#050509' }}
      exit={{ opacity: 0, filter: 'blur(8px)', transition: { duration: 0.7, ease: SMOOTH } }}>
      <motion.div initial={{ opacity: 0, y: 16, letterSpacing: '0.1em' }} animate={{ opacity: 1, y: 0, letterSpacing: '-0.02em' }}
        transition={{ delay: 0.15, duration: 1.1, ease: EXPO }}
        style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 52, color: 'rgba(255,255,255,0.90)' }}>
        theory
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.5 }}
        style={{ marginTop: 30, position: 'relative', width: 210, height: 1 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: 'rgba(255,255,255,0.50)', transition: 'width 0.07s linear' }} />
        <div style={{ position: 'absolute', top: -3, left: `${progress}%`, transform: 'translateX(-50%)', width: 52, height: 7,
          background: hexA('#E8B974', 0.7), filter: 'blur(5px)', borderRadius: 4, transition: 'left 0.07s linear', opacity: progress > 0 && progress < 100 ? 1 : 0 }} />
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.5 }}
        style={{ marginTop: 18, fontSize: 10, fontFamily: FONT.mono, letterSpacing: '0.24em', color: 'rgba(255,255,255,0.22)' }}>
        <AnimatePresence mode="wait">
          {ready ? <motion.span key="r" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ color: 'rgba(255,255,255,0.45)' }}>WELCOME</motion.span>
            : <motion.span key="p" exit={{ opacity: 0 }}>{String(progress).padStart(3, ' ')}%</motion.span>}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCROLL CUE
═══════════════════════════════════════════════════════════════ */
function ScrollCue({ visible, accent }: { visible: boolean; accent: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed flex flex-col items-center gap-2 pointer-events-none"
          style={{ bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
          transition={{ delay: 1.4, duration: 0.7, ease: EXPO }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)' }}>
            Scroll
          </span>
          <div style={{ width: 20, height: 32, borderRadius: 11, border: '1px solid rgba(255,255,255,0.22)', position: 'relative' }}>
            <motion.div style={{ position: 'absolute', left: '50%', top: 6, width: 3, height: 6, borderRadius: 2, background: accent, x: '-50%' }}
              animate={{ y: [0, 9, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN PANEL — adopts active scene accent, rich hover feedback
═══════════════════════════════════════════════════════════════ */
interface PanelProps {
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  showPw: boolean; setShowPw: (v: boolean) => void;
  loading: boolean; ssoLoading: string | null; accent: string;
  onSubmit: (e: FormEvent | React.MouseEvent) => void;
  onGoogleClick: () => void; onUnconfigured: (n: string) => void;
  onRequestAccess: () => void;
  onCaptcha: (t: string | null) => void;
}
function LoginPanel(p: PanelProps) {
  const [btnH, setBtnH] = useState(false);
  const [linkH, setLinkH] = useState(false);
  const [hov, setHov] = useState<string | null>(null);

  // Only ship auth that actually works. Non-functional SSO buttons
  // destroy enterprise trust — Google is the one real provider today.
  const providers = [
    { key: 'google', label: 'Google', logo: p.ssoLoading === 'google' ? <Loader2 size={13} className="animate-spin" style={{ color: '#4285F4' }} /> : <GoogleLogo /> },
  ];
  function ssoClick(k: string) {
    if (k === 'google') { p.onGoogleClick(); return; }
  }
  return (
    <div className="fixed z-30 flex flex-col" style={{ bottom: 24, left: 24, width: 292 }}>
      <motion.div className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(7,7,11,0.92)',
          border: `1px solid ${hexA(p.accent, 0.14)}`,
          backdropFilter: 'blur(30px) saturate(1.5)', WebkitBackdropFilter: 'blur(30px) saturate(1.5)',
          transition: 'border-color 1.1s cubic-bezier(0.65,0,0.35,1)',
        }}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0, boxShadow: [`0 0 0 0 ${hexA(p.accent, 0)}`, `0 0 44px 3px ${hexA(p.accent, 0.09)}`, `0 0 0 0 ${hexA(p.accent, 0)}`] }}
        transition={{ opacity: { delay: 0.6, duration: 0.7 }, y: { delay: 0.6, duration: 0.7, ease: EXPO }, boxShadow: { delay: 2, duration: 4.5, repeat: Infinity, ease: 'easeInOut' } }}>
        <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 16, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.78)' }}>theory</span>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', color: hexA(p.accent, 0.7), padding: '1px 5px',
              border: `1px solid ${hexA(p.accent, 0.25)}`, borderRadius: 3, fontFamily: FONT.mono, transition: 'all 1.1s cubic-bezier(0.65,0,0.35,1)' }}>WORKSPACE</span>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.24)', fontFamily: FONT.mono }}>Email</label>
            <PanelInput type="email" autoComplete="email" placeholder="you@theory.in" value={p.email} onChange={p.setEmail} disabled={p.loading} accent={p.accent} />
          </div>
          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.24)', fontFamily: FONT.mono }}>Password</label>
            <PanelInput type={p.showPw ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={p.password} onChange={p.setPassword} disabled={p.loading} accent={p.accent}
              suffix={<button type="button" tabIndex={-1} onClick={() => p.setShowPw(!p.showPw)} style={{ color: 'rgba(255,255,255,0.26)' }}>{p.showPw ? <EyeOff size={12} /> : <Eye size={12} />}</button>} />
            <div className="flex justify-end mt-1.5">
              <Link to="/forgot-password" tabIndex={-1}
                className="text-[10px] font-medium transition-colors"
                style={{ color: 'rgba(255,255,255,0.34)', fontFamily: FONT.mono }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = hexA(p.accent, 0.85)}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.34)'}>
                Forgot password?
              </Link>
            </div>
          </div>
          {captchaEnabled() && (
            <div className="flex justify-center"><Turnstile onToken={p.onCaptcha} /></div>
          )}
          <motion.button type="button" onClick={p.onSubmit} disabled={p.loading || !p.email || !p.password}
            onMouseEnter={() => setBtnH(true)} onMouseLeave={() => setBtnH(false)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12.5px] font-semibold disabled:opacity-25 disabled:cursor-not-allowed"
            style={{ background: p.accent, color: '#0a0a12', filter: btnH ? 'brightness(1.1)' : 'brightness(1)',
              boxShadow: btnH ? `0 8px 24px ${hexA(p.accent, 0.35)}` : 'none',
              transition: 'background 1.1s cubic-bezier(0.65,0,0.35,1), filter 0.2s, box-shadow 0.25s' }}
            whileHover={{ y: -1 }} whileTap={{ scale: 0.97, y: 0 }}>
            <AnimatePresence mode="wait">
              {p.loading ? <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Loader2 size={13} className="animate-spin" /></motion.span>
                : <motion.span key="t" className="flex items-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    Sign in <motion.span animate={{ x: btnH ? 3 : 0 }} transition={{ duration: 0.2 }}><ArrowRight size={12} /></motion.span>
                  </motion.span>}
            </AnimatePresence>
          </motion.button>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.055)' }} />
            <span className="text-[8.5px] uppercase tracking-widest font-medium" style={{ color: 'rgba(255,255,255,0.15)', fontFamily: FONT.mono }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.055)' }} />
          </div>
          <div>
            {providers.map(pr => {
              const on = hov === pr.label;
              return (
                <motion.button key={pr.key} onClick={() => ssoClick(pr.key)} disabled={!!p.ssoLoading}
                  onMouseEnter={() => setHov(pr.label)} onMouseLeave={() => setHov(null)}
                  className="w-full h-9 flex items-center justify-center gap-2 rounded-lg disabled:opacity-30 text-[12px] font-medium"
                  style={{ background: on ? hexA(p.accent, 0.12) : 'rgba(255,255,255,0.038)',
                    border: `1px solid ${on ? hexA(p.accent, 0.45) : 'rgba(255,255,255,0.075)'}`,
                    color: 'rgba(255,255,255,0.82)',
                    boxShadow: on ? `0 6px 18px ${hexA(p.accent, 0.20)}` : 'none',
                    transition: 'background 0.2s, border-color 0.22s, box-shadow 0.22s' }}
                  animate={{ y: on ? -2 : 0 }} transition={{ duration: 0.18, ease: EXPO }}
                  whileTap={{ scale: 0.97 }}>
                  {pr.logo}<span>Continue with {pr.label}</span>
                </motion.button>
              );
            })}
          </div>
          <div className="text-center pt-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.20)' }}>No account? </span>
            <button onClick={p.onRequestAccess} onMouseEnter={() => setLinkH(true)} onMouseLeave={() => setLinkH(false)}
              className="text-[10.5px] font-medium relative" style={{ color: p.accent, transition: 'color 1.1s cubic-bezier(0.65,0,0.35,1)' }}>
              Request access →
              <motion.span style={{ position: 'absolute', left: 0, bottom: -2, height: 1, background: p.accent }}
                animate={{ width: linkH ? '100%' : '0%' }} transition={{ duration: 0.28, ease: EXPO }} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN — scroll-driven narrative (Fauna model)
═══════════════════════════════════════════════════════════════ */
export default function Login() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [active, setActive] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<string | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  /* cursor ambient */
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 45, damping: 22 });
  const springY = useSpring(rawY, { stiffness: 45, damping: 22 });
  const slowX = useSpring(rawX, { stiffness: 16, damping: 14 });
  const slowY = useSpring(rawY, { stiffness: 16, damping: 14 });
  const wmX = useTransform(slowX, v => v * 0.03);
  const wmY = useTransform(slowY, v => v * 0.03);
  useEffect(() => {
    const onMove = (e: MouseEvent) => { rawX.set(e.clientX - window.innerWidth / 2); rawY.set(e.clientY - window.innerHeight / 2); };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [rawX, rawY]);

  /* scroll-tied progress */
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const progressScaleX = useSpring(scrollYProgress, { stiffness: 80, damping: 26 });

  /* which section is in view → drives colour world + accent */
  useEffect(() => {
    if (!isLoaded) return;
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting && e.intersectionRatio >= 0.55) {
            setActive(Number((e.target as HTMLElement).dataset.idx));
          }
        });
      },
      { root: scrollRef.current, threshold: [0.55, 0.8] },
    );
    sectionRefs.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [isLoaded]);

  function goTo(i: number) {
    sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth' });
  }
  function step(d: number) {
    goTo(Math.max(0, Math.min(SLIDES.length - 1, active + d)));
  }

  async function handleSubmit(e: FormEvent | React.MouseEvent) {
    e.preventDefault();
    try {
      await login(email.trim().toLowerCase(), password, captchaToken ?? undefined);
      const u = useAuthStore.getState().user!;
      navigate(u.onboarded ? '/daily' : '/onboarding', { replace: true });
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid credentials';
      toast.error(m);
    }
  }
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const googleLogin = useGoogleLogin({
    onSuccess: async (tr) => {
      try {
        const { data } = await api.post('/auth/google', { accessToken: tr.access_token });
        useAuthStore.getState().setAuth(data.accessToken, data.refreshToken, data.user);
        navigate(data.user.onboarded ? '/daily' : '/onboarding', { replace: true });
      } catch { toast.error('Google sign-in failed. Try email/password.'); }
      finally { setSsoLoading(null); }
    },
    onError: () => { toast.error('Google sign-in cancelled.'); setSsoLoading(null); },
  });
  function handleGoogleClick() {
    if (!GOOGLE_CLIENT_ID) { toast('Google SSO not configured. Ask your admin.', { icon: 'ℹ️', duration: 4000 }); return; }
    setSsoLoading('google'); googleLogin();
  }
  function handleUnconfigured(n: string) { toast(`${n} SSO is not configured yet.`, { icon: 'ℹ️', duration: 3500 }); }

  const slide = SLIDES[active];

  return (
    <>
      <style>{`
        .theory-login input::placeholder{color:rgba(255,255,255,0.20)}
        .theory-login select option{background:#09090f;color:#e6e6f2}
        .theory-scroll{scrollbar-width:none;-ms-overflow-style:none}
        .theory-scroll::-webkit-scrollbar{display:none}
      `}</style>

      <AnimatePresence>
        {!isLoaded && <LoadingScreen onDone={() => setIsLoaded(true)} />}
      </AnimatePresence>

      <AnimatePresence>
        {isLoaded && (
          <motion.div key="main" className="theory-login fixed inset-0 overflow-hidden select-none"
            style={{ background: '#070710' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, ease: SMOOTH }}>

            {/* ── PINNED VISUAL LAYER (does not scroll) ── */}
            <AnimatePresence>
              <motion.div key={slide.id} className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 75% 70% at 62% 42%, ${slide.tint} 0%, transparent 62%)`, zIndex: 0 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 1.6, ease: SMOOTH }} />
            </AnimatePresence>

            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.014) 1px, transparent 1px)', backgroundSize: '32px 32px', zIndex: 1 }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 88% 88% at 55% 45%, transparent 22%, rgba(0,0,0,0.62) 100%)', zIndex: 1 }} />

            {/* grain */}
            <svg width="0" height="0"><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter></svg>
            <div className="absolute inset-0 pointer-events-none" style={{ filter: 'url(#grain)', opacity: 0.035, mixBlendMode: 'overlay', zIndex: 1 }} />

            <motion.div className="absolute pointer-events-none"
              style={{ width: 760, height: 760, borderRadius: '50%', x: springX, y: springY, translateX: '-50%', translateY: '-50%', zIndex: 1,
                background: `radial-gradient(circle, ${hexA(slide.accent, 0.06)} 0%, transparent 70%)`, transition: 'background 1.6s cubic-bezier(0.65,0,0.35,1)' }} />
            <motion.div className="absolute pointer-events-none"
              style={{ width: 520, height: 520, borderRadius: '50%', x: slowX, y: slowY, translateX: '-50%', translateY: '-50%', zIndex: 1,
                background: `radial-gradient(circle, ${hexA(slide.accent, 0.035)} 0%, transparent 70%)`, transition: 'background 1.6s cubic-bezier(0.65,0,0.35,1)' }} />

            <motion.div className="absolute pointer-events-none"
              style={{ right: '-3%', bottom: '-10%', fontSize: 'min(52vw, 720px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.06em',
                fontFamily: FONT.serif, fontStyle: 'italic', color: 'rgba(255,255,255,0.013)', zIndex: 1, userSelect: 'none', x: wmX, y: wmY }}>
              theory
            </motion.div>

            {/* pinned scene — cross-fades as scroll changes active section */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
              <AnimatePresence mode="wait">
                <motion.div key={active} className="absolute inset-0"
                  initial={{ opacity: 0, y: 26, filter: 'blur(7px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -26, filter: 'blur(7px)' }}
                  transition={{ duration: 0.8, ease: SMOOTH }}>
                  <SlideDisplay slide={slide} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── SCROLL SURFACE (transparent spacers drive the story) ── */}
            <div ref={scrollRef} className="theory-scroll absolute inset-0"
              style={{ overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollBehavior: 'smooth', zIndex: 10 }}>
              {SLIDES.map((s, i) => (
                <div key={s.id} data-idx={i}
                  ref={el => { sectionRefs.current[i] = el; }}
                  style={{ height: '100vh', scrollSnapAlign: 'start', pointerEvents: 'none' }} />
              ))}
            </div>

            {/* login panel */}
            <LoginPanel email={email} setEmail={setEmail} password={password} setPassword={setPassword}
              showPw={showPw} setShowPw={setShowPw} loading={loading} ssoLoading={ssoLoading} accent={slide.accent}
              onSubmit={handleSubmit} onGoogleClick={handleGoogleClick} onUnconfigured={handleUnconfigured}
              onRequestAccess={() => setShowRequest(true)}
              onCaptcha={setCaptchaToken} />

            {/* scroll cue (intro only) */}
            <ScrollCue visible={active === 0} accent={slide.accent} />

            {/* nav rail — section dots + arrows (hover feedback) */}
            <motion.div className="fixed flex items-center gap-4" style={{ bottom: 28, right: 28, zIndex: 30 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0, duration: 0.8 }}>
              <div className="flex items-center gap-1.5">
                {SLIDES.map((s, i) => (
                  <motion.button key={i} onClick={() => goTo(i)} aria-label={`Go to ${s.id}`}
                    onMouseEnter={e => { if (i !== active) (e.currentTarget as HTMLElement).style.background = hexA(s.accent, 0.6); }}
                    onMouseLeave={e => { if (i !== active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.16)'; }}
                    animate={{ width: i === active ? 22 : 6, background: i === active ? s.accent : 'rgba(255,255,255,0.16)' }}
                    transition={{ duration: 0.5, ease: EXPO }} style={{ height: 6, borderRadius: 3, transition: 'background 0.2s' }} />
                ))}
              </div>
              <span style={{ fontSize: 9, fontFamily: FONT.mono, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.20)' }}>
                {String(active + 1).padStart(2, '0')}&nbsp;/&nbsp;{String(SLIDES.length).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-1">
                {[{ i: <IconLeft size={11} />, d: -1 }, { i: <IconRight size={11} />, d: 1 }].map(({ i, d }, k) => (
                  <motion.button key={k} onClick={() => step(d)} className="w-7 h-7 flex items-center justify-center rounded-md"
                    style={{ color: 'rgba(255,255,255,0.32)', border: '1px solid rgba(255,255,255,0.09)', transition: 'color 0.2s, border-color 0.2s' }}
                    whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = hexA(slide.accent, 0.5); }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.32)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.09)'; }}>
                    {i}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            <motion.div className="fixed pointer-events-none" style={{ bottom: 26, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.8 }}>
              <span style={{ fontSize: 8.5, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.10)', fontFamily: FONT.mono, textTransform: 'uppercase' }}>
                © {new Date().getFullYear()} Theory · All rights reserved
              </span>
            </motion.div>

            {/* scroll-tied progress bar */}
            <div className="fixed bottom-0 left-0 right-0 z-30" style={{ height: 2, background: 'rgba(255,255,255,0.04)' }}>
              <motion.div className="h-full relative" style={{ background: hexA(slide.accent, 0.6), scaleX: progressScaleX, transformOrigin: '0% 50%', transition: 'background 1.1s cubic-bezier(0.65,0,0.35,1)' }}>
                <div style={{ position: 'absolute', right: 0, top: -3, width: 56, height: 8, background: hexA(slide.accent, 0.8), filter: 'blur(6px)', borderRadius: '0 4px 4px 0' }} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRequest && <RequestAccessModal onClose={() => setShowRequest(false)} accent={slide.accent} />}
      </AnimatePresence>
    </>
  );
}
