# Infra

Infra is a platform that connects companies with qualified trade professionals through fair, reliable job matching.

## Getting Started

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

## Database Source of Truth

The only canonical SQL files are:

- `SQL/schema.sql`
- `SQL/policy.sql`

Schema and RLS updates must be applied by updating these two files directly so the repository always has one central schema and one central policy definition.
