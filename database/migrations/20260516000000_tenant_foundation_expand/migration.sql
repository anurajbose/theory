-- ============================================================
-- THEORY :: Migration 0001 — Tenant Foundation (EXPAND phase)
-- Strategy: expand -> migrate -> contract.  This file is EXPAND only:
--   * fully additive, idempotent, non-destructive
--   * adds nullable tenant_id + base columns (deleted_at, version,
--     updated_at) to every owned table
--   * creates tenants / tenant_settings
--   * backfills a single default tenant and stamps all existing rows
-- A later CONTRACT migration will enforce NOT NULL on tenant_id.
-- Safe to re-run (guards everywhere).
-- ============================================================

-- ---------- 1. Enum types (guarded) ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantStatus') THEN
    CREATE TYPE "TenantStatus" AS ENUM ('TRIAL','ACTIVE','SUSPENDED','CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantPlan') THEN
    CREATE TYPE "TenantPlan" AS ENUM ('FREE','PRO','ENTERPRISE');
  END IF;
END $$;

-- ---------- 2. Tenancy tables ----------
CREATE TABLE IF NOT EXISTS "tenants" (
  "id"         TEXT PRIMARY KEY,
  "name"       TEXT NOT NULL,
  "slug"       TEXT NOT NULL,
  "status"     "TenantStatus" NOT NULL DEFAULT 'TRIAL',
  "plan"       "TenantPlan"   NOT NULL DEFAULT 'FREE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  "version"    INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_key"    ON "tenants" ("slug");
CREATE INDEX        IF NOT EXISTS "tenants_status_idx"  ON "tenants" ("status");

CREATE TABLE IF NOT EXISTS "tenant_settings" (
  "id"                  TEXT PRIMARY KEY,
  "tenant_id"           TEXT NOT NULL,
  "brand_name"          TEXT NOT NULL DEFAULT 'THEORY',
  "logo_url"            TEXT,
  "primary_color"       TEXT NOT NULL DEFAULT '#5457E5',
  "accent_color"        TEXT,
  "login_tagline"       TEXT,
  "features"            JSONB NOT NULL DEFAULT '{}',
  "data_retention_days" INTEGER NOT NULL DEFAULT 365,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_settings_tenant_id_key" ON "tenant_settings" ("tenant_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_settings_tenant_id_fkey') THEN
    ALTER TABLE "tenant_settings"
      ADD CONSTRAINT "tenant_settings_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- ---------- 3. Base columns on every owned table ----------
DO $$
DECLARE
  t            TEXT;
  owned        TEXT[] := ARRAY[
    'companies','business_units','departments','teams','users','refresh_tokens',
    'daily_logs','notifications','work_items','follow_ups','time_logs','meetings',
    'ideas','team_signals','invisible_effort','knowledge_base','announcements','audit_logs'
  ];
  needs_upd_at TEXT[] := ARRAY[
    'companies','business_units','departments','teams','time_logs',
    'team_signals','invisible_effort','announcements'
  ];
BEGIN
  FOREACH t IN ARRAY owned LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "tenant_id" TEXT', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I ("tenant_id")', t || '_tenant_id_idx', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = t || '_tenant_id_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE',
        t, t || '_tenant_id_fkey');
    END IF;
  END LOOP;

  FOREACH t IN ARRAY needs_upd_at LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP', t);
  END LOOP;
END $$;

-- ---------- 4. Backfill: default tenant + settings ----------
INSERT INTO "tenants" ("id","name","slug","status","plan")
VALUES ('00000000-0000-0000-0000-000000000001','Default Tenant','default','ACTIVE','ENTERPRISE')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "tenant_settings" ("id","tenant_id","brand_name","primary_color")
VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000001','THEORY','#5457E5')
ON CONFLICT ("tenant_id") DO NOTHING;

-- ---------- 5. Stamp all existing rows to the default tenant ----------
DO $$
DECLARE
  t     TEXT;
  owned TEXT[] := ARRAY[
    'companies','business_units','departments','teams','users','refresh_tokens',
    'daily_logs','notifications','work_items','follow_ups','time_logs','meetings',
    'ideas','team_signals','invisible_effort','knowledge_base','announcements','audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY owned LOOP
    EXECUTE format(
      'UPDATE %I SET "tenant_id" = ''00000000-0000-0000-0000-000000000001'' WHERE "tenant_id" IS NULL', t);
  END LOOP;
END $$;

-- ---------- 6. Per-tenant email uniqueness (data-safe swap) ----------
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";
DROP INDEX IF EXISTS "users_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "users_tenant_id_email_key" ON "users" ("tenant_id","email");
