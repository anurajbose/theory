/* ═══════════════════════════════════════════════════════════════
   Clerk adapter — env-gated, dual-mode-safe.
   When VITE_CLERK_PUBLISHABLE_KEY is set, the app uses Clerk for
   identity; otherwise it falls through to the legacy JWT path so
   the live demo never breaks during the cutover.
   ═══════════════════════════════════════════════════════════════ */

export const CLERK_PUBLISHABLE_KEY = import.meta.env
  .VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export function clerkEnabled(): boolean {
  return Boolean(CLERK_PUBLISHABLE_KEY);
}

interface ClerkSessionLike {
  getToken: (opts?: { template?: string }) => Promise<string | null>;
}
interface ClerkGlobal { session?: ClerkSessionLike | null }

/** Pull the current Clerk session token (used by the axios interceptor). */
export async function getClerkToken(): Promise<string | null> {
  if (!clerkEnabled()) return null;
  const w = window as unknown as { Clerk?: ClerkGlobal };
  try {
    return (await w.Clerk?.session?.getToken()) ?? null;
  } catch {
    return null;
  }
}
