# 01 — Scope & Objectives

**Assignment A — Dynamic Form Builder Engine.**

## Problem

User-facing forms and disclosures change constantly (regulation, localisation,
shifting requirements). Hardcoding them into static tables means constant redeploys
and painful migrations. This engine represents forms as **dynamic configuration**.

## Core objectives

1. **Form configuration** — store a form's fields and validation rules.
2. **Dynamic validation** — validate a submission against those rules before persisting.
3. **Submission storage** — store responses linked to the configuration that produced them.

## In scope

- Storage for form configurations (JSON Schema) and submissions.
- Runtime validation driven by the configuration, not by code.
- A REST API and a frontend with two surfaces (see
  [11-user-journeys.md](./11-user-journeys.md)):
  - **Authoring** — a guided field builder so a non-technical **creator** can build
    and version forms (no JSON, no drag-and-drop).
  - **Fill** — renders a published config, submits, and handles loading / error /
    success states.
- Containerised local setup (`docker-compose`) and a hosted deployment.

## Out of scope

- Drag-and-drop form designer (we use a guided field builder instead).
- Authentication / multi-tenant accounts (kept out to keep the surface small; noted
  as future work).
- Conditional/branching fields and label i18n (future work).
