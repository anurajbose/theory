-- ─────────────────────────────────────────────────────────────
-- Clerk identity columns — link our rows to Clerk's user/org IDs.
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "clerk_user_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_clerk_user_id_key"
  ON "users" ("clerk_user_id")
  WHERE "clerk_user_id" IS NOT NULL;

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "clerk_org_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "tenants_clerk_org_id_key"
  ON "tenants" ("clerk_org_id")
  WHERE "clerk_org_id" IS NOT NULL;
