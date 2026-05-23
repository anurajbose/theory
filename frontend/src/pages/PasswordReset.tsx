import { useState, useCallback, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, MailCheck, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { requestPasswordReset, resetPassword } from '../services/authService';
import Turnstile from '../components/Turnstile';

const ease = [0.16, 1, 0.3, 1] as const;

/* ── Shared cinematic shell ── */
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dot-canvas min-h-screen flex items-center justify-center px-4">
      <div className="dot-grid dot-grid-2x dot-drift" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease }}
        className="relative z-[1] w-full max-w-[420px] surface-float surface-lit p-8"
      >
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-[12px] mb-6 transition-colors"
          style={{ color: 'var(--m3-on-surf-var)' }}
        >
          <ArrowLeft size={13} /> Back to sign in
        </Link>
        {children}
      </motion.div>
    </div>
  );
}

const fieldStyle = {
  background: 'var(--elevated)',
  border: '1px solid var(--m3-outline-v)',
  color: 'var(--m3-on-surf)',
} as const;

/* ═══════════════ Forgot password ═══════════════ */
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const onToken = useCallback((t: string | null) => setCaptcha(t), []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase(), captcha ?? undefined);
      setSent(true);
    } catch {
      // Never reveal account existence — show the same success state.
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      {sent ? (
        <div className="text-center">
          <div
            className="mx-auto mb-4 grid place-items-center w-12 h-12 rounded-2xl"
            style={{ background: 'var(--m3-prim-c)', color: 'var(--m3-primary)' }}
          >
            <MailCheck size={22} />
          </div>
          <h1 className="text-hero mb-2" style={{ color: 'var(--m3-on-surf)' }}>
            Check your inbox
          </h1>
          <p className="text-[13px] measure mx-auto" style={{ color: 'var(--m3-on-surf-var)' }}>
            If an account exists for <strong>{email}</strong>, we've sent a reset
            link. It expires in 30 minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={submit}>
          <h1 className="text-hero mb-1.5" style={{ color: 'var(--m3-on-surf)' }}>
            Reset password
          </h1>
          <p className="text-[13px] mb-6" style={{ color: 'var(--m3-on-surf-var)' }}>
            Enter your work email and we'll send you a secure reset link.
          </p>

          <label className="text-eyebrow block mb-1.5">Email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@theory.in"
            className="w-full rounded-xl px-3.5 py-2.5 text-[14px] outline-none mb-4"
            style={fieldStyle}
            required
          />

          <div className="mb-4"><Turnstile onToken={onToken} /></div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="btn-filled w-full"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

/* ═══════════════ Reset password ═══════════════ */
export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const tooShort = pw.length > 0 && pw.length < 8;
  const mismatch = confirm.length > 0 && pw !== confirm;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8 || pw !== confirm) return;
    setLoading(true);
    try {
      await resetPassword(token, pw);
      toast.success('Password updated — please sign in.');
      navigate('/login', { replace: true });
    } catch {
      toast.error('This reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <h1 className="text-hero mb-2" style={{ color: 'var(--m3-on-surf)' }}>
          Invalid link
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--m3-on-surf-var)' }}>
          This reset link is missing its token. Request a new one from the{' '}
          <Link to="/forgot-password" style={{ color: 'var(--m3-primary)' }}>
            forgot password
          </Link>{' '}
          page.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={submit}>
        <div
          className="mb-4 grid place-items-center w-12 h-12 rounded-2xl"
          style={{ background: 'var(--m3-prim-c)', color: 'var(--m3-primary)' }}
        >
          <ShieldCheck size={22} />
        </div>
        <h1 className="text-hero mb-1.5" style={{ color: 'var(--m3-on-surf)' }}>
          Set a new password
        </h1>
        <p className="text-[13px] mb-6" style={{ color: 'var(--m3-on-surf-var)' }}>
          Choose a strong password — at least 8 characters. All other sessions
          will be signed out.
        </p>

        <label className="text-eyebrow block mb-1.5">New password</label>
        <div className="relative mb-1">
          <input
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full rounded-xl px-3.5 py-2.5 pr-10 text-[14px] outline-none"
            style={fieldStyle}
            required
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--m3-on-surf-var)' }}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {tooShort && (
          <p className="text-[11px] mb-2" style={{ color: 'var(--m3-error)' }}>
            Must be at least 8 characters.
          </p>
        )}

        <label className="text-eyebrow block mb-1.5 mt-4">Confirm password</label>
        <input
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-xl px-3.5 py-2.5 text-[14px] outline-none"
          style={fieldStyle}
          required
        />
        {mismatch && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--m3-error)' }}>
            Passwords don't match.
          </p>
        )}

        <button
          type="submit"
          disabled={loading || pw.length < 8 || pw !== confirm}
          className="btn-filled w-full mt-6"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : 'Update password'}
        </button>
      </form>
    </AuthShell>
  );
}
