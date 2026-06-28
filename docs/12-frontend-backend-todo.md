# 12 — Frontend ↔ Backend TODO

This tracks the remaining work to replace mock/static frontend data with the live
API. Data fetching in `apps/web` will use TanStack Query (React Query) only.

## Data Fetching Standard

- Install and configure `@tanstack/react-query` before adding new API reads or
  mutations.
- Add one app-level `QueryClientProvider` for client components that call the API.
- Keep all API request functions in a small frontend API layer, not inline in
  route components.
- Use object/tuple query keys from centralized key factories. Keys must be stable,
  scoped, and include every variable that changes the response.
- Use React Query mutations for create, update, publish, and submit flows, then
  invalidate or update the exact affected keys.
- Do not use ad hoc `fetch` in React components for API data. The only exception
  is a low-level request helper used by React Query query/mutation functions.

## Query Key Plan

```ts
formsKeys.all = ['forms'];
formsKeys.list = () => ['forms', 'list'];
formsKeys.detail = (key: string) => ['forms', 'detail', key];
formsKeys.latest = (key: string) => ['forms', 'detail', key, 'latest'];
formsKeys.versions = (key: string) => ['forms', 'detail', key, 'versions'];
formsKeys.version = (key: string, version: number) => ['forms', 'detail', key, 'versions', version];
formsKeys.published = (key: string) => ['forms', 'published', key];
submissionsKeys.byForm = (key: string) => ['submissions', 'form', key];
```

## Implementation Tasks

- [x] Add TanStack Query dependency and app provider in `apps/web`.
- [x] Create a typed API helper that reads `NEXT_PUBLIC_API_URL`, parses the common
      error envelope, and exposes query/mutation functions.
- [x] Replace the `/dashboard` mock/static metrics with API-derived stats from
      `GET /api/v1/forms`.
- [x] Replace the `/forms` mock/static dashboard with `GET /api/v1/forms`.
- [x] Add loading, error, empty, and retry states for the forms dashboard.
- [x] Connect `/forms/[key]` to the authoring/latest config endpoint.
- [x] Connect `/forms/new` save draft and publish through React Query mutations.
- [x] Connect `/f/[key]` to the published config endpoint and render it with the
      shared schema renderer.
- [x] Connect submitter submissions to `POST /api/v1/forms/:key/submissions`.
- [x] Show creator-facing submissions on `/forms/[key]` with version metadata.
- [x] Add published-form editing by cloning latest config into a draft version.
- [x] Add builder live preview using the same dynamic renderer as `/f/[key]`.
- [x] Map API `422` `error.details[]` back to field-level errors.
- [x] Invalidate/update the relevant query keys after save, publish, and submit.
- [x] Add tests for each query loading/error/success state and mutation retry behavior.
- [x] Run the full local frontend/backend flow with API + web servers:
      create draft, publish, render dashboard/manage/fill routes, submit response,
      and verify submission counts update.
- [ ] Run the full frontend/backend flow after Railway migrations are applied.

## Acceptance Criteria

- The frontend has no mock form data on user-facing form list/manage/fill routes.
- All API reads/mutations from React components go through React Query.
- Query keys are centralized and deterministic.
- Loading, error, success, retry, and empty states are visible and tested.
- Published-version immutability and version-pinned submissions remain intact.
