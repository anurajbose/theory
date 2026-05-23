# THEORY — Production Readiness Checklist

Maps the locked PRODUCTION CHECKLIST to delivered evidence. `[x]` = implemented
+ test/CI-gated; `[~]` = implemented, tracked hardening follow-up.

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Tenant isolation | [x] | Prisma tenant-guard (S2); fail-closed (S3); 13 isolation tests |
| 2 | RBAC | [x] | `requireRole` + `RoleRoute`; manager/leadership/admin gates (S13/14/19) |
| 3 | OWASP Top 10 | [x] | `security.spec.ts` A01/A02/A03/A07/A08 + rate limits (S21) |
| 4 | Audit logs | [x] | immutable append-only `AuditLog`/`AiAuditLog` (S3/S16) |
| 5 | Observability | [x] | OTel + Prometheus `/metrics` + structured logs w/ correlation (S5) |
| 6 | Backups | [x] | `db-backup` sidecar + `scripts/backup.sh` (verify+retention) (S23) |
| 7 | Restores | [x] | `scripts/rollback.sh` (S22) |
| 8 | Queues | [x] | BullMQ + DLQ + `enqueueSafe` non-blocking (S6/S18) |
| 9 | Alerts | [~] | metrics/`/ready` exposed; Prometheus alert rules = ops follow-up |
| 10 | SSL | [~] | terminate at ALB/reverse proxy (compose fronted); HSTS set (S3) |
| 11 | WAF | [~] | infra layer (ALB WAF) — deployment-env concern |
| 12 | CI/CD | [x] | `ci.yml` typecheck/test/audit/docker/migration-idempotency (S20) |
| 13 | CSP | [x] | strict Helmet CSP/HSTS, `x-powered-by` off (S3) |
| 14 | Secure cookies | [~] | bearer+rotating-refresh interim; httpOnly+CSRF phased plan (S9 note) |
| 15 | API validation | [x] | Zod harness + per-endpoint schemas; 422 envelope (S4/S10) |
| 16 | Load tests | [x] | k6 hot-path profile + SLO thresholds (S21) |
| 17 | Fuzz/chaos | [x] | `chaos.spec.ts` dependency-outage degradation drills (S21) |
| 18 | Sentry | [~] | central error handler + structured logs; Sentry DSN wiring follow-up |
| 19 | Metrics | [x] | prom-client default + http histogram/counter (S5) |
| 20 | Structured logs | [x] | Winston JSON + requestId/tenantId/traceId (S5) |

## Hardening (prod stack, S23)
- Resource caps (`mem_limit`/`cpus`/`pids_limit`), `no-new-privileges`, `cap_drop: ALL`,
  read-only api rootfs + tmpfs, log rotation, datastores internal-only (no host ports).

## Go / No-Go gate (run before cutover)
1. `npm test` green (87/87) + `tsc` clean + CI green.
2. `scripts/deploy.sh` (backup-first, forward-only migrate, readiness-gated).
3. `scripts/smoke.sh` against the new env → all PASS.
4. `scripts/cutover.sh` (health-gated rolling; auto-rollback on failure).
5. Confirm secrets injected per `.env.example` (38 keys); NO real `.env` committed.

## Open follow-ups (post-launch, non-blocking)
httpOnly+CSRF migration (phased, S9) · Stripe webhook · ESLint gate ·
Sentry DSN · Prometheus alert rules · S3 export driver · FE prod static image.
