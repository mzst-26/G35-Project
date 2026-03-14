# Identity Service

Express + TypeScript microservice for authentication, session lifecycle, MFA, and RBAC.

## Endpoints

- `GET /health` - liveness/readiness check (includes Supabase check)
- `POST /api/auth/otp/request` - request OTP by email
- `POST /api/auth/otp/verify` - verify OTP and issue session cookies
- `POST /api/auth/session/refresh` - rotate access/refresh session cookies
- `POST /api/auth/logout` - revoke current session
- `POST /api/auth/mfa/challenge` - create step-up MFA challenge
- `POST /api/auth/mfa/verify` - verify step-up MFA challenge
- `POST /api/auth/admin/revoke` - admin-only user session revocation
- `POST /api/auth/admin/users` - admin-only user provisioning
- `POST /api/internal/token/verify` - internal token verification (requires `x-internal-secret`)

## Environment

Copy `.env.example` to `.env` and set required values.

Environment file resolution order (highest to lowest priority):

1. `.env.<NODE_ENV>.local`
2. `.env.<NODE_ENV>`
3. `.env.local`
4. `.env`

Example:

- Development (`NODE_ENV=development`) reads `.env.development.local` first, then `.env.development`, then fallbacks.
- Test (`NODE_ENV=test`) reads `.env.test.local` first, then `.env.test`, then fallbacks.
- Production (`NODE_ENV=production`) reads `.env.production.local` first, then `.env.production`, then fallbacks.

If a variable is already provided by your shell, container platform, or CI pipeline, that value is kept and file values do not override it.

Required in all environments:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Common optional values:

- `ALLOWED_ORIGINS`
- `REDIS_URL`
- `INTERNAL_SECRET`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `SENTRY_TRACES_SAMPLE_RATE`
- `GIT_SHA`

## Local Development

```bash
npm install
npm run dev
```

Suggested local setup:

1. Create `.env` for shared defaults.
2. Create `.env.development` for local dev-only values.
3. Keep secrets out of git by using `.env.development.local` on your machine.

## Build

```bash
npm run build
npm run start
```

## Tests

```bash
npm run test
npm run typecheck
```

Suggested test setup:

1. Create `.env.test` with safe test credentials and endpoints.
2. Keep optional machine-only test overrides in `.env.test.local`.
3. Run tests with `NODE_ENV=test`.

Suggested production setup:

1. Do not rely on local files in production.
2. Set variables in your deployment platform (container env vars / secret manager).
3. Keep `NODE_ENV=production` and define required production values like `COOKIE_SECRET` and `SENTRY_DSN`.

Vitest enforces global coverage thresholds at 85% for statements, branches, functions, and lines.
