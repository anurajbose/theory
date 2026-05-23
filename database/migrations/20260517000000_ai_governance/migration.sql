-- ============================================================
-- THEORY :: Migration 0005 — AI Governance
-- ai_prompts: global registry (no tenant_id, NOT guard-scoped)
-- ai_audit_logs: append-only per-tenant AI usage ledger
-- Idempotent + non-destructive.
-- ============================================================

CREATE TABLE IF NOT EXISTS "ai_prompts" (
  "id"         TEXT PRIMARY KEY,
  "key"        TEXT NOT NULL,
  "version"    INTEGER NOT NULL DEFAULT 1,
  "name"       TEXT NOT NULL,
  "template"   TEXT NOT NULL,
  "model"      TEXT NOT NULL DEFAULT 'disabled',
  "active"     BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ai_prompts_key_version_key" ON "ai_prompts" ("key","version");
CREATE INDEX IF NOT EXISTS "ai_prompts_key_active_idx" ON "ai_prompts" ("key","active");

CREATE TABLE IF NOT EXISTS "ai_audit_logs" (
  "id"                 TEXT PRIMARY KEY,
  "tenant_id"          TEXT,
  "user_id"            TEXT,
  "prompt_key"         TEXT NOT NULL,
  "prompt_version"     INTEGER NOT NULL,
  "model"              TEXT NOT NULL,
  "status"             TEXT NOT NULL,
  "input_tokens"       INTEGER NOT NULL DEFAULT 0,
  "output_tokens"      INTEGER NOT NULL DEFAULT 0,
  "cost_usd"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "latency_ms"         INTEGER NOT NULL DEFAULT 0,
  "confidence"         DOUBLE PRECISION,
  "moderation_flagged" BOOLEAN NOT NULL DEFAULT false,
  "redacted_fields"    TEXT[] NOT NULL DEFAULT '{}',
  "reason"             TEXT,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ai_audit_logs_tenant_id_created_at_idx" ON "ai_audit_logs" ("tenant_id","created_at");
CREATE INDEX IF NOT EXISTS "ai_audit_logs_tenant_id_prompt_key_idx" ON "ai_audit_logs" ("tenant_id","prompt_key");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ai_audit_logs_tenant_id_fkey') THEN
    ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
    ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Seed core registered prompts (no ad-hoc prompts allowed at runtime).
INSERT INTO "ai_prompts" ("id","key","version","name","template","model","active") VALUES
 ('00000000-0000-0000-0000-0000000ai001','standup.summary',1,'Standup Summary',
  'Summarise these operational signals into a concise standup digest. METADATA ONLY: {{signals}}','disabled',true),
 ('00000000-0000-0000-0000-0000000ai002','blocker.triage',1,'Blocker Triage',
  'Given these blockers (metadata only), suggest a triage order: {{blockers}}','disabled',true)
ON CONFLICT ("key","version") DO NOTHING;
