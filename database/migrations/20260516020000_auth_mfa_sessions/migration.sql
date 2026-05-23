-- ============================================================
-- THEORY :: Migration 0003 — Auth UX & Session Security (EXPAND)
-- Additive, idempotent, non-destructive.
--   * users: TOTP MFA + password-reset fields
--   * refresh_tokens: session/device metadata (list & revoke)
-- ============================================================

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enabled"          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_secret"           TEXT;          -- AES-256-GCM encrypted
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pw_reset_token_hash"  TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pw_reset_expires_at"  TIMESTAMP(3);

ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "user_agent"   TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "ip"           TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_pw_reset_token_hash_idx" ON "users" ("pw_reset_token_hash");
