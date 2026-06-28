# 04 — Validation Strategy

The brief is explicit: **do not hardcode field rules** like `if (age < 18)` in
application code. The configuration carries the rules; a generic engine runs them.

## One schema language: JSON Schema (draft 2020-12)

Form configurations are stored as **JSON Schema**. It is the standard the brief
recommends, it is declarative, portable, and there is a mature engine for it.

Example stored `schema` for a form field set:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["fullName", "country", "ownershipPercent"],
  "properties": {
    "fullName": { "type": "string", "minLength": 1, "maxLength": 200 },
    "email": { "type": "string", "format": "email" },
    "country": { "type": "string", "enum": ["GB", "US", "ZM", "NG"] },
    "ownershipPercent": { "type": "number", "minimum": 0, "maximum": 100 },
    "isPEP": { "type": "boolean" },
    "appointedOn": { "type": "string", "format": "date" }
  }
}
```

No backend code knows what `ownershipPercent` is. Change the rule (e.g. `maximum`
to 75) by publishing a new version — **zero code change, zero migration.**

## One engine: Ajv (shared by API and web)

`packages/shared` exports a single validator factory:

Implementation: `packages/shared/src/validator.ts`. The package exposes two
functions — `validateSubmission(schema, data)` and `validateSchemaDocument(schema)` —
both returning `{ valid, errors }`. Key choices:

- **`allErrors: true`** so the user sees _every_ problem at once, not one at a time.
- **`strict: false`** to tolerate the range of user-authored schemas we store.
- **`ajv-formats`** adds `email`, `date`, `uri`, etc.
- Errors are **normalised** into a stable `{ field, keyword, message }` shape so the
  API envelope and the frontend field highlighting consume the same thing.

### Why share the validator (not duplicate)

The web app validates the same payload with the **same function** before submit.
The API re-validates server-side (never trust the client). Because both import
from `packages/shared`, the rules cannot drift between client and server — a real
source of bugs in form systems, eliminated by construction.

## Where validation runs

| Stage                 | Where        | Purpose                                                                                                                    |
| --------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| On change / on submit | Web (client) | Fast UX; show field errors inline before a round-trip.                                                                     |
| On `POST` submission  | API (server) | **Authoritative.** Validate `data` against the _published version's_ schema before persisting. Reject with `422` + errors. |

Server-side validation is the source of truth; the client copy is purely UX. An
attacker calling the API directly is still fully validated.

## Error normalisation (Ajv → our envelope)

Ajv emits paths like `/ownershipPercent` and keywords like `maximum`. We map to:

```json
{
  "field": "ownershipPercent",
  "keyword": "maximum",
  "message": "must be <= 100"
}
```

The frontend keys these by `field` to render the message under the right input.

## Field types & widgets

JSON Schema covers the _rules_; `uiSchema` covers _presentation_ (which widget,
order, labels, help). This separation keeps the validation schema clean and
reusable. Mapping:

| Intent        | JSON Schema                            | uiSchema widget     |
| ------------- | -------------------------------------- | ------------------- |
| Short text    | `string`                               | `text` (default)    |
| Long text     | `string`                               | `textarea`          |
| Email         | `string` + `format: email`             | `text`              |
| Number        | `number` + `minimum`/`maximum`         | `number`            |
| Single choice | `string` + `enum`                      | `select` or `radio` |
| Multi choice  | `array` + `items.enum` + `uniqueItems` | `checkboxes`        |
| Boolean       | `boolean`                              | `checkbox`          |
| Date          | `string` + `format: date`              | `date`              |

## Validating the configs themselves

Whenever a schema is **saved or published** (create form, create/edit draft,
publish), three `packages/shared` checks gate it — all covered by tests:

1. **`validateSchemaDocument`** — `schema` is itself a valid JSON Schema (Ajv
   `validateSchema`). Stops freezing a config that would reject every submission
   (`422 SCHEMA_INVALID`).
2. **`validateSupportedFields`** — every field uses a type/format the engine can
   render, not merely anything Ajv accepts. Allowlist (the single source is
   `SUPPORTED_FIELD_TYPES` / `SUPPORTED_STRING_FORMATS`):

   | Type      | Allowed extras                                                           |
   | --------- | ------------------------------------------------------------------------ |
   | `string`  | `format` ∈ {`email`, `date`}, `enum` of strings, length bounds           |
   | `number`  | `minimum` / `maximum`                                                    |
   | `boolean` | —                                                                        |
   | `array`   | `items` must be `string` + `enum` and `uniqueItems: true` (multi-choice) |

   Anything else — `integer`, nested `object`, `format: uri`, an array of
   objects, `oneOf`/`$ref`, etc. — is rejected (`422 UNSUPPORTED_FIELD_TYPE`) so
   we never persist a field we couldn't render back. Extend the engine by adding
   to the allowlist (+ a widget), never by hand-storing an unsupported shape.
   This check also rejects impossible builder ranges such as `minimum > maximum`
   or `minLength > maxLength`.

3. **`validateUiSchemaReferences`** — `uiSchema.order` / `uiSchema.fields` only
   name properties that exist in the schema, so we never render or order phantom
   fields (`422 UI_SCHEMA_INVALID`). `uiSchema.order` must contain unique string
   field names, matching the builder's round-trip rules.
