# 06 — Frontend

Next.js 16 (App Router) + React 19, Tailwind v4. See [11-user-journeys.md](./11-user-journeys.md)
for the _why_ (who uses each surface and how). The frontend has **two surfaces**:

- **Authoring** (the Creator) — build and manage forms via a guided field builder.
- **Fill** (the Submitter) — render a published form, validate, submit.

Both share one renderer: the builder's live preview _is_ the submitter's form.

## Routes

| Route          | Surface   | Purpose                                                                             |
| -------------- | --------- | ----------------------------------------------------------------------------------- |
| `/forms`       | Authoring | List forms with status + submission counts; Create button; empty state.             |
| `/forms/new`   | Authoring | Build a new form (field builder + live preview). Saves as DRAFT.                    |
| `/forms/[key]` | Authoring | Manage a form: status, counts, draft warning, Publish, responses, edit → new draft. |
| `/f/[key]`     | Fill      | Public: fetch the published config and render the interactive form.                 |

> Authoring and Fill are kept on separate route trees so the two journeys don't
> collide. The two read endpoints differ too: Fill needs the _published_ version;
> Authoring needs the _latest_ version of any status.

## Authoring: the field builder

The Creator is non-technical, so **Builder** is the default path. The **JSON** tab
is an advanced inspect/edit escape hatch for schema + uiSchema rather than the
primary authoring workflow. Creators build a form by filling in a form (principles
in [11](./11-user-journeys.md)):

- A **field list**; **Add field** appends one. **Clicking a field opens a right-side
  drawer/sheet** to set its label, required toggle, and validation rules.
- **Plain-language field types** (Short text, Number, Date, Dropdown, Yes/No…) that
  the builder **compiles to JSON Schema + uiSchema**. Each type shows only its
  relevant options (progressive disclosure).
- **Reorder** via up/down buttons (no drag-and-drop).
- **Live preview** renders the real form using the shared renderer below.
- **Builder | JSON tabs** keep the visual builder and raw config in one workflow;
  valid JSON edits round-trip through the builder without dropping stable field
  keys, labels, values, or supported validation metadata.
- Editing an existing draft reconstructs the field rows from stored `schema` +
  `uiSchema`.

## The renderer (shared by preview + Fill)

Walks the stored **JSON Schema + uiSchema** and emits accessible fields. Custom-built
(over `react-jsonschema-form`) because the field set is small and we want full control
of UX/accessibility/errors (`@rjsf/core` is a noted alternative).

```
SchemaForm
 ├─ reads schema.properties + schema.required + uiSchema (order, widget, labels)
 ├─ FieldRenderer  → picks widget by (uiSchema.widget ?? type/format)
 │     TextField · TextareaField · NumberField · SelectField ·
 │     RadioField · CheckboxField · CheckboxesField · DateField
 └─ react-hook-form for state; Ajv (shared) for validation
```

- **Single source of truth.** Validation uses `validateSubmission` from
  `@formbuilder/shared` — identical to the server. Field errors map by `field`.
- **Accessibility.** Each field has a `<label htmlFor>`, `aria-invalid` and
  `aria-describedby` wiring its error text, required indicated semantically. Errors
  announced via an `aria-live` region.
- **Unknown widgets degrade** to a sensible default (text/number) — never crash.

## The three UI states (Fill, and the manage page)

| State       | Trigger                                     | UX                                                                                                 |
| ----------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Loading** | Fetching config; submitting                 | Skeleton for the form; disabled button + spinner on submit.                                        |
| **Error**   | Config fetch fails / network / server `5xx` | Inline error card with retry; submit-time `422` maps errors back onto fields.                      |
| **Success** | `201` from submission                       | Success panel echoing what was submitted + which form version validated it; submit-another option. |

A form that doesn't clearly show loading, errors, and success is a poor experience
regardless of how good the engine is.

## Data fetching

- TanStack Query (React Query) is the frontend API state layer. Reads and mutations
  go through query/mutation hooks, not ad hoc component-level `fetch` calls.
- Route `page.tsx` files stay as Server Components for routing/composition; leaf
  Client Components own React Query calls and interactive state.
- Query keys are centralized key factories, for example `formsKeys.detail(key)` and
  `formsKeys.published(key)`. Keys must include every variable that changes the
  response.
- Mutations (create/save/publish/submit) invalidate or update the narrowest affected
  keys; server validation errors (`422 details`) are mapped onto the matching
  react-hook-form fields.
- API base URL comes from `NEXT_PUBLIC_API_URL`.

## Styling

Tailwind, minimal and clean — a tidy, legible UI with clear focus states, error
colouring, and spacing. Good defaults over decoration.

## Deliberately out

- Drag-and-drop builder (not required; the guided field builder replaces it).
- Conditional/dependent fields (`if/then` is Ajv-supported; the renderer could grow
  into it — future work).
