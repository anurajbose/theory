# THEORY — Sprint Roadmap

The full named program. Each sprint is small enough to ship and verify
in one focused pass. Status reflects the current code, not intent.

Status legend: ✅ shipped & verified · 🟡 partial · ⏳ queued

---

## Sprint 1 · Identity & Deploy ✅
Clerk integration end-to-end, dual-mode and env-gated. Backend
`clerkAuth.ts` with JIT user/tenant provisioning. Frontend
`<ClerkProvider>`, sign-in/sign-up/workspace-setup pages,
`<OrganizationSwitcher>` + `<UserButton>` in the header. Vercel +
Railway configs, Dockerfile, `DEPLOY.md`.

## Sprint 2 · Signal Lifecycle ✅
Signals now have a state machine and a feedback loop. New
`signal_states` table + `PATCH /api/signals/:id/state` and
`POST /api/signals/:id/feedback`. The list response merges state in
and hides resolved/dismissed and active-snoozed signals
automatically. `SignalRow` in the UI exposes Ack / Snooze 24h /
Resolve / Dismiss + 👍 / 👎.

## Sprint 3 · Intelligence Surface ✅
Three overlapping dashboards (Manager · Org Pulse · Reports)
collapsed into **one** role-adaptive `pages/Intelligence.tsx` page.
`MANAGER` lands on Team scope; `LEADERSHIP`/`ADMIN` get a Team/Org
toggle. Legacy URLs preserved as redirects. Composed entirely from
the design primitives.

## Sprint 4 · Mission Control (Daily) ✅
Daily redesigned as the personal mission control: two-column
editorial layout, signal preview at the top, focus + journal on the
left, operational-health tiles + mood + morning cards on the right.
All existing daily components preserved.

## Sprint 5 · Premium Board ✅
Kanban rebuilt on the primitives. Native HTML5 drag-and-drop between
columns (no new dependency), layered cards with severity rails,
inline rename, more-menu with explicit move targets, quick-add per
column, optimistic moves through the existing `/work-items/:id/move`
endpoint.

## Sprint 7 · CI/CD ✅
GitHub Actions: backend job (already strong) + new **frontend** job
(typecheck + production build + artefact upload), and a new
`deploy.yml` that pushes the frontend to Vercel and the backend to
Railway on green main — both env-gated on secrets so forks stay safe.

## Sprint 8 · Observability ✅
`components/ErrorBoundary.tsx` — class component, catches render
errors, shows a tasteful fallback (no more white screens). Wired at
two levels: per-route inside `AppLayout` and root inside `main.tsx`.
`setErrorReporter()` is the single plug-point for Sentry / Highlight
/ any provider — no SDK dependency required today.

## Sprint F · Free Forever + Open Source ✅
THEORY is now free for every workspace and the code is MIT-licensed.
- `FEATURE_MIN_PLAN` flipped to `FREE` for every key — every gate is
  a no-op, but the matrix and `requirePlan()` stay (cheap reversibility).
- `pages/marketing/Pricing.tsx` rewritten to "free forever" with a
  sponsor CTA and a self-host link.
- `pages/Upgrade.tsx` repurposed as a Sponsor / self-host page.
- Landing + How-It-Works copy de-tiered.
- `LICENSE` (MIT) at repo root.
- `DEPLOY.md` extended with a **$0/month hosting recipe** (Vercel +
  Render free + Neon + Upstash + Clerk + Resend + Turnstile +
  Cloudflare R2 + Sentry developer).

## Sprint 6 · Activation Onboarding 🟡 (started, finishing next run)
Backend `core/http.ts` import added to `onboardingController.ts`; the
`POST /api/onboarding/seed-demo` endpoint is the next concrete step.
Goal: brand-new workspace ⇒ first real signal under 5 minutes via a
seeded demo dataset (one aged blocker, one SLA-at-risk item, one
overdue follow-up) plus a "start blank" CTA. Frontend gates on
"workspace has zero work items".

## Sprint 9 · Slack Delivery ⏳
First real outbound channel. Per-org Slack app install → digest +
critical signals post to a configured channel. Slash commands
`/theory signals` and `/theory ack`. Closes the "no one opens the
page" failure mode.

## Sprint 10 · GitHub Ingestion ⏳
First real **source**. Per-org GitHub app → PR + issue events feed
work items + blockers. "Never manually gathered" stops being
aspirational.

## Sprint 11 · Mobile + Accessibility ⏳
Responsive Daily + Signals (the two surfaces that need native
quality). WCAG 2.2 AA pass — focus rings, contrast, screen-reader
labels, reduced-motion already honoured in the primitives.

## ~~Sprint 12 · Stripe Live~~ — REMOVED
THEORY is free forever (see Sprint F). The billing scaffolding stays
in the codebase as cheap insurance and to power the
`/api/billing/entitlements` endpoint, but there's nothing to charge
for, so the live-Stripe sprint is removed from the roadmap.

## Sprint 13 · Production Hardening ⏳
Secret manager (1Password / Doppler / AWS SM). Postgres backups with
a tested restore drill. Status page. Basic SLO + alert routes.
Replace the macOS LaunchAgent (dev only) with the production process
model — the Render/Railway Dockerfile already covers this.

## Sprint 14 · Cleanup (post-cutover) ⏳
Delete the legacy auth surfaces once Clerk has been live ≥1 week.
Drop `users.password_hash`, `mfa_secret`, `pw_reset_*` columns.
Remove `Login.tsx`, `PasswordReset.tsx`, Turnstile, MFA controller,
login rate-limiter, captcha helper. See `DEPLOY.md` §7.

---

## What's running where (current truth)
- Shipped & verified: **1 · 2 · 3 · 4 · 5 · 7 · 8 · F**
- Started: **6** (activation onboarding — backend endpoint next)
- Queued: **9 · 10 · 11 · 13 · 14**
- Removed: **12 (Stripe)** — not needed under the free model
