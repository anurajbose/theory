/**
 * Moderation gate (input + output). Heuristic + pluggable — a real provider
 * can replace `moderate` later without touching the gateway. Deterministic.
 */
const INJECTION = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /disregard (the )?(system|above)/i,
  /reveal (your )?(system prompt|instructions)/i,
  /you are now (a|an) /i,
  /\bDAN\b mode/i,
];

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

const MAX_LEN = 24_000;

export function moderate(text: string): ModerationResult {
  if (text.length > MAX_LEN) return { allowed: false, reason: 'input_too_large' };
  for (const re of INJECTION) {
    if (re.test(text)) return { allowed: false, reason: 'prompt_injection_detected' };
  }
  return { allowed: true };
}
