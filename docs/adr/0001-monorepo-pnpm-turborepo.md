# ADR-0001 — Monorepo with pnpm workspaces + Turborepo

**Status:** Accepted · **Date:** 2026-06-27

## Context
The assignment needs a NestJS backend and a Next.js frontend that share a form
configuration/validation contract. The inherited scaffold was inconsistent: a
nested `create-turbo` repo under `apps/web` (bun), a standalone Nest app under
`apps/api` (yarn), and two nested `.git` directories — no coherent root.

## Decision
Rebuild as a single git repository: one **pnpm** workspace orchestrated by
**Turborepo**, with `apps/api`, `apps/web`, and `packages/shared`.

## Rationale
- Sharing `packages/shared` (JSON Schema types + Ajv validator) between API and web
  is the core reason for a monorepo — it eliminates client/server rule drift.
- pnpm: strict, fast, content-addressed; already installed. Turborepo: task caching
  + dependency-ordered runs from one root command surface.
- One package manager + one lockfile + one git history is far easier to explain and
  defend than the inherited mix.

## Consequences
- We discard the inherited scaffold (sunk cost) for a clean, consistent base.
- Contributors must use pnpm; documented in README.

## Alternatives considered
- **Salvage the existing scaffold** — rejected: inherits bun/yarn split and nested
  structure; more glue and rough edges than a clean init.
- **npm/yarn workspaces** — workable, but pnpm is stricter/faster and already present.
- **Nx** — more powerful than we need at this surface; Turborepo is lighter.
