import logger from '../utils/logger';

/**
 * Cloudflare Turnstile verification — modern, privacy-first CAPTCHA.
 *
 * Env-gated by design: if TURNSTILE_SECRET is unset the check is a no-op
 * (returns true) so local/dev and self-host stay frictionless. The frontend
 * widget is gated the same way (VITE_TURNSTILE_SITE_KEY), so the two sides
 * activate and deactivate together. Set both in production to enforce.
 */
const SECRET = process.env.TURNSTILE_SECRET;
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function captchaEnforced(): boolean {
  return Boolean(SECRET);
}

export async function verifyCaptcha(
  token: string | undefined,
  ip?: string | null,
): Promise<boolean> {
  if (!SECRET) return true; // not configured → skip
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret: SECRET, response: token });
    if (ip) body.append('remoteip', ip);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    logger.error('Turnstile verification failed', err);
    return false; // fail closed when enforcement is on
  }
}
