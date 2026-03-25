# Shared Packages

Shared backend packages live under `backend/packages/` and are consumed by services via npm workspaces.

## Packages

- `@infra/shared-errors` - `BaseApiError` + typed HTTP/domain errors
- `@infra/shared-permissions` - canonical roles, permissions, and RBAC guards
- `@infra/shared-validation` - reusable Zod schemas for IDs, dates, pagination, sorting
- `@infra/shared-db` - Supabase client factories + DB health check
- `@infra/shared-observability` - logger, redaction, request context, typed events, Sentry helpers
- `@infra/shared-auth` - Identity token verification client + authenticated user guards

## Dependency graph

- `shared-auth` depends on `shared-errors`, `shared-permissions`
- `shared-db` depends on `shared-errors`
- `shared-validation` depends on `shared-permissions`
- `shared-observability` has optional `@sentry/node` peer support

## Build and test

From `backend/`:

- `npm run test:shared` - run all shared package unit tests
- `npm run build:shared` - build all shared packages in dependency-safe order

## Testing note for local file dependencies

Packages expose `dist/` via `main`/`exports`. Vitest configs in dependent packages alias workspace siblings to `src/` for test-time resolution without requiring a prior `build`.
