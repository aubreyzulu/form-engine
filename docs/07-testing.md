# 07 — Testing Strategy

The overview states the bar: *"clean, well-reasoned, well-tested code on a small
surface."* We test the things that, if wrong, break the engine's promises — not
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

## Tooling

- **Jest** (NestJS default) for api unit + e2e; `supertest` for HTTP.
- e2e runs against a disposable Postgres (docker-compose service or a
  `DATABASE_URL` pointing at a test schema); migrations applied, DB reset between
  runs.
- Shared-package tests run with Jest too, wired through Turborepo `test`.

## Out of scope (noted)

- Frontend component tests (Playwright/RTL) would be the next add; for this
  exercise we keep test investment on the engine + API where correctness matters
  most, and rely on the shared validator tests to cover the rules the UI uses.

## Running

```
pnpm test            # turbo: all packages
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter @formbuilder/shared test
```
