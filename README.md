# Infra

Infra is a platform that connects companies with qualified trade professionals through fair, reliable job matching.

## Documentation Links

- Backend monorepo guide: [backend/README.md](backend/README.md)
- Identity service: [backend/services/identity/README.md](backend/services/identity/README.md)
- Core platform service: [backend/services/core-platform/README.md](backend/services/core-platform/README.md)

## Run The App Locally

### Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (for Postgres/Redis + backend containers)
- Supabase project (URL, anon key, service role key)

### 1) Install dependencies

From repo root:

```bash
npm install
cd backend && npm install
cd ..
```

### 2) Configure frontend environment

Create `.env.local` in the project root (or copy from `.env.example`):

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
IDENTITY_SERVICE_URL=http://localhost:4001
CORE_PLATFORM_SERVICE_URL=http://localhost:3001
CORE_PLATFORM_PROXY_TIMEOUT_MS=10000
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3) Configure backend service environments

Identity service env file:

- Path: `backend/services/identity/.env`
- Start with values from `backend/services/identity/.env.example`

Core platform env file:

- Path: `backend/services/core-platform/.env`
- Start with values from `backend/services/core-platform/.env.example`

### 4) Start backend services

From `backend/`:

```bash
docker compose up -d
```

This starts Postgres, Redis, Identity, and Core Platform.

### 5) Start frontend

From repo root:

```bash
npm run dev
```

Open http://localhost:3000.

## Required Keys And Environment Values

### Frontend (root .env.local)

Required for normal local development:

- `NEXT_PUBLIC_BASE_URL`
- `IDENTITY_SERVICE_URL`
- `CORE_PLATFORM_SERVICE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Identity service (backend/services/identity/.env)

Required by Identity service:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Strongly recommended locally:

- `COOKIE_SECRET` (at least 32 chars)
- `INTERNAL_SECRET` (for internal token verification flow)

### Core platform service (backend/services/core-platform/.env)

Required for core service startup:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IDENTITY_INTERNAL_URL` (usually `http://localhost:4001`)
- `INTERNAL_SECRET` (must match the identity internal secret)

### Optional third-party keys

You only need these if you are testing those integrations:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SENDGRID_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `OPENAI_API_KEY`

## Common Commands

From repo root:

```bash
npm run dev                 # start frontend
npm run dev:identity        # run identity container profile
npm run dev:identity:stop   # stop identity container profile
npm run stop:backend        # stop backend docker services
npm run test                # frontend tests
```

From `backend/`:

```bash
npm test                    # all backend workspace tests
npm run dev:core            # core-platform dev mode
npm run dev:identity        # identity dev mode
```

## Getting Started (Frontend Only)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## About Infra

There are two fundamental problems in the construction industry:

- Companies struggle to consistently find high-quality workers.
- Skilled workers often struggle to get consistent, fair-paid work.

Infra fixes that.

From personal experience in the construction industry, we saw how difficult it is to find the right worker at the right time. Infra addresses this by matching companies with highly qualified professionals, following the idea of "buy once, cry once"—choosing quality up front is often cheaper than fixing poor work later.

Infra also supports workers by helping them get compensated fairly for their training, qualifications, and quality of work.

The core solution is automatic matching between company job requests and available trade professionals, based on factors like distance, relevant experience, and other fit criteria. The matching system is also designed to support fairer distribution of opportunities among tradespeople.

Infra saves money for companies and makes money for those who've worked for it in a way that removes trust from the equation.

## Deployment

- Dev branch is hosted on Netlify for testing.
- If `dev` has no errors and is ready to merge into `main`, `main` is deployed to the production server.

Testing deployment: https://group35-test.netlify.app/

## Core Integration Contract

The frontend must call core-platform only through Next.js BFF routes under `/app/api/core/**`.

- Browser clients never call core-platform service URLs directly.
- Every proxied request must carry `x-request-id`; generate one if missing.
- Write operations must enforce CSRF checks.
- Upstream host must come from environment allowlist only.

### Canonical Error Envelope

All API errors returned to the browser should follow this shape:

```ts
type ErrorResponse = {
	code: string;
	message: string;
	issues?: Array<{ field: string; message: string }>;
	requestId: string;
	timestamp: string;
};
```

Standard status/code mappings include:

- `400 CLIENT_VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`
- `429 TOO_MANY_REQUESTS`
- `500 INTERNAL_SERVER_ERROR`
- `502 BAD_GATEWAY`
- `503 SERVICE_UNAVAILABLE`

## Notes

- Do not commit real secrets. Keep local secrets in `.env.local`, `backend/services/identity/.env`, and `backend/services/core-platform/.env`.
- If you are only working on UI, frontend-only mode is enough. For auth and API flows, run full stack mode.
