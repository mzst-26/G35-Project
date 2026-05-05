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
Repository-level SQL historically lived at repository root `SQL/`. In this monorepo the canonical schema for the Core Platform service is located under the service directory:

- `backend/services/core-platform/SQL/schema.sql`
- `backend/services/core-platform/SQL/policy.sql`

If you intend to modify the database schema for core-platform, update the files in that service and follow its migration process. Some tests or tooling may still expect a top-level `SQL/` path; if you rely on that convention either create a small redirect `SQL/README.md` at the repo root explaining the service location, or add a lightweight symlink named `SQL` that points to `backend/services/core-platform/SQL/`.
