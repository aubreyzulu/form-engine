# CLAUDE.md — apps/web (Next.js frontend)

Two surfaces: **Authoring** (the Creator builds/manages forms) and **Fill** (the
Submitter renders + submits a published form). Read the root `CLAUDE.md` first; the
journeys are in `docs/11-user-journeys.md`, the design in `docs/06-frontend.md`.

> Status: scaffolded (Next.js 16 App Router, React 19, Tailwind v4, strict TS).
> Routes/builder/renderer still to build. See `AGENTS.md` — Next 16 has breaking
> changes vs older conventions; consult `node_modules/next/dist/docs/` when unsure.
> Keep this file in sync with reality as features land.

## Job

- **Authoring** (`/forms`, `/forms/new`, `/forms/[key]`): a guided **field builder**
  for a **non-technical** creator. They never see JSON and never drag — they add
  fields and **click a field to edit it in a right-side drawer** (label, required,
  validation rules). The builder **compiles plain-language field types to JSON Schema
  + uiSchema**; reorder is up/down buttons. Live preview reuses the renderer.
- **Fill** (`/f/[key]`): fetch a **stored config** and render it dynamically, submit,
  surface validation + the three UI states. The renderer must never assume a fixed,
  hardcoded field set — it renders whatever config the API returns.

Keep the two surfaces on separate route trees; don't let the public Fill page and the
authoring Manage page collide on `/forms/[key]`.

## Validation: reuse, never reimplement

- Client-side validation uses `validateSubmission` from `@formbuilder/shared` — the
  **same** engine the server uses. Do not write bespoke field validation, regexes,
  or `if (field...)` checks in components.
- Server validation is authoritative. Client validation is UX only. Always handle a
  server `422`: map its `error.details[]` (keyed by `field`) back onto the inputs.

## Structure

- **App Router.** Fetch configs in **Server Components** (no secrets on the client,
  fast first paint). The interactive form is a **Client Component**.
- Routes: `/` lists forms (`GET /forms`); `/forms/[key]` fetches the published config
  and renders it.
- Renderer shape: `SchemaForm` walks `schema.properties` + `schema.required` +
  `uiSchema`, delegating each field to a widget component. Form state via
  **react-hook-form**.

## Widgets: driven by uiSchema, with safe fallback

- Pick the widget from `uiSchema.fields[name].widget`, falling back to the JSON
  Schema `type`/`format`. Mapping is documented in `docs/04-validation-strategy.md`.
- **Unknown widget/type must degrade** to a text/number input — never crash. The
  field set is open by design.
- Respect `uiSchema.order` for field order; fall back to schema property order.

## The three UI states (required, first-class)

Every data interaction handles all three explicitly:
- **Loading** — skeleton while fetching the config; disabled + spinner on submit.
- **Error** — config-fetch/network/5xx shows an inline error with retry; submit-time
  `422` maps to field errors.
- **Success** — confirmation echoing what was submitted and which form `version`
  validated it.

## Accessibility (not optional)

- Every input has an associated `<label htmlFor>`. Wire errors with `aria-invalid`
  and `aria-describedby`; mark required fields semantically.
- Announce submit-time errors via an `aria-live` region. Keyboard and focus states
  must work.

## Conventions

- **Tailwind** for styling — clean and legible over decorative. Avoid generic
  gradients/blue-purple palettes without reason; restrained shadows; sensible rhythm.
- API base URL via `NEXT_PUBLIC_API_URL`; no other backend coupling. No secrets in
  client code.
- Strict TS; reuse the shared types (`UiSchema`, `FieldWidget`, etc.) rather than
  redefining shapes.
- Keep components small and single-purpose; prefer deleting indirection over adding it.
