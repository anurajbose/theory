import { useEffect, useRef } from 'react';

/* ─────────────────────────────────────────────────────────────
   Cloudflare Turnstile — modern, privacy-first CAPTCHA.
   Env-gated: if VITE_TURNSTILE_SITE_KEY is not set, this renders
   nothing and never blocks (dev / self-host stays frictionless).
   The backend mirrors this: it only enforces when its secret is
   configured, so the two sides degrade together safely.
   ───────────────────────────────────────────────────────────── */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

interface TurnstileGlobal {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      theme?: 'auto' | 'light' | 'dark';
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
    },
  ) => string;
  remove: (id: string) => void;
}

declare global {
  interface Window { turnstile?: TurnstileGlobal }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Turnstile failed to load'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function captchaEnabled(): boolean {
  return Boolean(SITE_KEY);
}

export default function Turnstile({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) { onToken(null); return; }
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          theme: 'dark',
          callback: (t) => onToken(t),
          'expired-callback': () => onToken(null),
          'error-callback': () => onToken(null),
        });
      })
      .catch(() => onToken(null));

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* noop */ }
      }
    };
  }, [onToken]);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="flex justify-center" aria-label="Security check" />;
}
