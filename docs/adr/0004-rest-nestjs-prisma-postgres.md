# ADR-0004 — Storage: PostgreSQL + JSONB via Prisma (NestJS REST API)

**Status:** Accepted · **Date:** 2026-06-27

## Context
The engine stores dynamic, user-defined form configurations and responses, while
keeping structured relationships (Form → Version → Submission). The brief asks to
explain the database/schema choice.

## Decision
- **PostgreSQL**, using **JSONB** for `schema`/`uiSchema`/`data` and relational FKs
  for the Form → Version → Submission relationships.
- **Prisma** as the ORM/migration tool.
- **REST** via **NestJS 11** for the interface (the brief allows REST/GraphQL/RPC).

## Rationale (storage — the part that matters here)
- JSONB stores arbitrary form structure without per-form columns/migrations — the
  flexibility the engine needs — while FKs keep referential integrity for version
  pinning. One store gives both.
- Prisma's typed client + migrations make the schema reproducible from a clean
  checkout (`migrate deploy`).

## Consequences
- Request shape validated by DTOs; submission content validated by Ajv — two
  distinct, appropriate layers.
- JSONB columns are queryable (GIN) if we later need to filter by an answer.

## Alternatives considered
- **Document DB (Mongo)** — handles dynamic docs, but we'd lose easy relational
  integrity for version pinning; Postgres gives both.
- **TypeORM / Drizzle** — fine alternatives; Prisma chosen for its migration +
  typed-client workflow.
