# CLAUDE.md — Dynamic Form Builder Engine (root)

Monorepo for the OpenOwnership full-stack assessment (**Assignment A**). Read this
before touching anything; backend- and frontend-specific rules live in
`apps/api/CLAUDE.md` and `apps/web/CLAUDE.md` respectively.

## What this is

A configuration-driven form engine: store forms as JSON Schema, validate
submissions against them at runtime, and persist responses linked to the exact
config version that produced them. Design rationale lives in `docs/` (start at
`docs/README.md`); ADRs in `docs/adr/`.

## Two principles that override convenience

1. **Configuration-driven validation.** Field rules live in JSON Schema data, never
   in code. There must be no `if (field === ...)` business validation in app code.
   All validation goes through `@formbuilder/shared`.
2. **Historical integrity.** A submission stays valid against the config version
   that produced it. Published form versions are immutable; submissions pin a
   `formVersionId`. Never mutate a `PUBLISHED` version.

If a change would violate either, stop and reconsider the design.

## Layout

```
apps/api          NestJS 11 + Prisma — the engine + REST API
apps/web          Next.js — dynamic renderer (consumes the API)
packages/shared   @formbuilder/shared — JSON Schema types + Ajv validator,
                  the SINGLE source of validation truth for api AND web
docs/             specs + ADRs
```

`@formbuilder/shared` is imported by both apps so client and server validate with
the identical engine. Do not duplicate validation logic in either app — extend the
shared package instead.

## Tooling & commands

- **pnpm** (workspaces) + **Turborepo**. Use pnpm only; do not add npm/yarn/bun lockfiles.
- From the root:
  - `pnpm install` · `pnpm build` · `pnpm test` · `pnpm lint`
  - Target one package: `pnpm --filter api <script>`, `pnpm --filter web <script>`,
    `pnpm --filter @formbuilder/shared <script>`
- TypeScript is **strict** everywhere (`tsconfig.base.json`, incl.
  `noUncheckedIndexedAccess`). Don't loosen it; fix the types.
- Prettier config is at the root (`.prettierrc.json`): single quotes, trailing
  commas, width 100. Run `pnpm format` before finishing.

## House rules (anti-slop)

- **Prefer deletion.** Don't add speculative exports, "just in case" params, or
  wrappers with a single caller. Build what the current task needs.
- **Comments explain _why_, not _what_.** A comment that restates the code is slop;
  one that records a non-obvious decision or invariant earns its place.
- **Reuse before adding.** Check `@formbuilder/shared` and existing modules before
  writing new helpers or pulling a dependency.
- **Tests lock behavior.** Engine rules (validation, versioning) and authorization-
  style paths get tests, not just happy-path smoke checks.
- Every line must be explainable. If you can't justify it, don't commit it.

## PR review rules

- Check for missed DRY opportunities: duplicated logic, markup, validation,
  queries, or config mapping should be called out.
- Check edge cases, especially empty states, malformed input, missing config,
  network/database failures, and unsupported schema shapes.
- Check for regressions against configuration-driven validation and historical
  integrity before style or preference comments.
- Check idempotency for setup, seed, migration, retry, publish, and background
  operations. Re-running the same action should not corrupt state.
- Prefer inline PR review comments over summary-only feedback. Tag the PR author
  in inline comments when the review platform supports mentions.

## Workflow

- Commit only when the user asks. Keep commits atomic and messages explanatory.
- Update `docs/` when a decision changes.
