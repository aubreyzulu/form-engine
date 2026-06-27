# 08 — Implementation Plan

Phased so that at the end of each phase something real works and is verifiable.
Mirrors the brief's suggested 3-day shape but organised by milestone, not clock.

## Phase 0 — Foundations (clean monorepo)
- Remove the inherited messy scaffold (nested turborepo / yarn Nest / nested `.git`).
- `git init` at root; `pnpm-workspace.yaml`, root `package.json`, `turbo.json`.
- Root tooling: TS base config, ESLint, Prettier, `.gitignore`, `.editorconfig`.
- `packages/shared` skeleton (build + test wired).
- **Done when:** `pnpm install` + `pnpm build`/`pnpm lint` run green across the workspace.

## Phase 1 — Shared validation contract
- `packages/shared`: JSON Schema TS types, `createValidator`, `validateSubmission`,
  error normalisation.
- Unit tests for every rule + multi-error + normalisation ([07](./07-testing.md)).
- **Done when:** shared tests pass; the package is importable by api and web.

## Phase 2 — Data layer
- `apps/api`: Prisma installed; `schema.prisma` per [03](./03-data-model.md).
- First migration; Prisma module/service in Nest (DI-injectable).
- Seed script: two published forms (BO declaration + contact).
- **Done when:** `prisma migrate dev` + seed produce a populated DB; `/health` green.

## Phase 3 — Backend engine + API
- Modules: `forms`, `versions`, `submissions`.
- Service logic: create/edit draft, publish (immutability enforced), resolve
  current version, validate-and-store submission (uses `packages/shared`).
- DTOs + `ValidationPipe`; global exception filter → error envelope.
- Swagger at `/api/docs`.
- Unit tests (immutability/publish) + e2e (submission flow, 422 no-write, 404).
- **Done when:** full workflow drivable via `curl`; all api tests green.

## Phase 4 — Frontend
Close the audit gaps first (G1 authoring read endpoint, G2 counts, G3 list status,
G4 route split — see [11-user-journeys.md](./11-user-journeys.md)), then build:

**4a — Fill (submitter):** `/f/[key]` server-fetch published config + `SchemaForm`
renderer (rhf + shared Ajv); field widgets; loading / error / success; `422` details
mapped onto fields.
- **Done when:** a published form renders and submits end-to-end.

**4b — Authoring (creator, primary):** `/forms` list (status + counts, empty state);
`/forms/new` guided field builder with right-side field drawer + live preview
(reuses `SchemaForm`); `/forms/[key]` manage page (draft warning, Publish, responses,
edit → new draft). Builder compiles field config ⇄ schema + uiSchema.
- **Done when:** a non-technical user can build, preview, save (draft), publish, and
  see responses — without seeing JSON.

## Phase 5 — Containerisation & local DX
- `Dockerfile` for api and web; root `docker-compose.yml` (postgres + api + web)
  with healthcheck gating and auto-migrate+seed on api start.
- `.env.example` files; one documented command to bring it all up.
- **Done when:** `docker compose up` yields a working app from a clean checkout.

## Phase 6 — Deploy (Railway)
- Railway project: managed Postgres + api service + web service.
- Env vars (`DATABASE_URL`, `NEXT_PUBLIC_API_URL`); run migrations + seed on deploy.
- **Done when:** live URLs work; captured in the README.

## Phase 7 — README + polish
- Top-level `README.md` distilled from `docs/`: local run, data model + decisions,
  trade-offs / with-more-time.
- Final lint/test pass; tidy commit history.
- **Done when:** a fresh reader can run locally and use the hosted app from the README alone.

## Sequencing notes
- Phases 1–3 are the core; if time is short we ship a smaller frontend before we
  cut engine correctness or tests ("ship less but solid").

## Definition of done (whole assignment)
- [ ] Configuration-driven validation (no hardcoded field rules) — demonstrated + tested.
- [ ] Historical integrity (immutable versions, pinned submissions) — demonstrated + tested.
- [ ] Clean REST API with structured errors + correct status codes.
- [ ] Dynamic frontend with loading/error/success.
- [ ] Engine + API tests green.
- [ ] `docker compose up` works from clean checkout.
- [ ] Hosted on Railway with live URLs in README.
- [ ] README covers run steps, data model, and trade-offs.
