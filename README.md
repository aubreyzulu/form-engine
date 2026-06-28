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
docker-compose.yml  Local PostgreSQL service for development
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
- Docker Desktop or another Docker runtime if using the provided local Postgres
  service
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
DATABASE_URL="postgresql://app:app@localhost:5432/form-engine"
```

The web app calls the versioned API prefix:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

## Docker Compose

The current `docker-compose.yml` provides the PostgreSQL service expected by the
local assessment workflow:

```bash
docker compose up -d postgres
docker compose ps
```

Defaults come from `.env.example`:

```bash
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=form-engine
POSTGRES_PORT=5432
```

To reset the local database volume:

```bash
docker compose down -v
docker compose up -d postgres
```

Full API/web Docker services are not part of the current Compose file yet. Until
those Dockerfiles are added, run the API and web app with pnpm as described
below.

## Run Locally

Install dependencies from the repository root:

```bash
pnpm install
```

Start Postgres:

```bash
docker compose up -d postgres
```

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
pnpm --filter web dev
```

Use `prisma:migrate:dev` only while creating a new Prisma migration locally.
For setup, CI, and deploy-style verification, use `prisma:migrate`, which runs
`prisma migrate deploy` idempotently.

## Assessment Notes

- Published form versions are immutable.
- Submissions always reference a `formVersionId`.
- Form content validation runs through `@formbuilder/shared` on the client and
  server.
- Frontend data fetching uses TanStack Query with centralized query keys.
- Concept mockups in `docs/mockups/` were generated with Codex Image Gen 2.

## Current Gaps

Notable remaining items include full-stack Docker services, Railway
migration/seed verification, and ongoing documentation refresh as implementation
details change.
