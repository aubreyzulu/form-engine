# 02 — Architecture

## Monorepo layout

A single git repository, one pnpm workspace, orchestrated by Turborepo.

```
openownership/
├── apps/
│   ├── api/                # NestJS 11 (REST) + Prisma
│   └── web/                # Next.js 15 (App Router) renderer
├── packages/
│   └── shared/             # Form/JSON-Schema types + Ajv validator factory
│                           # (single source of truth shared by api & web)
├── docs/                   # this folder
├── docker-compose.yml      # postgres + api + web for local one-command start
├── pnpm-workspace.yaml
├── turbo.json
└── README.md               # graded deliverable, distilled from docs/
```

### Why a monorepo

- **One shared validation contract.** `packages/shared` holds the JSON Schema
  TypeScript types and the Ajv validator factory. The API validates server-side
  and the web app validates client-side using *the exact same code* — no drift
  between front and back. This is the single strongest reason to share a repo.
- **Atomic changes.** A change to the form-config contract updates types,
  backend, and frontend in one commit/PR.
- **Scales cleanly.** New apps (e.g. an admin authoring UI) or packages
  (`packages/ui`) drop in without restructuring.

### Why pnpm + Turborepo

- **pnpm** — content-addressed store, strict by default (no phantom deps), fast.
  Already installed (10.7). Workspaces are first-class.
- **Turborepo** — caches `build`/`lint`/`test` per package, runs them in
  dependency order, and gives one root command surface (`turbo run build`). Keeps
  CI and local fast as the repo grows.

> Note on the starting scaffold: the inherited `apps/web` was itself a nested
> `create-turbo` repo (bun) and `apps/api` a standalone Nest app (yarn), each with
> its own `.git`. We rebuild clean into one pnpm workspace so the package manager,
> lockfile, and git history are consistent and explainable. (See
> [ADR-0001](./adr/0001-monorepo-pnpm-turborepo.md).)

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Language | TypeScript (strict) | One language across the stack; types flow through `packages/shared`. |
| Backend | **NestJS 11** | Opinionated modules/DI → clean, testable boundaries (controller → service → repository). Built-in validation pipes, exception filters, OpenAPI. |
| ORM | **Prisma** | Typed client, first-class migrations, excellent `Json` (JSONB) support for storing schemas/responses. |
| Database | **PostgreSQL** | JSONB for dynamic configs + responses; relational integrity (FKs) for version pinning. Best of both worlds. |
| Validation | **Ajv** + `ajv-formats` | The reference JSON Schema (draft 2020-12) engine. Compiles schemas to fast validators; runs config-defined rules with zero field-specific code. |
| Frontend | **Next.js 15 (App Router)** + React 19 | Server components for fetching configs, client components for the interactive form. Familiar, hostable. |
| Form state | **react-hook-form** + Ajv resolver | Performant controlled inputs, field-level errors mapped from Ajv output. |
| Styling | **Tailwind CSS** | Fast, consistent, accessible primitives. |
| Tests | **Jest** (api unit + e2e), Ajv contract tests in shared | Matches Nest's default; e2e drives the real HTTP surface. |

## Layered backend design

```
HTTP → Controller (DTO + transport)        thin, no business logic
     → Service   (engine logic, versioning, validation orchestration)
     → Prisma    (persistence)
```

- **Controllers** handle transport only: parse params, shape responses, status codes.
- **Services** own the engine: publishing/immutability rules, validation, linking
  submissions to versions.
- **Prisma** is the persistence boundary; services depend on it via DI so it can
  be mocked in unit tests.
- A global **exception filter** renders the structured error envelope
  (see [05-api-spec.md](./05-api-spec.md)).

## Data-flow: a submission

1. Web fetches the form's active **published version** (schema + uiSchema).
2. Renderer builds fields from the schema; client validates with shared Ajv.
3. `POST /forms/:key/submissions` with the response payload.
4. API loads the **published version**, validates `data` against its schema with
   the same shared validator, and on success persists a `Submission` row that
   **pins `formVersionId`** — guaranteeing it stays interpretable against the exact
   config that produced it.
5. Invalid payload → `422` with a field-keyed error list; never persisted.
