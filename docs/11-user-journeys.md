# 11 — User Journeys & Authoring UX

The reasoning behind _who_ uses this engine and _how_. The data model and API exist
to serve these journeys; this doc is the yardstick we measure them against.

## The pain we solve

Forms that carry legal/regulatory weight change constantly — a new field, a tighter
rule, a new jurisdiction. Hardcoding each form into tables + code means every change
is a migration, a redeploy, and a data-migration risk. So forms calcify and debt
piles up. This engine makes a form **versioned configuration**: change it without
touching code, and **past submissions stay valid against the exact version that
produced them.**

## Two users, opposite needs

| User                      | Who they are                                                                                           | What they need                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Creator** (primary)     | A compliance/ops officer — **not an engineer**. Owns a form (e.g. a Beneficial Ownership Declaration). | To define and safely evolve a form without code or fear of breaking old data. |
| **Submitter** (secondary) | The person filling the form in (e.g. a company secretary).                                             | To fill it in quickly, understand errors, and know it worked.                 |

The **Creator is the most important user** — and the hardest, because they are
non-technical but the form configuration underneath is JSON Schema. Bridging that
gap is the central UX problem.

---

## The central UX decision: easy authoring without drag-and-drop

The brief says we don't need a drag-and-drop designer. We also won't make a
non-technical person write JSON. The resolution:

> **The creator never sees JSON and never drags anything. They build a form by
> filling in a form — a guided field builder.**

Principles:

1. **Plain-language field types**, not schema types. They pick "Number", "Dropdown",
   "Date", "Yes / No" — the UI compiles these to JSON Schema + uiSchema underneath.
2. **Progressive disclosure.** Each field type reveals only its relevant options
   (Dropdown → choices list; Number → min/max; Text → max length). Nothing irrelevant
   is shown.
3. **Click a field to edit it in a right-side drawer/sheet.** The field list stays
   calm; selecting a field opens a panel on the right to set its label, required
   toggle, and validation rules. Closing the drawer returns to the list.
4. **Live preview is the real renderer.** "Preview" reuses the _exact_ component the
   submitter sees — not a mock. One renderer, two uses (preview + fill).
5. **JSON is an escape hatch, not the default.** An optional "advanced" view can
   expose the raw schema for power users; it is never required.

Plain-language type → what it compiles to (hidden from the creator):

| Creator picks          | Stored as                      |
| ---------------------- | ------------------------------ |
| Short text / Paragraph | `string` (+ textarea widget)   |
| Number                 | `number` + `minimum`/`maximum` |
| Email                  | `string` + `format: email`     |
| Date                   | `string` + `format: date`      |
| Yes / No               | `boolean`                      |
| Dropdown (one choice)  | `string` + `enum` (select)     |
| Checkboxes (many)      | `array` + `items.enum`         |

---

## Journey A — Creator (primary)

```
/forms (list)  ─create─▶  build form (page)  ─save─▶  /forms/:key (manage)  ─publish─▶  collect
   │                          │                            │                              │
 status badges            field builder +              draft warning +                responses
 + Create button          right-side drawer            Publish + counts              per version
 (empty state)            + live preview
```

1. **Land on the forms list.** Each form shows its **status** (Draft / Published) and
   submission count; a **Create form** button sits on top. If there are no forms, an
   **empty state** invites the first one.
2. **Create.** Navigates to a **full page** (not a popup — the builder + live preview
   need room). They give the form a name/description.
3. **Build the fields.** Add fields; **click any field to open a right-side drawer**
   where they set its label, mark it required, and configure validation rules. The
   builder compiles everything to schema + uiSchema as they go.
4. **Preview** at any time — the real rendered form.
5. **Save.** The form is created as **DRAFT** by default. They return to the list with
   a message: _"Saved as draft — publish it when you're ready to collect responses."_
6. **Manage page** (`/forms/:key`): shows status, submission count, and a field
   summary. While **DRAFT**, a clear **warning** ("not yet collecting responses") sits
   beside a **Publish** button. Responses are viewable here.
7. **Publish** → the version becomes **PUBLISHED and immutable**; the form now collects.
8. **Evolve later.** Editing a _published_ form opens a **new draft (v2)** — v1 and its
   submissions are untouched. The creator literally sees "v1 published · v2 draft."
   This is the versioning / historical-integrity story made visible.

## Journey B — Submitter (secondary)

```
open link ─▶ render fields ─▶ fill (inline validation) ─▶ submit ─▶ success / error
            (loading)          (same engine as server)    (loading)
```

1. Open the form by link → **loading** while the published config is fetched.
2. Fields **render dynamically** from the stored config.
3. **Inline validation** uses the _same_ shared validator the server uses — no
   surprise on submit.
4. **Submit** → server re-validates (authoritative) → **success** (noting which
   version validated it) or **error** mapped back onto the fields.

---

## End-to-end audit (journey ↔ system ↔ what exists)

Status: **✅ built and connected**.

| #   | Journey step                                | Frontend                 | API                                    | Backend (service / model)     | Status |
| --- | ------------------------------------------- | ------------------------ | -------------------------------------- | ----------------------------- | ------ |
| C1  | List forms w/ status + counts               | `/forms`                 | `GET /forms`                           | `FormsService.listForms`      | ✅     |
| C2  | Empty state                                 | `/forms`                 | —                                      | —                             | ✅     |
| C3  | Create form (→ draft v1)                    | `/forms/new`             | `POST /forms`                          | `createForm`                  | ✅     |
| C4  | Build fields; edit in right drawer          | builder + sheet          | `PATCH /forms/:key/versions/:v`        | `updateDraft` (DRAFT-only)    | ✅     |
| C5  | Live preview                                | shared renderer          | —                                      | —                             | ✅     |
| C6  | Manage page (status, counts, draft warning) | `/forms/:key`            | `GET /forms/:key/manage`               | `getFormForManage`            | ✅     |
| C7  | Publish (freeze)                            | manage/new builder pages | `POST /forms/:key/versions/:v/publish` | `publish` (immutability)      | ✅     |
| C8  | View responses                              | `/forms/:key`            | `GET /forms/:key/submissions`          | `listForForm`                 | ✅     |
| C9  | Edit published → new draft v2               | `/forms/:key/edit`       | `POST /forms/:key/versions`            | `createDraft` (clones latest) | ✅     |
| S1  | Open & render form                          | `/f/:key`                | `GET /forms/:key` (published)          | `getFormWithCurrentVersion`   | ✅     |
| S2  | Inline validation                           | shared validator         | —                                      | `@formbuilder/shared`         | ✅     |
| S3  | Submit (validate + pin)                     | public page              | `POST /forms/:key/submissions`         | `SubmissionsService.create`   | ✅     |
| S4  | Success / error states                      | public page              | —                                      | —                             | ✅     |

### Closed gaps

- **Authoring read endpoint.** `GET /forms/:key/manage` returns the form, latest
  version of any status, published version metadata, and submission count.
- **Submission counts.** The list and manage reads surface submission counts.
- **Status on the list.** Each form row exposes the latest-version status.
- **Route separation.** Public fill uses `/f/:key` and the published read;
  authoring uses `/forms/:key` and the manage read.
- **Clone-from-latest.** `POST /forms/:key/versions` clones the latest
  `schema`/`uiSchema` into a new draft for published-form evolution.
- **Builder ⇄ schema round-trip.** The builder decompiles the controlled schema
  shape it emits, preserving field keys, labels, label/value options, required
  flags, validation rules, and order.

---

## Future Scope

- Authentication, roles, and publish permissions.
- Conditional/branching fields and localisation.
- Response exports and richer analytics.
- Larger schema governance workflows, such as warnings when a new version becomes
  stricter than a previously published version.
