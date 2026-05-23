-- ============================================================
-- THEORY :: Migration 0004 — Collaboration (comments, activity)
-- New tables → tenant_id NOT NULL from the start (no backfill needed).
-- Idempotent + non-destructive.
-- ============================================================

CREATE TABLE IF NOT EXISTS "comments" (
  "id"          TEXT PRIMARY KEY,
  "tenant_id"   TEXT NOT NULL,
  "author_id"   TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id"   TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "mentions"    TEXT[] NOT NULL DEFAULT '{}',
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at"  TIMESTAMP(3),
  "version"     INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS "comments_tenant_id_idx"                       ON "comments" ("tenant_id");
CREATE INDEX IF NOT EXISTS "comments_tenant_id_entity_type_entity_id_idx" ON "comments" ("tenant_id","entity_type","entity_id");
CREATE INDEX IF NOT EXISTS "comments_tenant_id_author_id_idx"             ON "comments" ("tenant_id","author_id");

CREATE TABLE IF NOT EXISTS "activity_events" (
  "id"          TEXT PRIMARY KEY,
  "tenant_id"   TEXT NOT NULL,
  "actor_id"    TEXT NOT NULL,
  "verb"        TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id"   TEXT NOT NULL,
  "summary"     TEXT NOT NULL,
  "metadata"    JSONB NOT NULL DEFAULT '{}',
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "activity_events_tenant_id_created_at_idx"               ON "activity_events" ("tenant_id","created_at");
CREATE INDEX IF NOT EXISTS "activity_events_tenant_id_entity_type_entity_id_idx"    ON "activity_events" ("tenant_id","entity_type","entity_id");
CREATE INDEX IF NOT EXISTS "activity_events_tenant_id_actor_id_idx"                 ON "activity_events" ("tenant_id","actor_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='comments_tenant_id_fkey') THEN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
    ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='activity_events_tenant_id_fkey') THEN
    ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
    ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;
