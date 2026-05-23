/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ── Brand constants ── */
        navy:    '#1B2A5E',
        brand:   '#1E4DB7',
        teal:    '#0093B2',
        orange:  '#E8501A',

        /* ── M3 Surface System (CSS vars, toggled by .dark) ── */
        m3bg:       'var(--m3-bg)',
        surf0:      'var(--m3-surf0)',   /* surface */
        surf1:      'var(--m3-surf1)',   /* surface-container-low */
        surf2:      'var(--m3-surf2)',   /* surface-container */
        surf3:      'var(--m3-surf3)',   /* surface-container-high */
        surf4:      'var(--m3-surf4)',   /* surface-container-highest */

        /* ── M3 On-Surface ── */
        'on-surf':      'var(--m3-on-surf)',
        'on-surf-var':  'var(--m3-on-surf-var)',

        /* ── M3 Primary ── */
        primary:     'var(--m3-primary)',
        'on-primary':'var(--m3-on-primary)',
        'prim-c':    'var(--m3-prim-c)',    /* primary-container */
        'on-prim-c': 'var(--m3-on-prim-c)', /* on-primary-container */

        /* ── M3 Secondary ── */
        secondary:   'var(--m3-secondary)',
        'sec-c':     'var(--m3-sec-c)',

        /* ── M3 Outline ── */
        outline:     'var(--m3-outline)',
        'outline-v': 'var(--m3-outline-v)',

        /* ── Legacy aliases for smooth migration ── */
        surface: 'var(--m3-surf0)',
        light:   'var(--m3-surf1)',
        border:  'var(--m3-outline-v)',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        /* M3 Type Scale */
        'display-l':  ['57px', { lineHeight: '64px', letterSpacing: '-0.25px' }],
        'display-m':  ['45px', { lineHeight: '52px', letterSpacing: '0' }],
        'display-s':  ['36px', { lineHeight: '44px', letterSpacing: '0' }],
        'headline-l': ['32px', { lineHeight: '40px', letterSpacing: '0' }],
        'headline-m': ['28px', { lineHeight: '36px', letterSpacing: '0' }],
        'headline-s': ['24px', { lineHeight: '32px', letterSpacing: '0' }],
        'title-l':    ['22px', { lineHeight: '28px', letterSpacing: '0' }],
        'title-m':    ['16px', { lineHeight: '24px', letterSpacing: '0.15px', fontWeight: '500' }],
        'title-s':    ['14px', { lineHeight: '20px', letterSpacing: '0.1px',  fontWeight: '500' }],
        'body-l':     ['16px', { lineHeight: '24px', letterSpacing: '0.5px' }],
        'body-m':     ['14px', { lineHeight: '20px', letterSpacing: '0.25px' }],
        'body-s':     ['12px', { lineHeight: '16px', letterSpacing: '0.4px' }],
        'label-l':    ['14px', { lineHeight: '20px', letterSpacing: '0.1px',  fontWeight: '500' }],
        'label-m':    ['12px', { lineHeight: '16px', letterSpacing: '0.5px',  fontWeight: '500' }],
        'label-s':    ['11px', { lineHeight: '16px', letterSpacing: '0.5px',  fontWeight: '500' }],
      },

      borderRadius: {
        'xs':   '4px',
        'sm':   '8px',
        DEFAULT: '12px',
        'md':   '12px',
        'lg':   '16px',
        'xl':   '20px',
        '2xl':  '24px',
        '3xl':  '28px',
        '4xl':  '32px',
        card:   '20px',
        pill:   '9999px',
      },

      boxShadow: {
        /* Elevation scale — works for both light and dark (dark override via CSS vars) */
        'e1': '0 1px 2px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        'e2': '0 2px 8px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
        'e3': '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
        'e4': '0 16px 48px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08)',
        /* Accent glow */
        'glow': '0 0 20px rgba(99,102,241,0.25)',
        'glow-sm': '0 0 10px rgba(99,102,241,0.20)',
        card: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
      },

      transitionTimingFunction: {
        'spring':     'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'emphasize':  'cubic-bezier(0.2, 0, 0, 1)',
        'm3-decel':   'cubic-bezier(0, 0, 0, 1)',
        'm3-accel':   'cubic-bezier(0.3, 0, 1, 1)',
        'm3-standard':'cubic-bezier(0.2, 0, 0, 1)',
      },

      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-soft': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '20px',
        xl: '40px',
      },
    },
  },
  plugins: [],
};
