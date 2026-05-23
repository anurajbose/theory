# Contributing to theory

Thank you for taking the time to contribute. This document explains how to get the project running locally, the conventions we follow, and the process for submitting changes.

---

## Table of contents

- [Code of conduct](#code-of-conduct)
- [Getting started](#getting-started)
- [Development workflow](#development-workflow)
- [Commit conventions](#commit-conventions)
- [Pull request process](#pull-request-process)
- [Reporting bugs](#reporting-bugs)
- [Suggesting features](#suggesting-features)
- [Project structure](#project-structure)

---

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating you agree to abide by its terms.

---

## Getting started

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20 LTS |
| Docker + Docker Compose | any recent version |
| Git | any recent version |

### Fork and clone

```bash
# Fork on GitHub, then:
git clone https://github.com/<your-username>/theory.git
cd theory
```

### Run with Docker (easiest)

```bash
docker-compose up
# → API at http://localhost:4000
# → App at http://localhost:3000
```

Login with any seed account (password `Theory@123` for all):

| Email | Role |
|---|---|
| `admin@theory.in` | Admin |
| `manager@theory.in` | Manager |
| `ba@theory.in` | Employee |

### Run locally (no Docker)

```bash
# 1 — Start Postgres + Redis
docker run -d -e POSTGRES_USER=theory -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=theory_db -p 5432:5432 postgres:15-alpine
docker run -d -p 6379:6379 redis:7-alpine

# 2 — Backend
cd backend
cp ../.env.example .env    # fill in JWT_SECRET, JWT_REFRESH_SECRET, JOURNAL_SECRET
npm install
npx prisma generate --schema=../database/schema.prisma
npx prisma migrate dev --schema=../database/schema.prisma
npx ts-node ../database/seed.ts
npm run dev                # http://localhost:4000

# 3 — Frontend (new terminal)
cd frontend
npm install
npm run dev                # http://localhost:3000
```

---

## Development workflow

```
main          ← protected, CI must pass before merge
  └── feat/your-feature
  └── fix/the-bug
  └── chore/tooling-change
```

1. Branch off `main`:  
   `git checkout -b feat/my-feature`
2. Make changes, run tests:  
   `cd backend && npm test && npm run typecheck`
3. Push and open a pull request against `main`.

---

## Commit conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:   a new feature
fix:    a bug fix
chore:  tooling, deps, CI (no production code change)
docs:   documentation only
refactor: code change with no functional effect
test:   adding or updating tests
```

Examples:
```
feat: add PDF export for daily log
fix: signal lifecycle ignores snoozed items correctly
chore: upgrade prisma to 5.11
```

---

## Pull request process

1. Fill in the PR template completely.
2. All CI checks must be green (typecheck, tests, build, audit).
3. Keep PRs focused — one concern per PR.
4. If adding a feature, include or update tests.
5. A maintainer will review within a few business days.

---

## Reporting bugs

Use the **Bug report** issue template. Include:
- Steps to reproduce
- Expected vs actual behaviour
- Browser / OS / Node version
- Relevant logs or screenshots

---

## Suggesting features

Use the **Feature request** issue template. Describe:
- The problem you're solving
- The proposed solution
- Any alternatives you considered

---

## Project structure

```
/
├── backend/        Node.js + Express API
│   ├── src/
│   │   ├── routes/       One router per resource
│   │   ├── controllers/  Business logic
│   │   ├── core/         Shared services (auth, billing, AI…)
│   │   ├── middleware/   Auth, role guard, rate limit
│   │   └── queue/        BullMQ workers
│   └── test/       Vitest integration tests (needs real Postgres + Redis)
├── frontend/       React 18 + Vite SPA
│   └── src/
│       ├── pages/        One file per module
│       ├── components/   Shared UI + layout
│       ├── store/        Zustand stores
│       └── services/     Axios API layer
└── database/
    ├── schema.prisma     Single source of truth
    ├── seed.ts           Idempotent demo data
    └── migrations/       Timestamped SQL migrations
```

---

## Questions?

Open a [GitHub Discussion](../../discussions) — we prefer that over issues for open-ended questions.
