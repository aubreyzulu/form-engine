# 07 — Testing Strategy

The overview states the bar: _"clean, well-reasoned, well-tested code on a small
surface."_ We test the things that, if wrong, break the engine's promises — not
for coverage vanity.

## What we test and why

### 1. Validation engine (`packages/shared`) — unit

The heart of "configuration-driven validation." For a representative schema:

- Valid payload passes.
- Each rule rejects when violated: `required`, `minLength`/`maxLength`,
  `minimum`/`maximum`, `enum`, `format: email`, `format: date`, `additionalProperties: false`.
- `allErrors` returns **multiple** errors at once.
- Error normalisation produces the `{ field, keyword, message }` shape the API and
  UI depend on.

### 2. Version immutability & publishing (api service) — unit

The heart of "historical integrity." With Prisma mocked:

- Editing a `DRAFT` succeeds.
- Editing a `PUBLISHED` version is rejected (`409 VERSION_NOT_EDITABLE`).
- Publishing a `DRAFT` sets `PUBLISHED` + `publishedAt`; re-publishing is rejected.
- "Current version" resolves to the highest `PUBLISHED` version.
- Publishing a malformed JSON Schema is rejected.

### 3. Submission flow (api) — e2e (real HTTP + test DB)

`apps/api/test/submissions.e2e-spec.ts` drives the actual API surface with
`supertest` (needs `DATABASE_URL` → a disposable Postgres with migrations applied):

- `POST /forms/:key/submissions` with a valid payload → `201`, row persisted,
  `formVersionId` pinned to the current published version.
- Invalid payload → `422` with `details`, and **no row written** (asserted by a
  follow-up count/list).
- Submitting to an unknown form → `404`.
- A submission keeps validating against its pinned version even after a newer
  version is published (the historical-integrity guarantee, end-to-end).

### 4. Error envelope — e2e

- `404` and `422` both render the documented envelope shape with stable `code`s.

### 5. Frontend data flows and builder behavior — Vitest + Testing Library

The frontend tests cover the user-facing state transitions and the schema/builder
edge cases that are easiest to regress:

- Forms/dashboard/manage/fill routes handle loading, error, empty, success, and
  retry states through TanStack Query.
- Save draft, publish, submit, and edit flows call the API layer through React
  Query mutations and invalidate the relevant query keys.
- The fill renderer uses shadcn-backed controls and maps backend values for text,
  number, date, select/dropdown, checkbox, and checkbox-group fields.
- Server `422` details map back to field-level errors.
- Builder compile/decompile keeps stable field keys, option labels/values, field
  ordering, required flags, and type-transition behavior.
- Live preview uses the same dynamic renderer as the public fill route.

### 6. Deployment smoke tests

- Docker Compose builds and starts Postgres, API, and web with healthchecks.
- The API container runs `prisma migrate deploy` and the idempotent production seed
  before Nest starts.
- Railway deploy smoke checks cover hosted API health, Swagger, web routes, and
  seeded form reads.

## Tooling

- **Jest** (NestJS default) for api unit + e2e; `supertest` for HTTP.
- **Vitest** + Testing Library for frontend component, route-client, reducer, and
  API-client tests.
- e2e runs against a disposable Postgres (docker-compose service or a
  `DATABASE_URL` pointing at a test schema); migrations applied, DB reset between
  runs.
- Shared-package tests run with Jest too, wired through Turborepo `test`.

## Running

```bash
pnpm test            # turbo: all packages
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter web test
pnpm --filter @formbuilder/shared test
docker compose up --build
```
