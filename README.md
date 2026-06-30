# Dynamic Form Builder Engine

Configuration-driven form builder for the OpenOwnership full-stack assessment
(Assignment A). Forms are stored as JSON Schema, submissions are validated at
runtime with the shared validation engine, and each submission is pinned to the
exact form version that accepted it.

## What This Implements

- Create and manage versioned form configurations.
- Publish immutable form versions.
- Render published forms dynamically from `schema` + `uiSchema`.
- Validate submissions on the frontend and backend with the same shared Ajv
  engine.
- Persist responses against the exact `formVersionId` used for validation.
- Expose REST API docs through Swagger.

## Codebase Structure

```text
apps/
  api/              NestJS REST API, Prisma schema, migrations, seed data, e2e tests
  web/              Next.js app, form builder UI, dashboard, public form renderer
packages/
  shared/           Shared JSON Schema types and Ajv validation utilities
docs/
  adr/              Architecture decision records
  mockups/          Concept mockups generated with Codex Image Gen 2
  *.md              Assignment brief, API spec, testing notes, user journeys, TODOs
docker-compose.yml  Full local stack: PostgreSQL, API, and web app
turbo.json          Turborepo task graph
pnpm-workspace.yaml pnpm workspace package map
```

## Technology

- **Monorepo:** pnpm workspaces + Turborepo
- **Package manager:** pnpm `10.7.0` via the root `packageManager` field
- **Language:** TypeScript with strict settings
- **Backend:** NestJS 11, Prisma 6, PostgreSQL 16, Swagger/OpenAPI
- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, shadcn UI, TanStack Query,
  React Hook Form
- **Shared validation:** JSON Schema draft 2020-12, Ajv, ajv-formats
- **Testing:** Jest for API/shared package tests, Vitest + Testing Library for
  frontend tests

`@formbuilder/shared` is imported by both `apps/api` and `apps/web`. Validation
rules belong in JSON Schema and the shared validator, not duplicated in API or
frontend conditionals.

## Prerequisites

- Node.js 20+
- pnpm 10.x
- Docker Desktop or another Docker runtime if using the full local Compose stack
- PostgreSQL if you are not using Docker Compose

Enable pnpm through Corepack if needed:

```bash
corepack enable
corepack prepare pnpm@10.7.0 --activate
```

## Environment Setup

Copy the example environment files:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

The local database URL used by the examples is:

```bash
DATABASE_URL="postgresql://app@localhost:5432/form-engine"
```

The web app calls the versioned API prefix:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

## Docker Compose

The fastest reviewer path is the full local stack:

```bash
cp .env.example .env
docker compose up --build
docker compose ps
```

This starts:

- PostgreSQL 16 on `localhost:5432`
- NestJS API on `http://localhost:4000`
- Next.js web app on `http://localhost:3000`

The API service waits for Postgres, runs `prisma migrate deploy`, runs the
idempotent production seed, then starts Nest. The web service waits for the API
healthcheck.

Compose defaults come from `.env.example`:

```bash
POSTGRES_USER=app
POSTGRES_DB=form-engine
POSTGRES_PORT=5432
POSTGRES_HOST_AUTH_METHOD=trust
DATABASE_URL="postgresql://app@postgres:5432/form-engine"
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

To reset the local database volume:

```bash
docker compose down -v
cp .env.example .env
docker compose up --build
```

## Run Locally With pnpm

Use this path when developing without rebuilding containers.

Install dependencies from the repository root:

```bash
pnpm install
```

Start Postgres:

```bash
docker compose up -d postgres
```

For host-run API commands, use `apps/api/.env` with
`DATABASE_URL="postgresql://app@localhost:5432/form-engine"`. The root `.env`
uses the Compose service hostname (`postgres`) for containers.

Generate Prisma Client and run migrations:

```bash
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
```

Seed realistic example forms and responses:

```bash
pnpm --filter api db:seed
```

Run the API and web app in separate terminals:

```bash
pnpm --filter api dev
pnpm --filter web dev
```

Local URLs:

- Web app: `http://localhost:3000`
- API base: `http://localhost:4000/api/v1`
- Swagger docs: `http://localhost:4000/api/docs`
- Health check: `http://localhost:4000/api/v1/health`

## Hosted Deployment

The Railway deployment is public and does not require credentials:

- Web app: `https://form-engine.aubreyzulu.com`
- API base: `https://form-engine-api.up.railway.app/api/v1`
- Swagger docs: `https://form-engine-api.up.railway.app/api/docs`
- Health check: `https://form-engine-api.up.railway.app/api/v1/health`

Railway deploys the API from `main` with `pnpm start:api`. That command runs
`pnpm railway:api:release` before starting Nest, so checked-in migrations and the
idempotent seed are applied against the hosted PostgreSQL database on startup.

## Turborepo Commands

Root commands run through Turborepo:

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

Target one workspace with pnpm filters:

```bash
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter web test
pnpm --filter web build
pnpm --filter @formbuilder/shared test
```

Useful package scripts:

```bash
pnpm --filter api prisma:migrate:dev
pnpm --filter api prisma:migrate
pnpm --filter api db:seed
pnpm railway:api:release
pnpm --filter web dev
```

Use `prisma:migrate:dev` only while creating a new Prisma migration locally.
For setup, CI, and deploy-style verification, use `prisma:migrate`, which runs
`prisma migrate deploy` idempotently.

Railway starts the API with `pnpm start:api`, which runs `pnpm railway:api:release`
before `node dist/src/main.js`. The release step runs checked-in Prisma migrations
against the Railway `DATABASE_URL` and then runs the idempotent seed so the hosted
app has realistic review data before the API starts.

## Assessment Notes

- Published form versions are immutable.
- Submissions always reference a `formVersionId`.
- Form content validation runs through `@formbuilder/shared` on the client and
  server.
- Frontend data fetching uses TanStack Query with centralized query keys.
- Concept mockups in `docs/mockups/` were generated with Codex Image Gen 2.

## Trade-off Analysis

### Design Decisions

- **Database schema:** the relational core is `Form → FormVersion → Submission`.
  `Form` is the stable identity, `FormVersion` stores versioned `schema` and
  `uiSchema` as PostgreSQL `jsonb`, and `Submission` stores validated response
  data while pinning the exact `formVersionId`. This keeps relationships and
  integrity relational while allowing dynamic form shapes without migrations per
  form edit.
- **Routing structure:** authoring routes live under `/forms`, while public
  submission routes live under `/f`. The API mirrors this separation with a
  published render read (`GET /forms/:key`) and an authoring read
  (`GET /forms/:key/manage`) so draft-only forms can be managed without exposing
  drafts to submitters.
- **Validation strategy:** rules live in JSON Schema, not hardcoded field checks.
  Both API and web import `@formbuilder/shared`, so client-side validation is a
  UX preview of the same Ajv engine the server uses authoritatively.

### Implementation Details

- **Error handling:** the API uses DTO validation for request shape and domain
  exceptions for business rules. A global exception filter returns a stable
  `{ error: { code, message, details? } }` envelope; schema/submission failures
  return `422` with field-level details the frontend can map back to inputs.
- **Data consistency:** submissions are only written after server validation
  against the current published version. Publishing freezes a draft version, and
  attempts to edit or republish immutable versions return `409`.
- **Historical integrity:** a stored submission remains valid because it points to
  the immutable `FormVersion` that validated it. New form changes create a new
  draft/published version; older submissions keep their original `formVersionId`.

### Trade-offs and Production Scaling

- **Version FK over schema snapshot:** this avoids duplicating schema JSON on every
  submission and keeps "all submissions for v2" easy to query. The trade-off is
  that version immutability must be enforced strictly. If deletion of version rows
  ever became a requirement, adding a submission schema snapshot would be the next
  durability layer.
- **JSONB over per-field tables:** JSONB supports arbitrary form structures and
  avoids migrations for every field change. The trade-off is fewer relational
  constraints inside answers. At scale, add GIN indexes or extracted reporting
  tables for fields that need frequent filtering/analytics.
- **Synchronous validation now, cached validation later:** compiling Ajv validators
  per request is simple for the assessment. In production, cache compiled
  validators by immutable `formVersionId`.
- **Simple deployment path now:** Railway and Docker Compose run migrations and an
  idempotent seed before API startup for reviewability. In a larger cloud setup,
  move migrations/seeding to explicit release jobs, run stateless API replicas
  behind a load balancer, and add authentication/roles around publishing.

## With More Time

- Authentication, roles, and multi-tenant ownership boundaries.
- Conditional/branching fields and localisation support.
- Richer response analytics and export workflows.
- Smaller production Docker images using pruned workspace installs.
