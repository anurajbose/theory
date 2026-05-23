<div align="center">

# theory

**Work intelligence for teams that care about focus, not surveillance.**

[![CI](https://github.com/anuraj/theory/actions/workflows/ci.yml/badge.svg)](https://github.com/anuraj/theory/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js 20](https://img.shields.io/badge/Node.js-20_LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![PostgreSQL 15](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## What is theory?

**theory** is a private work-intelligence platform for employees, managers, and leadership.  
Every employee has an encrypted personal workspace. Signals travel up the hierarchy — raw content never does.

```
┌─────────────────────────────────────────────────────────────────────┐
│  theory  ·  9:12 AM  ·  Monday                                      │
├────────────────────────┬────────────────────────────────────────────┤
│  ◉ Daily               │  Good morning, Alex.                       │
│  ☐ Work Board          │                                            │
│  ☐ Follow-ups          │  ┌─ Today's focus ──────────────────────┐  │
│  ☐ Time Log            │  │  Finish onboarding API review         │  │
│  ☐ Meetings            │  │  Review PRs for auth module           │  │
│  ☐ Ideas               │  └──────────────────────────────────────┘  │
│  ☐ Knowledge Base      │                                            │
│  ─────────────────────  │  Mood  ●●●●○  4/5  "Focused"              │
│  ◉ Manager Console     │                                            │
│  ◉ Org Intelligence    │  ┌─ AI Standup digest ──────────────────┐  │
│  ◉ Admin               │  │  ✦ Yesterday: Shipped user-role fix   │  │
│                        │  │  ✦ Today: API review + PR triage      │  │
│                        │  │  ⚠ Blocker: Waiting on design sign-off│  │
│                        │  └──────────────────────────────────────┘  │
└────────────────────────┴────────────────────────────────────────────┘
```

---

## How it helps

| Who | What they see | What they get |
|---|---|---|
| **Employee** | Their own private workspace | Focus, log work, track follow-ups — no distractions |
| **Manager** | Aggregated team signals | Spot blockers early, no need to interrupt the team |
| **Leadership** | Org-wide health dashboard | Real-time mood, velocity, risk — without reading anyone's notes |
| **Admin** | Full system control | Users, hierarchy, billing, custom branding |

---

## Key features

```
Private daily log         ── morning focus · mood · EOD note · encrypted journal
Work Board (kanban)       ── TODO → IN PROGRESS → BLOCKED → DONE
Follow-up tracker         ── reminders with owners, due dates, channels
Time log                  ── per-task hours, weekly summaries
Meeting notes             ── agenda, action items, decisions
Idea bank                 ── proposals with upvotes
Knowledge base            ── team wiki with rich text (TipTap)
AI standup digest         ── one-click summary of your week
Signal roll-up            ── weekly aggregated report sent to manager
Manager console           ── team blocker, mood trend, overdue overview
Org intelligence          ── cross-BU / department health for leadership
Admin panel               ── org hierarchy, role management, branding
```

---

## Screens at a glance

<table>
<tr>
<td align="center" width="33%">

**Daily log**
```
┌──────────────────────┐
│  Focus · Mood · EOD  │
│  ───────────────────  │
│  ✦ AI standup digest │
│  ✦ Private journal   │
│    (write-only,      │
│     AES-256-GCM)     │
└──────────────────────┘
```

</td>
<td align="center" width="33%">

**Work board**
```
┌──────────────────────┐
│ TODO  │ IN PROG │DONE│
│───────┼─────────┼────│
│ Auth  │ API rev │ CI │
│ Tests │ Design  │ DB │
│ Docs  │         │    │
└──────────────────────┘
```

</td>
<td align="center" width="33%">

**Manager console**
```
┌──────────────────────┐
│  Team signals        │
│  ───────────────────  │
│  Blockers      3 ⚠  │
│  Overdue        1 ●  │
│  Avg mood    4.1 / 5 │
│  (no raw notes ever) │
└──────────────────────┘
```

</td>
</tr>
</table>

---

## Quick start — Docker (3 commands)

```bash
git clone https://github.com/<you>/theory
cd theory
docker-compose up
```

Open **http://localhost:3000**

| Email | Role | Password |
|---|---|---|
| `admin@theory.in` | Admin | `Theory@123` |
| `leadership@theory.in` | Leadership | `Theory@123` |
| `manager@theory.in` | Manager | `Theory@123` |
| `ba@theory.in` | Employee (BA) | `Theory@123` |
| `dev1@theory.in` | Employee (Dev) | `Theory@123` |
| `qa@theory.in` | Employee (QA) | `Theory@123` |

Or **create your own account** at `http://localhost:3000/register` — the first user automatically becomes Admin.

---

## Create your account

theory has open registration. Visit `/register` to sign up with your name, email, and password.

- **First user** to register on a fresh install becomes **Admin** automatically.
- All subsequent users start as **Employee** — the Admin can promote roles from the Admin panel.
- No invitation required, no credit card, no email verification for local/self-hosted installs.

---

## Local dev (without Docker)

```bash
# 1 — Database + Redis
docker run -d -e POSTGRES_USER=theory -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=theory_db -p 5432:5432 postgres:15-alpine
docker run -d -p 6379:6379 redis:7-alpine

# 2 — Backend
cd backend
cp ../.env.example .env          # fill in required values
npm install
npx prisma generate --schema=../database/schema.prisma
npx prisma migrate dev --schema=../database/schema.prisma
npx ts-node ../database/seed.ts
npm run dev                      # http://localhost:4000

# 3 — Frontend (new terminal)
cd frontend
npm install
npm run dev                      # http://localhost:3000
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 |
| State | Zustand |
| Routing | React Router v6 |
| Rich text | TipTap |
| Charts | Recharts |
| Animation | Framer Motion |
| Backend | Node.js 20 + Express |
| ORM | Prisma 5 |
| Database | PostgreSQL 15 |
| Queue | BullMQ + Redis |
| Realtime | Socket.IO |
| Auth | JWT (15 min) + refresh tokens (7 d rotation) |
| Encryption | AES-256-GCM (journal) |
| Search | OpenSearch (optional, degrades gracefully) |
| Observability | OpenTelemetry + Prometheus + Winston |

---

## Roles

| Role | Access |
|---|---|
| **EMPLOYEE** | Own workspace only. Journal is write-only — never returned by any API. |
| **MANAGER** | Own workspace + aggregated team signals (no raw content) |
| **LEADERSHIP** | Org-level read-only dashboard |
| **ADMIN** | Full system — user management, hierarchy, billing, branding |

---

## How signals work (privacy model)

```
Employee                Manager                Leadership
────────                ────────               ──────────
 Daily log                                    
 Work board    ──────►  Blocker count   ────►  Dept health
 Follow-ups             Mood average           BU velocity
 Time log               Overdue items          Risk index
 
 ← raw content stays here, always encrypted at rest
```

Managers never see individual notes. Leadership never sees team details. The database encrypts every journal entry with AES-256-GCM before writing.

---

## API

Base URL: `http://localhost:4000/api`

```
POST /api/auth/register       { name, email, password }
POST /api/auth/login          { email, password }
POST /api/auth/refresh        { refreshToken }
POST /api/auth/logout
GET  /api/auth/me

GET    /api/daily-log/today
POST   /api/daily-log/today   { focusText, moodScore, eodNote }
POST   /api/daily-log/today/journal   ← write-only, 204

GET  /openapi.json            Full OpenAPI 3.0 spec
GET  /metrics                 Prometheus scrape endpoint
GET  /api/health              Liveness probe
```

---

## Environment

Copy `.env.example` to `backend/.env` and fill in the required values. Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Optional services (OpenSearch, SMTP, AI, Turnstile, Razorpay) degrade gracefully when not configured — the app works fully for local dev with only database credentials set.

---

## Security

- Journal stored AES-256-GCM encrypted; key derived from `JOURNAL_SECRET`
- Journal field stripped from **every** API response at the ORM layer — zero accidental leakage
- Refresh tokens stored as SHA-256 hashes, rotated on every use
- Passwords: Argon2id (OWASP recommended), automatic re-hash upgrade from bcrypt on login
- Tenant isolation enforced at the ORM layer — every query is automatically scoped
- CORS: origin whitelist from `FRONTEND_URL`
- Rate limits: 10 req/15 min on auth, 120 req/min globally
- Cloudflare Turnstile (CAPTCHA) — enabled by setting `TURNSTILE_SECRET`

---

## Project structure

```
/
├── backend/            Node.js + Express API
│   ├── src/
│   │   ├── routes/     One file per resource
│   │   ├── controllers/Business logic
│   │   ├── core/       Shared services (auth, billing, AI, exports…)
│   │   ├── middleware/ Auth, role guard, rate limit
│   │   ├── queue/      BullMQ workers + dashboard
│   │   ├── realtime/   Socket.IO
│   │   └── observability/ Metrics + tracing
│   └── test/           Vitest integration tests
├── frontend/           React + Vite SPA
│   └── src/
│       ├── pages/      One file per module
│       ├── components/ Shared UI + layout
│       ├── store/      Zustand stores
│       ├── services/   Axios API layer
│       └── theme/      Time-of-day adaptive theme
└── database/
    ├── schema.prisma   Single source of truth
    ├── seed.ts         Demo data (idempotent)
    └── migrations/     Timestamped SQL migrations
```

---

## Testing

```bash
cd backend
npm test            # full integration suite (needs Postgres + Redis)
npm run typecheck   # TypeScript strict check
```

CI runs the full suite against real Postgres + Redis on every push to `main`.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — setup guide, commit conventions, and PR process.

---

## License

MIT — see [LICENSE](LICENSE).
