# theory — Work Intelligence Platform

> Every employee has a private work notebook.  
> Signals travel up the hierarchy — content never does.

**theory** is a multi-tenant work intelligence platform for teams and organisations. Employees log their day privately; managers see aggregated signals; leadership sees org-wide health — nobody reads anyone else's raw notes.

---

## What it is

| Layer | What it does |
|---|---|
| **Daily log** | Morning focus, mood check-in, EOD note, private encrypted journal |
| **Board / Work items** | Personal kanban — TODO → IN PROGRESS → BLOCKED → DONE |
| **Follow-ups** | Lightweight action-item tracker with due dates and channels |
| **Time log** | Per-task time entries, weekly summaries |
| **Meetings** | Meeting notes with action items |
| **Ideas** | Idea board with voting |
| **Signals** | Automatic weekly roll-up (blockers, overdue, mood trend) sent up the hierarchy |
| **Manager console** | Team signal dashboard — aggregated, no raw content ever surfaced |
| **Org Intelligence** | Leadership view across business units and departments |
| **Knowledge base** | Team-scoped wiki |
| **Announcements** | Org-wide pinned messages |
| **Admin panel** | User management, hierarchy editor, billing, branding |
| **Reports** | Exportable summaries (CSV / PDF) |

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
| Search | OpenSearch (optional, app degrades gracefully) |
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

## Hierarchy

```
Company → Business Unit → Department → Team → Employee
```

Each level sees only aggregated signals from the levels below. Raw content never travels up.

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

## API

Base URL: `http://localhost:4000/api`

```
POST /api/auth/login          { email, password }
POST /api/auth/refresh         { refreshToken }
POST /api/auth/logout
GET  /api/auth/me

GET    /api/daily-log/today
POST   /api/daily-log/today    { focusText, moodScore, eodNote }
POST   /api/daily-log/today/journal   ← write-only, 204
GET    /api/daily-log/standup

GET  /openapi.json             Full OpenAPI 3.0 spec
GET  /metrics                  Prometheus scrape endpoint
GET  /api/health               Liveness probe
```

---

## Environment

Copy `.env.example` to `backend/.env` and fill in the required values. Secrets marked `REQUIRED` must be distinct random strings — generate them with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Optional services (Redis, OpenSearch, SMTP, AI, Turnstile, Razorpay) degrade gracefully when not configured — the app remains fully functional for local development with only the database credentials set.

---

## Security

- Journal stored AES-256-GCM encrypted; key derived from `JOURNAL_SECRET`
- Journal field stripped from **every** API response at the ORM layer — zero accidental leakage
- Refresh tokens stored as SHA-256 hashes, rotated on every use
- Passwords: bcrypt rounds 12, automatic argon2 re-hash upgrade
- Tenant isolation enforced at the ORM layer — every query is automatically scoped
- CORS: origin whitelist from `FRONTEND_URL`
- Rate limits: 10 req/15 min on auth, 120 req/min globally
- Cloudflare Turnstile (CAPTCHA) support — enabled by setting `TURNSTILE_SECRET`

---

## Testing

```bash
cd backend
npm test                   # full integration suite (needs Postgres + Redis)
npm run typecheck          # TypeScript strict check
```

CI runs the full suite against real Postgres + Redis on every push to `main`.

---

## License

MIT — see [LICENSE](LICENSE).
