# ADR-0003 — Immutable form versions; submissions pin a version (historical integrity)

**Status:** Accepted · **Date:** 2026-06-27

## Context
The brief's headline implementation concern: "how a stored submission stays valid
against the configuration version that produced it." Form rules change over time;
old submissions must remain interpretable under the rules that validated them.

## Decision
Model three entities: `Form` (stable identity) → `FormVersion` (immutable once
`PUBLISHED`) → `Submission`. Each submission stores a **foreign key to the exact
`FormVersion`** it was validated against. Evolving a form means publishing a new
version; existing submissions keep pointing at their original version.

## Rationale
- Immutability of published versions + an FK gives a permanent, exact link between a
  submission and the config that produced it — re-validation is reproducible forever.
- Normalised: one schema row serves N submissions; we can query "all submissions on
  version 2" and reason about distributions per version.
- The immutability rule is small and enforceable in the service layer (reject edits
  to non-`DRAFT` versions) and is unit-tested.

## Consequences
- Authoring is "create draft → edit → publish (freeze)"; no in-place edits to a live
  config.
- The guarantee depends on enforcing immutability; this is explicitly tested
  (editing a `PUBLISHED` version returns `409`).

## Alternatives considered
- **Snapshot the schema into every submission** — self-describing rows, but heavy
  duplication, invites treating versions as mutable, and harder to analyse in
  aggregate. Immutability already delivers the durability a snapshot would. Noted as
  an easy belt-and-braces add (`Submission.schemaSnapshot`).
- **Mutable single config per form** — simplest, but *breaks* the brief's core
  requirement the moment a form changes. Rejected.
- **Event-sourced config history** — overkill for this surface.
