# Dynamic Form Builder Engine — Documentation

This `docs/` folder is the design and implementation record for the OpenOwnership
full-stack assessment (**Assignment A — Dynamic Form Builder Engine**).

It is written before/alongside the code so that every non-obvious decision is
captured and explainable. The final top-level `README.md` (the graded deliverable)
is distilled from these documents.

## Index

| Doc                                                      | Purpose                                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [01-assignment-brief.md](./01-assignment-brief.md)       | Scope and core objectives; what's in and out of scope.                                                                                           |
| [11-user-journeys.md](./11-user-journeys.md)             | **Who uses this and how** — creator + submitter journeys, the authoring UX, and an end-to-end audit with gaps. Start here for product reasoning. |
| [02-architecture.md](./02-architecture.md)               | Monorepo layout, tech stack, and why.                                                                                                            |
| [03-data-model.md](./03-data-model.md)                   | Prisma schema and the **versioning / historical-integrity** strategy (the crux).                                                                 |
| [04-validation-strategy.md](./04-validation-strategy.md) | JSON Schema + Ajv; one schema, shared by API and web.                                                                                            |
| [05-api-spec.md](./05-api-spec.md)                       | REST endpoints, status codes, error envelope.                                                                                                    |
| [06-frontend.md](./06-frontend.md)                       | Dynamic renderer; loading / error / success states.                                                                                              |
| [07-testing.md](./07-testing.md)                         | What we test and why (unit + e2e).                                                                                                               |
| [08-implementation-plan.md](./08-implementation-plan.md) | Phased build plan with milestones.                                                                                                               |
| [09-deployment.md](./09-deployment.md)                   | Railway hosting + docker-compose for local.                                                                                                      |
| [10-brand-guide.md](./10-brand-guide.md)                 | Visual language — colour, type, spacing tokens for the web UI.                                                                                   |
| [mockups/](./mockups/)                                   | Concept mockups for the authoring and submission flows. These were generated with Codex Image Gen 2.                                             |
| [adr/](./adr/)                                           | Architecture Decision Records — one file per significant choice.                                                                                 |

## Design principles

Two ideas drive the design:

1. **Configuration-driven validation** — no field rules hardcoded in app code.
   JSON Schema describes the form; a generic engine (Ajv) runs it at runtime.
2. **Historical integrity** — a stored submission stays valid against the
   configuration version that produced it. We achieve this with **immutable,
   published form versions** that each submission pins to by foreign key.

The rest (REST API, dynamic frontend, tests, docker) is kept small and clean.

## Conventions (keep docs lean)

Code is the source of truth — these docs hold the _why_, not copies of it. Don't
paste full schemas or implementations here (they drift); reference the file and keep
the rationale. Division of labour: `docs/` = design + decisions (ADRs), `CLAUDE.md`
= enforceable rules, top-level `README.md` = how to run + headline trade-offs.
