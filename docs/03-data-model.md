# 03 — Data Model & Historical Integrity

This is the crux of Assignment A. The brief asks specifically how "a stored
submission stays valid against the configuration version that produced it." Our
answer: **immutable, published form versions; submissions pin a version by FK.**

## Entities

### `Form` — stable logical identity

The thing people refer to ("Beneficial Ownership Declaration"). It carries no
field definitions itself; it is the anchor that versions hang off.

| Field                     | Type         | Notes                                            |
| ------------------------- | ------------ | ------------------------------------------------ |
| `id`                      | uuid (pk)    |                                                  |
| `key`                     | text, unique | Stable slug used in URLs/API (`bo-declaration`). |
| `name`                    | text         | Human title.                                     |
| `description`             | text?        |                                                  |
| `createdAt` / `updatedAt` | timestamptz  |                                                  |

### `FormVersion` — the immutable configuration

One row per version of a form's configuration. **Once `PUBLISHED`, it is treated
as immutable** — edits create a _new_ version, never mutate an existing one.

| Field         | Type                                  | Notes                                                                                                                             |
| ------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | uuid (pk)                             |                                                                                                                                   |
| `formId`      | uuid (fk → Form)                      |                                                                                                                                   |
| `version`     | int                                   | Monotonic per form; `@@unique([formId, version])`.                                                                                |
| `status`      | enum `DRAFT \| PUBLISHED \| ARCHIVED` | Only `PUBLISHED` accepts submissions.                                                                                             |
| `schema`      | jsonb                                 | **JSON Schema (draft 2020-12)** — fields, types, validation rules.                                                                |
| `uiSchema`    | jsonb?                                | Rendering hints: field order, widget (textarea/select/radio), labels, help text. Keeps presentation out of the validation schema. |
| `publishedAt` | timestamptz?                          | Set on publish.                                                                                                                   |
| `createdAt`   | timestamptz                           |                                                                                                                                   |

Constraints / invariants (enforced in the service layer, see notes below):

- A `DRAFT` may be edited freely. **Publishing freezes it.**
- At most one **active** published version is "current" per form for new
  submissions (we resolve "current" as the highest `version` with
  `status = PUBLISHED`). Older published versions remain valid and queryable.

### `Submission` — user response, version-pinned

| Field           | Type                    | Notes                              |
| --------------- | ----------------------- | ---------------------------------- |
| `id`            | uuid (pk)               |                                    |
| `formVersionId` | uuid (fk → FormVersion) | **The historical-integrity link.** |
| `data`          | jsonb                   | The validated response payload.    |
| `createdAt`     | timestamptz             |                                    |

`data` is only ever written after passing validation against
`formVersion.schema`. Because the referenced version is immutable, re-validating
an old submission years later yields the same result.

## ER overview

```
Form (1) ──< FormVersion (1) ──< Submission
            (immutable once             (data: jsonb,
             PUBLISHED)                   pins formVersionId)
```

## How this design gives historical integrity

**Problem:** if a form's rules change after someone submits, their stored answer
must not retroactively become "invalid" or be misinterpreted.

**Our guarantee:** a submission references a specific `FormVersion`, and published
versions never change. The config that validated the payload is the exact config
forever associated with it. To evolve a form you publish `version + 1`; existing
submissions keep pointing at the version they were created under.

### Why pin by FK rather than snapshot the schema into the submission?

Two valid strategies:

| Strategy                           | Pros                                                                                                                                                         | Cons                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Version FK (chosen)**            | Normalised, no duplication; one schema row reused by N submissions; queryable ("all submissions on v2"); immutability makes the FK as durable as a snapshot. | Relies on enforcing version immutability.                                                                         |
| Schema snapshot in each submission | Self-describing row; survives even if the version row is deleted.                                                                                            | Heavy duplication; schema drift impossible to reason about in aggregate; encourages treating versions as mutable. |

We choose the **FK** because immutability already provides the durability a
snapshot would, without the duplication. We note the snapshot as a belt-and-braces
option (and an easy add: store `schemaSnapshot jsonb` on `Submission`) in the
trade-offs. (See [ADR-0003](./adr/0003-form-versioning-historical-integrity.md).)

## Why JSONB for `schema` and `data`

- The whole point of the engine is **dynamic** structure — we cannot model
  arbitrary user forms as static columns without the redeploy/migration pain the
  brief calls out.
- Postgres `jsonb` gives us flexible storage **plus** indexing (GIN) and queryable
  paths if we later need to filter submissions by an answer.
- We still keep the **relationships** (Form → Version → Submission) relational, so
  we get referential integrity where it matters and flexibility where we need it.

## Prisma schema

The live schema is `apps/api/prisma/schema.prisma` (source of truth). The tables
above mirror it; the `@@unique([formId, version])` and `@@index([formId, status])`
constraints back the version-numbering and current-version lookup.

## Seed data

`apps/api/prisma/seed.ts` publishes realistic example forms so the hosted URL is
usable immediately: **Beneficial Ownership Disclosure**, **Supplier Onboarding
and Due Diligence**, and **Grant Application Due Diligence**. The seed covers
longer production-style schemas, option label/value metadata, required and
optional fields, strings, numbers, booleans, dates, select/radio/checkbox-style
widgets, and sample submissions pinned to the generated published version.
