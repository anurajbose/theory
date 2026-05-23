-- THEORY :: Migration 0006 — Export jobs (additive, idempotent)
CREATE TABLE IF NOT EXISTS "export_jobs" (
  "id"           TEXT PRIMARY KEY,
  "tenant_id"    TEXT,
  "user_id"      TEXT NOT NULL,
  "type"         TEXT NOT NULL,
  "format"       TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'PENDING',
  "filters"      JSONB NOT NULL DEFAULT '{}',
  "row_count"    INTEGER NOT NULL DEFAULT 0,
  "file_key"     TEXT,
  "error"        TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "expires_at"   TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "export_jobs_tenant_id_user_id_created_at_idx" ON "export_jobs" ("tenant_id","user_id","created_at");
CREATE INDEX IF NOT EXISTS "export_jobs_tenant_id_status_idx" ON "export_jobs" ("tenant_id","status");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='export_jobs_tenant_id_fkey') THEN
    ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
    ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;
