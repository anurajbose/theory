# THEORY — Deploy & Clerk Cutover

A focused, opinionated checklist to take the current build live on
**Vercel** (frontend SPA) + **Railway** (Express API + Postgres + Redis)
with **Clerk** as the identity provider.

The integration is **dual-mode**: when the Clerk env vars are absent the
app falls back to the legacy JWT path, so the current demo keeps working
right up until the cutover. Flip both vars together to switch.

---

## 1 · Provision the backing services

| Service     | Provider             | Notes                                                   |
|-------------|----------------------|---------------------------------------------------------|
| Postgres 15 | Railway (or Neon)    | One DB per environment. Note the `DATABASE_URL`.        |
| Redis 7     | Railway (or Upstash) | For BullMQ + rate limits.                               |
| Object svc  | (later)              | Not on the Stage-0 path.                                |
| Email       | Resend / Postmark    | For password reset, morning brief, system mail.         |

Run migrations once against the new DB:

```bash
cd database
DATABASE_URL='postgres://...' \
  npx prisma migrate deploy --schema schema.prisma
```

Seed (optional, for a clean demo workspace):

```bash
DATABASE_URL='postgres://...' npx tsx seed.ts
```

## 2 · Set up Clerk

1. Create a Clerk application at https://dashboard.clerk.com.
2. **Enable Organizations** (Customize → Organizations → On).
3. Under *User & authentication* → *Email, Phone, Username* keep **Email +
   password**, then under *Social connections* turn on the providers you
   want (Google, Microsoft, GitHub). This is the SSO we promised buyers.
4. *Organizations → Roles* — create three custom roles in addition to the
   default admin:
   - `org:admin`       → maps to our `ADMIN`
   - `org:leadership`  → maps to our `LEADERSHIP`
   - `org:manager`     → maps to our `MANAGER`
   - default member    → maps to our `EMPLOYEE`
   (See `backend/src/middleware/clerkAuth.ts` for the exact mapping.)
5. *API Keys* — copy both keys; you'll set them as env vars below.
6. (Recommended) *Sessions* → Customize JWT template to include
   `org_id` and `org_role` in the session token claims. The middleware
   already reads them.

## 3 · Deploy the backend to Railway

From the repo root, with the Railway CLI:

```bash
railway login
railway init                       # link / create project
railway up                         # uses backend/railway.json + Dockerfile
```

Set the env vars in the Railway service:

```ini
NODE_ENV=production
PORT=4000
DATABASE_URL=postgres://...
REDIS_URL=redis://...

# Identity — flip Clerk on by setting CLERK_SECRET_KEY.
CLERK_SECRET_KEY=sk_live_xxx
# Optional once you've created a JWT template for org claims.
# CLERK_JWT_KEY=...

# App
APP_URL=https://theory.your-domain.com
JWT_SECRET=<strong random — still needed for legacy fallback during cutover>
JWT_REFRESH_SECRET=<another strong random>

# Email (Resend example)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=<api key>

# AI (only if you'll enable PRO digests)
OPENAI_API_KEY=sk-...

# CAPTCHA (Turnstile) — leave unset to skip
# TURNSTILE_SECRET=...
```

## 4 · Deploy the frontend to Vercel

```bash
cd frontend
vercel link            # connect to a Vercel project
vercel env add VITE_CLERK_PUBLISHABLE_KEY production   # pk_live_xxx
vercel env add VITE_API_BASE_URL          production   # https://api.theory.your-domain.com
vercel --prod
```

Then edit `frontend/vercel.json` — replace `API_BASE_URL_REPLACE_ME` in
the `/api/:path*` rewrite with your Railway API host. Re-deploy.

## 5 · Cutover

The moment both `CLERK_SECRET_KEY` (backend) and
`VITE_CLERK_PUBLISHABLE_KEY` (frontend) are set, the app uses Clerk
end-to-end. Behaviour by route:

| Route                  | Behaviour under Clerk                                |
|------------------------|------------------------------------------------------|
| `/sign-in`, `/sign-up` | Clerk-hosted UI on our dark canvas                   |
| `/workspace-setup`     | Forced when a user has no organisation               |
| `/login` etc. (legacy) | Still mounted — useful only if you ever turn Clerk off |
| Header                 | `UserButton` + `OrganizationSwitcher` replace the custom avatar menu |
| API                    | Backend verifies Clerk tokens, JIT-creates user + tenant rows linked to Clerk IDs |

## 6 · Smoke checklist (run after first deploy)

```
[ ] GET  /api/health                            → 200
[ ] Visit /sign-up → create user → create org   → lands on /daily
[ ] GET  /api/signals (with Clerk token)        → 200, signals present
[ ] POST /api/billing/upgrade {plan:"PRO"}      → 200 mode:"applied"
[ ] Admin invites a teammate via OrganizationSwitcher → they JIT-provision on first login
[ ] Lock out: 6 bad signs-in (Clerk side)       → Clerk locks; our API never sees the attempts
[ ] Tenant isolation: open two orgs in different tabs → no cross-data
```

## 7 · After it's stable — Phase Clerk-C1 (cleanup)

Once Clerk is the only path you care about, delete the legacy auth
surfaces. None of them are exported anywhere else — safe to remove:

- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/PasswordReset.tsx`
- `frontend/src/components/Turnstile.tsx`
- backend: `controllers/authController.ts` legacy endpoints, MFA controller,
  `middleware/rateLimit.ts` `loginLimiter`, `core/captcha.ts`
- Drop `users.password_hash`, `mfa_secret`, `pw_reset_*` columns in a follow-up migration.

Skip this until Clerk has been the live path for a week and you've
confirmed no auth regressions.

---

## 8 · Production hosting — opinionated $0-baseline stack

THEORY's managed-cloud infrastructure is engineered to start at $0/mo
on real free tiers, then graduate one component at a time as the
workspace grows. This is **our own production runbook** — proprietary
and internal. The recipe below is how we run THEORY in production
during founder-led launch.

| Layer            | Provider                | Free allowance                              |
|------------------|-------------------------|---------------------------------------------|
| Frontend SPA     | **Vercel Hobby**        | 100 GB bandwidth / mo · unlimited deploys   |
| Backend API      | **Render Free Web**     | 750 hrs / mo · sleeps after 15 min idle     |
| Postgres 15      | **Neon Free**           | 0.5 GB storage · 1 project · branching      |
| Redis 7          | **Upstash Free**        | 10k commands / day · 256 MB                 |
| Identity         | **Clerk Free**          | 10k monthly active users · all features     |
| Transactional email | **Resend Free**      | 100 emails / day · 3k / month               |
| CAPTCHA          | **Cloudflare Turnstile**| Unlimited, no card                          |
| Error tracking   | **Sentry Developer**    | 5k events / mo                              |
| Object storage   | **Cloudflare R2 Free**  | 10 GB / mo egress free                      |
| DNS + TLS        | **Cloudflare**          | Free SSL, unlimited subdomains              |
| Code hosting     | **GitHub Free**         | Unlimited public repos                      |

**Wakeups for sleeping Render service** — point a 5-min health check
at `/api/health` (UptimeRobot has a free 50-monitor plan); after the
first hit the service stays warm during business hours.

**Scale ceiling on the $0 stack:** roughly **a few hundred MAU per
workspace** and **a few thousand work items**. Beyond that you'll
graduate one component at a time — Neon's $19/mo plan is usually the
first upgrade (more storage + autoscaling), then Render's $7/mo
always-on instance. Even fully paid the small-team bill stays under
$50/month.

**Deploy runbook** (production / staging environments):

```bash
# 1 · Provision (each provider has a one-click "create" flow)
#     - Neon project    → copy DATABASE_URL
#     - Upstash Redis   → copy REDIS_URL
#     - Clerk app       → copy CLERK_SECRET_KEY + VITE_CLERK_PUBLISHABLE_KEY
#     - Resend          → copy SMTP_*

# 2 · Backend → Render
#     Connect the repo, set root to /, dockerfile to backend/Dockerfile.
#     Add the env vars from step 1 + a strong JWT_SECRET / JWT_REFRESH_SECRET.

# 3 · Frontend → Vercel
cd frontend
vercel link
vercel env add VITE_CLERK_PUBLISHABLE_KEY production
vercel --prod
# Edit vercel.json: replace API_BASE_URL_REPLACE_ME with the Render URL.

# 4 · Migrate the DB once
cd database
DATABASE_URL='postgres://...' npx prisma migrate deploy --schema schema.prisma
```

That's it. THEORY's production cloud is live; every paid tier is
unlocked for $0 during founder-led launch.

---

© 2026 THEORY. Proprietary — see `LICENSE`.
