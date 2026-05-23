-- ─────────────────────────────────────────────────────────────
-- Signal lifecycle — state that wraps derived signals.
-- Signals themselves are computed (no stored row); this table
-- persists what humans did about them: ack, snooze, resolve,
-- feedback. Keyed by (tenantId, signalId) so the engine can
-- merge state in cheaply. Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "signal_states" (
  "id"             TEXT        PRIMARY KEY,
  "tenant_id"      TEXT        NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "signal_id"      TEXT        NOT NULL,
  "state"          TEXT        NOT NULL DEFAULT 'OPEN',
  "snoozed_until"  TIMESTAMP(3),
  "resolved_at"    TIMESTAMP(3),
  "acked_by"       TEXT        REFERENCES "users"("id") ON DELETE SET NULL,
  "resolved_by"    TEXT        REFERENCES "users"("id") ON DELETE SET NULL,
  "feedback"       SMALLINT,
  "notes"          TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "signal_states_tenant_signal_key"
  ON "signal_states" ("tenant_id", "signal_id");

CREATE INDEX IF NOT EXISTS "signal_states_tenant_state_idx"
  ON "signal_states" ("tenant_id", "state");

CREATE INDEX IF NOT EXISTS "signal_states_snoozed_until_idx"
  ON "signal_states" ("snoozed_until")
  WHERE "snoozed_until" IS NOT NULL;
