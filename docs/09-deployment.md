# 09 — Deployment & Local Setup

Two ways to run: **docker-compose** (local, one command) and **Railway** (hosted,
the graded live URL). Both are required by the brief.

## Local — docker-compose

`docker-compose.yml` brings up three services:

```
postgres   → Postgres 16, volume-backed, healthcheck
api        → NestJS; on start: prisma migrate deploy + seed, then serve :4000
web        → Next.js; serves :3000, talks to api via NEXT_PUBLIC_API_URL
```

- `api.depends_on: postgres` gated on the DB healthcheck so migrations never race
  startup.
- Migrations + seed run automatically on `api` boot so a clean checkout is usable
  immediately.
- One command: `docker compose up --build`. App at `http://localhost:3000`, API at
  `http://localhost:4000`, Swagger at `http://localhost:4000/api/docs`.

A non-Docker path is also documented (run Postgres locally or via the compose db
only, then `pnpm --filter api start:dev` and `pnpm --filter web dev`).

## Env vars

| Var | Used by | Example |
| --- | --- | --- |
| `DATABASE_URL` | api (Prisma) | `postgresql://app:app@postgres:5432/forms` |
| `NEXT_PUBLIC_API_URL` | web | `http://localhost:4000/api/v1` |
| `PORT` | api/web | `4000` / `3000` |

`.env.example` files committed; real `.env` git-ignored.

## Hosted — Railway

One Railway project, three components:

1. **Postgres** — Railway managed plugin; provides `DATABASE_URL`.
2. **api** — built from `apps/api/Dockerfile`. Release step runs
   `prisma migrate deploy` (+ seed once). Exposes the API; healthcheck on `/health`.
3. **web** — built from `apps/web/Dockerfile`; `NEXT_PUBLIC_API_URL` points at the
   api service's public domain.

Why Railway: a single dashboard hosts DB + both services, deploys from the repo,
and yields stable public URLs — the least operational overhead for an assessment
reviewer to "use it without setting it up locally." The Dockerfiles keep us
portable (Fly/Render/any container host) if needed.

### Deploy outline
- Push repo → Railway builds each service from its Dockerfile.
- Set service env vars (DB URL injected by the plugin; `NEXT_PUBLIC_API_URL` set to
  the api domain).
- Migrations/seed run on release.
- Capture the two public URLs (+ note that no credentials are needed — Assignment A
  has no auth) in the top-level README.

## CORS

API enables CORS for the web origin(s) (`localhost:3000` and the Railway web
domain) so the browser client can call it directly.

## Production scaling notes (for the README trade-offs)

- **DB:** add GIN indexes on `Submission.data` if we start querying by answer;
  partition submissions by form/time at volume.
- **Validators:** cache compiled Ajv validators per `formVersionId` (immutable →
  perfectly cacheable) instead of recompiling per request.
- **API:** stateless → horizontal scale behind a load balancer; move seed out of
  boot into an explicit release job.
- **Schema governance:** add auth + roles for *who* can publish versions; add
  schema-evolution checks (warn when a new version would invalidate prior
  submissions).
