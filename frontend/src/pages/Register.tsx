import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, UserPlus, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { registerRequest } from '../services/authService';
import { useAuthStore } from '../store/authStore';

const ease = [0.16, 1, 0.3, 1] as const;

const fieldCls = 'w-full rounded-lg px-3 py-2.5 text-[13.5px] outline-none transition-shadow focus:ring-2 focus:ring-[var(--m3-primary)] focus:ring-opacity-30';
const fieldStyle = {
  background: 'var(--elevated)',
  border: '1px solid var(--m3-outline-v)',
  color: 'var(--m3-on-surf)',
} as const;
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wider mb-1.5';
const labelStyle = { color: 'var(--m3-on-surf-var)' } as const;

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const { accessToken, refreshToken, user } = await registerRequest(name, email, password);
      setAuth(accessToken, refreshToken, user);
      toast.success(`Welcome, ${user.name}!`);
      navigate(user.onboarded ? '/daily' : '/onboarding', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dot-canvas min-h-screen flex items-center justify-center px-4">
      <div className="dot-grid dot-grid-2x dot-drift" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease }}
        className="relative z-[1] w-full max-w-[420px] surface-float surface-lit p-8"
      >
        {/* Back link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-[12px] mb-6 transition-colors"
          style={{ color: 'var(--m3-on-surf-var)' }}
        >
          <ArrowLeft size={13} /> Back to sign in
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--m3-primary-container)' }}
          >
            <UserPlus size={17} style={{ color: 'var(--m3-on-primary-container)' }} />
          </span>
          <div>
            <h1 className="text-[17px] font-semibold" style={{ color: 'var(--m3-on-surf)' }}>
              Create your account
            </h1>
            <p className="text-[12px]" style={{ color: 'var(--m3-on-surf-var)' }}>
              Free to use · no credit card required
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls} style={labelStyle}>Full name</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className={fieldCls}
              style={fieldStyle}
            />
          </div>

          {/* Email */}
          <div>
            <label className={labelCls} style={labelStyle}>Work email</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="alex@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className={fieldCls}
              style={fieldStyle}
            />
          </div>

          {/* Password */}
          <div>
            <label className={labelCls} style={labelStyle}>Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="8+ characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className={fieldCls}
                style={{ ...fieldStyle, paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center"
                style={{ color: 'var(--m3-on-surf-var)' }}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className={labelCls} style={labelStyle}>Confirm password</label>
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={loading}
              className={fieldCls}
              style={fieldStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name || !email || !password || !confirm}
            className="w-full rounded-xl py-2.5 text-[14px] font-semibold transition-opacity disabled:opacity-40 mt-2"
            style={{ background: 'var(--m3-primary)', color: 'var(--m3-on-primary)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Creating account…
              </span>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-[12px]" style={{ color: 'var(--m3-on-surf-var)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-medium" style={{ color: 'var(--m3-primary)' }}>
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
