/**
 * AI REDACTION — the #1 governance keystone.
 * Journals, private notes, credentials and secrets must NEVER reach AI.
 * sanitizeForAI() recursively strips any field whose name matches the
 * deny-list (exact or substring, case-insensitive) BEFORE the value is
 * rendered into a prompt or sent to a model. Pure + deterministic so it can
 * be asserted without any model call.
 */
const DENY_EXACT = new Set([
  'journal', 'eodnote', 'focustext', 'privatenote', 'notes',
  'passwordhash', 'password', 'mfasecret', 'pwresettokenhash',
  'pwresettoken', 'tokenhash', 'refreshtoken', 'accesstoken',
]);
const DENY_SUBSTR = ['password', 'secret', 'token', 'credential', 'journal', 'apikey', 'privatekey'];

function isForbidden(key: string): boolean {
  const k = key.toLowerCase();
  if (DENY_EXACT.has(k)) return true;
  return DENY_SUBSTR.some((s) => k.includes(s));
}

export interface RedactionResult<T = unknown> {
  clean: T;
  redacted: string[]; // dot-paths that were stripped (for the AI audit log)
}

export function sanitizeForAI<T>(input: T): RedactionResult<T> {
  const redacted: string[] = [];

  const walk = (val: unknown, path: string): unknown => {
    if (val === null || typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map((v, i) => walk(v, `${path}[${i}]`));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      const p = path ? `${path}.${k}` : k;
      if (isForbidden(k)) {
        redacted.push(p);
        continue; // drop entirely — never even a placeholder value
      }
      out[k] = walk(v, p);
    }
    return out;
  };

  return { clean: walk(input, '') as T, redacted };
}

/** Last-line defence: scan a rendered string for residual secret-like tokens. */
export function containsLikelySecret(text: string): boolean {
  return (
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(text) ||
    /\b(?:sk|pk|rk)_[A-Za-z0-9]{16,}\b/.test(text) ||
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./.test(text) // JWT-shaped
  );
}
