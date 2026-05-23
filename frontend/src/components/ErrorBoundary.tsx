import { Component, type ErrorInfo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   ErrorBoundary — never let the app go white.
   Catches render errors from any descendant subtree, shows a
   tasteful fallback in the THEORY editorial palette, and offers
   recovery (retry / go home). Reports through a single hook that
   a real provider (Sentry, Highlight, etc.) can replace at runtime
   when VITE_SENTRY_DSN is wired in production.
   ═══════════════════════════════════════════════════════════════ */

type Reporter = (err: Error, info: ErrorInfo) => void;
let reporter: Reporter | null = null;
export function setErrorReporter(r: Reporter | null) { reporter = r; }

interface State { error: Error | null; info: ErrorInfo | null; resetKey: number }

export default class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode; scope?: string },
  State
> {
  state: State = { error: null, info: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    try { reporter?.(error, info); } catch { /* never let reporter throw */ }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', this.props.scope ?? 'app', error, info);
    }
  }

  reset = () => this.setState({ error: null, info: null, resetKey: this.state.resetKey + 1 });

  render() {
    if (!this.state.error) return <span key={this.state.resetKey}>{this.props.children}</span>;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="dot-canvas min-h-[60vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="surface-float surface-lit w-full max-w-[460px] p-8 text-center"
        >
          <div
            className="mx-auto mb-4 grid place-items-center w-12 h-12 rounded-2xl"
            style={{ background: 'color-mix(in srgb, var(--m3-error) 16%, transparent)', color: 'var(--m3-error)' }}
          >
            <AlertOctagon size={22} />
          </div>
          <h1 className="text-hero mb-2" style={{ color: 'var(--m3-on-surf)' }}>
            Something broke here.
          </h1>
          <p className="text-[13px] measure-tight mx-auto mb-6" style={{ color: 'var(--m3-on-surf-var)' }}>
            We caught the error before it took the whole app down. The team has
            been notified — try again or head back to your daily.
          </p>
          {import.meta.env.DEV && (
            <pre
              className="text-[11px] text-left p-3 rounded-lg overflow-x-auto mb-6"
              style={{ background: 'var(--elevated)', color: 'var(--m3-on-surf-var)' }}
            >
              {this.state.error.message}
            </pre>
          )}
          <div className="flex items-center justify-center gap-2">
            <button className="btn-filled" onClick={this.reset}>
              <RefreshCw size={15} /> Try again
            </button>
            <a className="btn-outlined" href="/daily">
              <Home size={15} /> Daily
            </a>
          </div>
        </motion.div>
      </div>
    );
  }
}
