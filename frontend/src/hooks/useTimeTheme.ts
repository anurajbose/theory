import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'theory-theme-v2';

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch { /* ignore */ }
  return 'dark'; // default to dark
}

function applyTheme(mode: ThemeMode) {
  if (mode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// ── Singleton so all consumers stay in sync ──
let _mode: ThemeMode = readStored();
const _listeners = new Set<(m: ThemeMode) => void>();

function setGlobalMode(mode: ThemeMode) {
  _mode = mode;
  try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
  applyTheme(mode);
  _listeners.forEach(fn => fn(mode));
}

// Apply immediately on module load
applyTheme(_mode);

export function useTimeTheme() {
  const [mode, setMode] = useState<ThemeMode>(_mode);

  useEffect(() => {
    const fn = (m: ThemeMode) => setMode(m);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);

  const toggle = useCallback(() => {
    setGlobalMode(_mode === 'dark' ? 'light' : 'dark');
  }, []);

  const setTheme = useCallback((m: ThemeMode) => {
    setGlobalMode(m);
  }, []);

  return {
    mode,
    resolved: mode, // same as mode now (no auto)
    toggle,
    setTheme,
  };
}
