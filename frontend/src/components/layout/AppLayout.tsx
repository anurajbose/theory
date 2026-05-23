import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from '../CommandPalette';
import ErrorBoundary from '../ErrorBoundary';

const ease = [0.16, 1, 0.3, 1] as const;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div
      className="relative flex h-screen overflow-hidden theme-transition"
      style={{ background: 'var(--m3-bg)' }}
    >
      <div className="dot-grid-app" aria-hidden />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <div className="relative z-[1] flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="ambient-scene flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.32, ease }}
              className="mx-auto w-full max-w-[1400px] px-8 py-8"
            >
              <ErrorBoundary scope={location.pathname}>
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
