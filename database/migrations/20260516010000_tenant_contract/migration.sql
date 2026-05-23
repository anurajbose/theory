-- ============================================================
-- THEORY :: Migration 0002 — Tenant CONTRACT phase
-- expand(0001) -> migrate(backfill) -> CONTRACT(this).
--   1. VERIFY: abort loudly if any owned row still has NULL tenant_id
--   2. ENFORCE: tenant_id SET NOT NULL on 17 owned tables
--      (audit_logs EXCLUDED — pre-auth failed-login events have no tenant)
--   3. INDEX: tenant-leading composite indexes matching the guard's query
-- Idempotent + non-destructive (no data mutation; SET NOT NULL re-runnable).
-- ============================================================

-- ---------- 1. VERIFICATION GATE ----------
DO $$
DECLARE
  t   TEXT;
  n   BIGINT;
  tbl TEXT[] := ARRAY[
    'companies','business_units','departments','teams','users','refresh_tokens',
    'daily_logs','notifications','work_items','follow_ups','time_logs','meetings',
    'ideas','team_signals','invisible_effort','knowledge_base','announcements'
  ];
BEGIN
  FOREACH t IN ARRAY tbl LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE tenant_id IS NULL', t) INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION
        'CONTRACT ABORTED: % has % rows with NULL tenant_id. Backfill before contracting.', t, n;
    END IF;
  END LOOP;
END $$;

-- ---------- 2. ENFORCE NOT NULL ----------
DO $$
DECLARE
  t   TEXT;
  tbl TEXT[] := ARRAY[
    'companies','business_units','departments','teams','users','refresh_tokens',
    'daily_logs','notifications','work_items','follow_ups','time_logs','meetings',
    'ideas','team_signals','invisible_effort','knowledge_base','announcements'
  ];
BEGIN
  FOREACH t IN ARRAY tbl LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN "tenant_id" SET NOT NULL', t);
  END LOOP;
END $$;

-- ---------- 3. TENANT-LEADING COMPOSITE INDEXES ----------
CREATE INDEX IF NOT EXISTS "business_units_tenant_id_company_id_idx"   ON "business_units" ("tenant_id","company_id");
CREATE INDEX IF NOT EXISTS "departments_tenant_id_bu_id_idx"           ON "departments" ("tenant_id","bu_id");
CREATE INDEX IF NOT EXISTS "teams_tenant_id_dept_id_idx"               ON "teams" ("tenant_id","dept_id");
CREATE INDEX IF NOT EXISTS "users_tenant_id_manager_id_idx"            ON "users" ("tenant_id","manager_id");
CREATE INDEX IF NOT EXISTS "daily_logs_tenant_id_user_id_idx"          ON "daily_logs" ("tenant_id","user_id");
CREATE INDEX IF NOT EXISTS "notifications_tenant_id_user_id_read_idx"  ON "notifications" ("tenant_id","user_id","read");
CREATE INDEX IF NOT EXISTS "work_items_tenant_id_user_id_status_idx"   ON "work_items" ("tenant_id","user_id","status");
CREATE INDEX IF NOT EXISTS "work_items_tenant_id_sla_date_idx"         ON "work_items" ("tenant_id","sla_date");
CREATE INDEX IF NOT EXISTS "follow_ups_tenant_id_user_id_status_idx"   ON "follow_ups" ("tenant_id","user_id","status");
CREATE INDEX IF NOT EXISTS "time_logs_tenant_id_user_id_date_idx"      ON "time_logs" ("tenant_id","user_id","date");
CREATE INDEX IF NOT EXISTS "meetings_tenant_id_user_id_date_idx"       ON "meetings" ("tenant_id","user_id","date");
CREATE INDEX IF NOT EXISTS "ideas_tenant_id_user_id_status_idx"        ON "ideas" ("tenant_id","user_id","status");
CREATE INDEX IF NOT EXISTS "team_signals_tenant_id_team_id_idx"        ON "team_signals" ("tenant_id","team_id");
CREATE INDEX IF NOT EXISTS "invisible_effort_tenant_id_user_id_idx"    ON "invisible_effort" ("tenant_id","user_id");
CREATE INDEX IF NOT EXISTS "knowledge_base_tenant_id_visibility_idx"   ON "knowledge_base" ("tenant_id","visibility");
CREATE INDEX IF NOT EXISTS "announcements_tenant_id_scope_type_scope_id_idx" ON "announcements" ("tenant_id","scope_type","scope_id");
