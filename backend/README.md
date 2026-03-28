# Infra Backend Monorepo Skeleton

This backend skeleton contains the MVP microservices split:

1. `identity` (Node)
2. `core-platform` (Node)
3. `allocation` (Python)
4. `payments-penalties` (Node)
5. `communications` (Node)

## Structure

- `services/*` → deployable services
- `packages/*` → shared libraries for Node services

## Quick Start

1. Install Node workspace deps:

```bash
cd backend
npm install
```

2. Start infrastructure:

```bash
docker compose up -d
```

3. Run one service:

```bash
npm run dev:identity
```

4. Run Python allocation service:

```bash
cd services/allocation
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn allocation_service.main:app --reload --app-dir src
```

## Testing

- Node services: `npm test`
- Python allocation: `npm run allocation:test`

## Platform Conventions

- Frontend clients call backend domains through Next.js BFF routes, not direct browser-to-service calls.
- Service APIs should propagate `x-request-id` for traceability across identity, core-platform, and supporting services.
- Error responses exposed to frontend clients should use a stable envelope with `code`, `message`, `requestId`, and `timestamp`.

## Database SQL Source of Truth

Repository-level SQL is centralized in root `SQL/` and should only use:

- `SQL/schema.sql`
- `SQL/policy.sql`

Do not keep additional migration SQL files in this repository; update canonical schema and policy files directly.
