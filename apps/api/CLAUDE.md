# CLAUDE.md — apps/api (NestJS backend)

The engine + REST API. Read the root `CLAUDE.md` first for the two overriding
principles (configuration-driven validation, historical integrity).

## Architecture: three layers, one direction

```
Controller  →  Service  →  PrismaService
(transport)    (engine)     (persistence)
```

- **Controllers** are thin. Parse params/body, call one service method, shape the
  HTTP response, set status codes. **No business logic, no Prisma calls** in controllers.
- **Services** own all engine logic: versioning, immutability, validation
  orchestration, resolving the current published version. This is where rules live.
- **PrismaService** is the only persistence boundary. Services depend on it via DI
  (constructor injection) so they can be unit-tested with a mock — see
  `forms.service.spec.ts` for the pattern.

Module per resource: `forms` (forms + versions), `submissions`, `health`. Prisma is
a `@Global()` module. A new resource = new module folder with
`*.module.ts / *.controller.ts / *.service.ts / dto.ts`.

## Validation: two distinct layers — don't conflate them

1. **Request shape** → `class-validator` DTOs + the global `ValidationPipe`
   (`whitelist`, `forbidNonWhitelisted`). This rejects malformed/unknown fields → `400`.
2. **Submission/schema content** → `@formbuilder/shared` (`validateSubmission`,
   `validateSchemaDocument`) in the **service**. This runs the config's JSON Schema
   rules → `422` on failure.

Never hardcode field rules in a DTO or service. Field rules belong in the stored
JSON Schema. DTOs only describe the request envelope (`data` is an object, `key` is
a slug, etc.).

## Errors: one envelope, stable codes

- Throw the domain exceptions in `common/errors.ts` (`NotFoundError`,
  `ConflictError`, `UnprocessableError`) with a stable `ErrorCode`. Add new codes to
  the `ErrorCode` map — don't invent ad-hoc strings.
- `AllExceptionsFilter` renders everything as
  `{ error: { code, message, details? } }`. `details` is for field-level validation
  errors (the normalised `ValidationError[]` from the shared package).
- Status code conventions: `201` create · `200` read/publish · `400` malformed
  request · `404` not found · `409` illegal state (editing/publishing a non-DRAFT) ·
  `422` content failed schema validation. Match these exactly.

## The historical-integrity invariant (do not break)

- `FormVersion` is **immutable once `PUBLISHED`.** Edits/publish on a non-`DRAFT`
  version must throw `ConflictError(VERSION_NOT_EDITABLE)`. Evolving a form = create
  a new draft + publish it (next `version`).
- `Submission.formVersionId` pins the exact version validated. Submissions validate
  against the **current published version** (`getCurrentPublishedVersion`), and that
  link is permanent.
- These rules are covered by `forms.service.spec.ts`. If you change publishing,
  update those tests; do not weaken them.

## Prisma

- Schema at `prisma/schema.prisma`; `schema`/`uiSchema`/`data` are `Json` (JSONB).
- Cast app objects to `Prisma.InputJsonValue`; use `Prisma.JsonNull` for absent JSON.
- Migrations are the source of truth (`prisma migrate`). The seed (`prisma/seed.ts`)
  must stay **idempotent** (upsert form, create v1 only if no versions exist).
- After schema changes: `pnpm --filter api prisma:generate` then a migration.

## Testing

- Unit tests (`*.spec.ts`, `jest`): service rules with a **mocked PrismaService** —
  no DB needed. Cover legal and illegal transitions, not just happy paths.
- e2e (`test/*.e2e-spec.ts`, `supertest`): real HTTP against a test Postgres. Assert
  the submission flow, `422`-with-no-write, `404`s, and the error envelope shape.
- Run: `pnpm --filter api test` / `test:e2e`.

## Conventions

- Strict TS; no `any` (lint warns). Type Prisma results; don't cast away safety.
- Keep Swagger decorators (`@ApiTags`, DTO `@ApiProperty`) current — `/api/docs` is
  part of the deliverable.
- REST surface is under `/api/v1`. Forms are addressed by `key` (slug), versions by
  integer, submissions by `id`.
