# Dynamic Form Builder Engine

Configuration-driven form builder for the OpenOwnership full-stack assessment.
Forms are stored as JSON Schema, submissions are validated at runtime with the
shared validation engine, and each submission is pinned to the exact form version
that produced it.

## Stack

- `apps/api`: NestJS, Prisma, PostgreSQL
- `apps/web`: Next.js, React, Tailwind
- `packages/shared`: shared JSON Schema types and Ajv validation
- `docs`: architecture notes, API spec, user journeys, ADRs, and concept mockups

## Prerequisites

- Node.js 20+
- pnpm 10.x
- PostgreSQL, either your own instance or the local compose service
- Docker, only if you want the provided local Postgres service

## Environment

Copy the examples:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Update `DATABASE_URL` in `apps/api/.env` before running migrations. The local
example is:

```bash
DATABASE_URL="postgresql://aubreyzulu@localhost:5432/form-engine"
```

`NEXT_PUBLIC_API_URL` should point at the API version prefix:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

## Local Setup

Install dependencies:

```bash
pnpm install
```

Start local Postgres if you are using Docker:

```bash
docker compose up -d postgres
```

Create and apply the Prisma migration from the schema after replacing
`DATABASE_URL`:

```bash
cd apps/api
npx prisma migrate dev
cd ../..
```

Seed example forms:

```bash
pnpm --filter api db:seed
```

Run the apps in separate terminals:

```bash
pnpm --filter api dev
pnpm --filter web dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/api/docs`

## Verification

Use the project pnpm version when running checks:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## Notes

- Published form versions are immutable. Edits create or update drafts.
- Submissions always reference a `formVersionId`.
- Field validation belongs in JSON Schema and `@formbuilder/shared`, not in
  duplicated app-specific conditionals.
- Concept mockups in `docs/mockups/` were generated with Codex Image Gen 2.
