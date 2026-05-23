import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import axios from 'axios';
import { unwrap } from '../services/api';

export interface Branding {
  brandName: string;
  primaryColor: string;
  accentColor: string | null;
  logoUrl: string | null;
  loginTagline: string | null;
}

const DEFAULTS: Branding = {
  brandName: 'theory',
  primaryColor: '#5457E5',
  accentColor: null,
  logoUrl: null,
  loginTagline: null,
};

const Ctx = createContext<Branding>(DEFAULTS);
export const useBranding = () => useContext(Ctx);

function applyTokens(b: Branding) {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', b.primaryColor);
  root.style.setProperty('--brand-accent', b.accentColor || b.primaryColor);
  document.title = b.brandName;
}

/**
 * Tenant-driven theme. Renders children immediately with safe defaults
 * (never blocks first paint), then hydrates from /api/branding. No hardcoded
 * brand values in components — consume var(--brand-primary) / useBranding().
 */
export function ThemeProvider({ children, slug }: { children: ReactNode; slug?: string }) {
  const [branding, setBranding] = useState<Branding>(DEFAULTS);

  useEffect(() => {
    applyTokens(DEFAULTS);
    let alive = true;
    axios
      .get('/api/branding', { params: slug ? { slug } : undefined })
      .then((r) => unwrap<Branding>(r.data, r.status))
      .then((b) => {
        if (!alive) return;
        const merged = { ...DEFAULTS, ...b };
        setBranding(merged);
        applyTokens(merged);
      })
      .catch(() => {/* keep defaults — branding is non-critical */});
    return () => { alive = false; };
  }, [slug]);

  return <Ctx.Provider value={branding}>{children}</Ctx.Provider>;
}
