# ADR-0002 — JSON Schema (draft 2020-12) + Ajv as the validation engine

**Status:** Accepted · **Date:** 2026-06-27

## Context
The brief forbids hardcoding field rules in app code; configuration must define the
rules and a generic engine must run them at runtime. It recommends JSON Schema.

## Decision
Store form configurations as **JSON Schema (draft 2020-12)**. Validate with **Ajv**
(`+ ajv-formats`), exposed via a single factory in `packages/shared` used by both
the API (authoritative) and the web app (UX).

## Rationale
- JSON Schema is the standard the brief recommends: declarative, portable, tool-rich.
- Ajv is the reference engine — fast (compiles schemas), supports `allErrors`, formats,
  and `validateSchema` for sanity-checking configs themselves.
- One shared validator => the client and server rules cannot diverge.

## Consequences
- Presentation concerns (widget, order, labels) live in a separate `uiSchema`, keeping
  the validation schema clean and reusable.
- Compiled validators are cacheable per immutable version (a production optimisation).

## Alternatives considered
- **Zod** — great DX, but schemas are code, not portable data; storing/【versioning】
  arbitrary user-defined Zod in the DB is awkward. JSON Schema is data-first, which is
  exactly what a config-driven engine wants.
- **Hand-rolled rule interpreter** — reinvents JSON Schema, more code, less standard.
- **`react-jsonschema-form` for validation** — couples validation to the UI lib; we
  want validation usable server-side too.
