# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `main` branch | ✅ |
| Older tags | ❌ — upgrade to latest |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, open a [GitHub Security Advisory](../../security/advisories/new) (private disclosure). Include:

1. A description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Any suggested fix (optional)

You will receive acknowledgement within **48 hours** and a detailed response within **5 business days**.

## Disclosure policy

- We will confirm receipt and begin triaging immediately.
- We will keep you informed of progress.
- We will credit reporters in the release notes (unless you prefer to remain anonymous).
- We ask for **90 days** before public disclosure to give us time to ship a fix.

## Security design notes

| Concern | Approach |
|---|---|
| Journal privacy | AES-256-GCM encryption at write time; journal field stripped from every API response at ORM layer |
| Password storage | Argon2id with OWASP recommended parameters; transparent bcrypt→argon2 upgrade on login |
| Session tokens | Refresh tokens stored as SHA-256 hashes; rotated on every use |
| Tenant isolation | Every Prisma query auto-scoped to the requesting tenant at ORM layer |
| CAPTCHA | Cloudflare Turnstile (opt-in via `TURNSTILE_SECRET`) |
| Rate limiting | 10 req / 15 min on all auth routes; 120 req / min globally |
| CORS | Strict origin whitelist from `FRONTEND_URL` |
| Password reset | Server always returns 200 — never reveals whether an email exists |
