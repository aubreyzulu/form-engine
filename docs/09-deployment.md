# 09 — Deployment & Local Setup

Two ways to run: **docker-compose** (local, one command) and **Railway** (hosted,
the graded live URL). Both are required by the brief.

## Local — full Docker Compose

`docker-compose.yml` brings up the full local stack:

```text
postgres   → Postgres 16, volume-backed, healthcheck
api        → NestJS API, waits for Postgres, migrates + seeds on start
web        → Next.js app, waits for API health
```

```bash
cp .env.example .env
docker compose up --build
```

App at `http://localhost:3000`, API at `http://localhost:4000`, Swagger at
`http://localhost:4000/api/docs`.

The API container runs the same release path as Railway: `prisma migrate deploy`
then the idempotent production seed before `node dist/src/main.js`.

The migration directory is intentionally created by Prisma, not hand-written. To
create the initial migration with the local compose database, run
`npx prisma migrate dev` from `apps/api`.

## Env vars

| Var                                                                          | Used by       | Example                                      |
| ---------------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| `DATABASE_URL`                                                               | api (Prisma)  | `postgresql://app@postgres:5432/form-engine` |
| `NEXT_PUBLIC_API_URL`                                                        | web           | `http://localhost:4000/api/v1`               |
| `PORT`                                                                       | api           | `4000`                                       |
| `CORS_ORIGINS`                                                               | api           | `http://localhost:3000`                      |
| `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PORT`, `POSTGRES_HOST_AUTH_METHOD` | local compose | `app`, `form-engine`, `5432`, `trust`        |

`.env.example` files committed; real `.env` git-ignored.

## Hosted — Railway

One Railway project, three components:

1. **Postgres** — Railway managed plugin; provides `DATABASE_URL`.
2. **api** — NestJS service. Railway starts the service with `pnpm start:api`,
   which runs `pnpm railway:api:release` before `node dist/src/main.js`. That
   applies Prisma migrations and idempotently seeds realistic review data before
   the API starts. Exposes the API; healthcheck on `/api/v1/health`.
3. **web** — Next.js service. `NEXT_PUBLIC_API_URL` points at the api service's
   public domain.

Why Railway: a single dashboard hosts DB + both services, deploys from the repo,
and yields stable public URLs — the least operational overhead for an assessment
reviewer to "use it without setting it up locally."

### Deploy outline

- Push repo → Railway builds each app with configured build/start commands
  (Railway currently uses repo-level build/start commands).
- Set service env vars (DB URL injected by the plugin; `NEXT_PUBLIC_API_URL` set to
  the api domain).
- API service start command: `pnpm start:api`. This runs
  `pnpm railway:api:release` (`prisma migrate deploy` + `db:seed:prod`) before
  starting the production Nest server.
- Public URLs and the no-auth note are captured in the top-level README.

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
- **Schema governance:** add auth + roles for _who_ can publish versions; add
  schema-evolution checks (warn when a new version would invalidate prior
  submissions).
