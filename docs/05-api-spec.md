# 05 — API Specification (REST)

Base URL: `/api/v1`. JSON in/out. NestJS controllers are thin; services hold logic.

## Conventions

- **Resource identity:** forms are addressed by their stable `key` slug; versions
  by integer `version`; submissions and other entities by `id` (uuid).
- **Status codes:** `200` read, `201` create, `204` no content, `400` malformed
  request, `404` not found, `409` illegal state (e.g. editing a published
  version), `422` submission failed config validation.
- **Validation:** request *shape* validated by Nest DTOs + `ValidationPipe`
  (`whitelist`, `forbidNonWhitelisted`). Submission *content* validated by Ajv
  against the form's schema.

## Error envelope (every error response)

A global exception filter renders one consistent shape:

```json
{
  "error": {
    "code": "SUBMISSION_VALIDATION_FAILED",
    "message": "The submission did not match the form configuration.",
    "details": [
      { "field": "ownershipPercent", "keyword": "maximum", "message": "must be <= 100" },
      { "field": "country", "keyword": "enum", "message": "must be one of GB, US, ZM, NG" }
    ]
  }
}
```

`code` is a stable machine string; `details` is present for validation errors and
omitted otherwise. Success responses return the resource directly (no envelope).

## Endpoints

### Forms

| Method | Path | Purpose | Codes |
| --- | --- | --- | --- |
| `GET` | `/forms` | List forms; each row carries `status` (latest version's status, incl. DRAFT-only), `latestVersion`, `publishedVersion`/`publishedAt`, and `submissionCount`. | 200 |
| `GET` | `/forms/:key` | **Render read** — form + its current *published* version (schema + uiSchema). Used by the public Fill page. `404`/no-published if none. | 200, 404 |
| `GET` | `/forms/:key/manage` | **Authoring read** — form + its *latest* version of any status (incl. DRAFT) + `submissionCount`. Used by the creator's manage page. | 200, 404 |
| `POST` | `/forms` | Create a form with an initial `DRAFT` version. `409` on duplicate key, `422` on invalid schema/uiSchema. | 201, 400, 409, 422 |

> Two reads on purpose: the submitter needs the *published* config; the creator's
> manage page must load a *draft-only* form too. See journeys audit (G1/G4).

### Form versions (authoring)

| Method | Path | Purpose | Codes |
| --- | --- | --- | --- |
| `GET` | `/forms/:key/versions` | List versions with status. | 200, 404 |
| `GET` | `/forms/:key/versions/:version` | Get one version (full schema). | 200, 404 |
| `POST` | `/forms/:key/versions` | Create a new `DRAFT`. Omit `schema` to clone the latest version (how "edit a published form → v2" works). | 201, 404, 422 |
| `PATCH` | `/forms/:key/versions/:version` | Edit a `DRAFT`'s schema/uiSchema. **409 if not DRAFT.** | 200, 409, 422 |
| `POST` | `/forms/:key/versions/:version/publish` | Freeze a `DRAFT` → `PUBLISHED`. Validates the schema is well-formed and the uiSchema references only real fields first. | 200, 409, 422 |

> `PATCH`/publish enforce immutability: a `PUBLISHED` version can never be edited.
> Attempting to returns `409 VERSION_NOT_EDITABLE`. This is the rule the
> historical-integrity guarantee rests on, and it is unit-tested.

### Submissions

| Method | Path | Purpose | Codes |
| --- | --- | --- | --- |
| `POST` | `/forms/:key/submissions` | Validate payload against the **current published version** and persist, pinning that version. | 201, 404, 422 |
| `GET` | `/forms/:key/submissions` | List submissions for a form. Paginated via `?skip` & `?take` (default 50, max 200); returns `{ items, total, skip, take }`. | 200, 404 |
| `GET` | `/submissions/:id` | Get a submission, including which `formVersion` validated it. | 200, 404 |

`POST /forms/:key/submissions` request:

```json
{ "data": { "fullName": "Ada", "country": "GB", "ownershipPercent": 42 } }
```

Success `201`:

```json
{
  "id": "…",
  "formVersionId": "…",
  "formVersion": { "version": 2 },
  "data": { "fullName": "Ada", "country": "GB", "ownershipPercent": 42 },
  "createdAt": "2026-06-27T10:00:00.000Z"
}
```

Validation failure `422`: the error envelope above; **nothing is written**.

## OpenAPI

NestJS `@nestjs/swagger` generates interactive API docs at `/api/docs` from the
DTOs/decorators, so the contract is explorable without reading the source.

## Health

`GET /health` returns `{ status: "ok" }` (and DB connectivity) for Railway
healthchecks and docker-compose `depends_on` gating.
