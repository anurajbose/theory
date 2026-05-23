-- THEORY :: Migration 0007 — Billing + SSO foundation (additive, idempotent)
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "sso_enforced" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "sso_domain"   TEXT;

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"                 TEXT PRIMARY KEY,
  "tenant_id"          TEXT NOT NULL,
  "provider"           TEXT NOT NULL DEFAULT 'manual',
  "external_id"        TEXT,
  "plan"               "TenantPlan" NOT NULL DEFAULT 'FREE',
  "status"             TEXT NOT NULL DEFAULT 'trialing',
  "seats"              INTEGER NOT NULL DEFAULT 0,
  "current_period_end" TIMESTAMP(3),
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_tenant_id_key" ON "subscriptions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "subscriptions_tenant_id_idx" ON "subscriptions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "subscriptions_provider_external_id_idx" ON "subscriptions" ("provider","external_id");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='subscriptions_tenant_id_fkey') THEN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;
