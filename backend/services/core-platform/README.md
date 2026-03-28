# Core Platform Service

## Overview

The **Core Platform** is the central backend service for the G35 Project marketplace. It manages core business domains: jobs, availability calendars, companies, workers, and administrative operations.

**Service Type**: Microservice (Node.js + Express + TypeScript)  
**Status**: Phase 5-10 Complete (Production-Ready)  
**Owner**: Backend Team  
**Support**: [GitHub Issues](https://github.com/g35-project/issues)

---

## Quick Start

### Prerequisites

- **Node.js**: >= 20.x (LTS)
- **npm**: >= 10.x (package manager)
- **PostgreSQL**: >= 15
- **Docker** (optional, for containerization)

### Local Development

```bash
# Navigate to service directory
cd backend/services/core-platform

# Install dependencies
npm install

# Choose environment profile
cp .env.local .env

# Run database migrations
npm run db:migrate

# Start with local profile
npm run dev:local

# Server runs on http://localhost:3001
```

### Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests (requires PostgreSQL)
npm run test:integration

# Security tests
npm run test:security

# All tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Linting & Type Checking

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# TypeScript type check
npm run typecheck

# Format code with Prettier
npm run format
```

---

## Architecture

### Directory Structure

```
backend/services/core-platform/
├── src/
│   ├── app.ts                      # Express app setup
│   ├── server.ts                   # Entry point
│   ├── controllers/                # Route handlers
│   │   ├── jobs.ts
│   │   ├── calendar.ts
│   │   ├── companies.ts
│   │   ├── workers.ts
│   │   └── admin.ts
│   ├── services/                   # Business logic
│   │   ├── jobService.ts
│   │   ├── calendarService.ts
│   │   └── ...
│   ├── models/                     # Database models & schema
│   ├── middleware/                 # Express middleware
│   │   ├── authenticate.ts         # JWT verification
│   │   ├── authorize.ts            # RBAC enforcement
│   │   ├── request-logging.ts      # Request/response logging (PII-safe)
│   │   └── ...
│   ├── security/                   # Security modules
│   │   ├── rateLimit.ts            # Rate limiting profiles
│   │   ├── csrf.ts                 # CSRF protection
│   │   └── validators.ts           # Input validation schemas
│   └── observability/              # Monitoring & logging
│       ├── logger.ts               # Structured logging
│       ├── sentry-integration.ts   # Error tracking
│       ├── metrics.ts              # Business metrics
│       └── sentry.ts               # Sentry initialization
├── tests/
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   ├── security/                   # Security tests (CSRF, PII, headers, etc.)
│   ├── system/                     # End-to-end business flow tests
│   ├── setup/                      # Test infrastructure
│   └── fixtures/                   # Test data
├── docs/
│   ├── threat-model.md             # Security audit & threat matrix
│   ├── api.md                      # API reference
│   └── architecture.md             # Architecture decisions (ADR)
├── SQL/
│   ├── initial_schema.sql          # Database schema
│   └── migrations/                 # Database migrations
├── Dockerfile                      # Docker build
├── docker-compose.yml              # Local environment
├── .env.example                    # Environment template
└── README.md                       # This file
```

### Technology Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 20 (LTS) |
| Framework | Express 4.x |
| Language | TypeScript 5.x |
| Database | PostgreSQL 15+ |
| ORM | (raw SQL + migrations) |
| Testing | Vitest + Supertest |
| Linting | ESLint + Prettier |
| Monitoring | Sentry + Structured Logging |
| CI/CD | GitHub Actions |

### API Routes

All routes are under `/api/v1/` prefix.

#### Jobs Domain
- `GET /api/v1/jobs` — List jobs (paginated, filtered)
- `POST /api/v1/jobs` — Create new job
- `GET /api/v1/jobs/:id` — Get job details
- `PATCH /api/v1/jobs/:id` — Update job
- `POST /api/v1/jobs/:id/status` — Transition job status

#### Calendar Domain
- `GET /api/v1/workers/:workerId/availability` — List availability slots
- `POST /api/v1/workers/:workerId/availability` — Create availability
- `PATCH /api/v1/workers/:workerId/availability/:id` — Update availability
- `DELETE /api/v1/workers/:workerId/availability/:id` — Delete availability (7-day lock rule enforced)

#### Company Domain
- `GET /api/v1/companies/:companyId` — Get company profile
- `PATCH /api/v1/companies/:companyId` — Update company profile

#### Worker Domain
- `GET /api/v1/workers/:workerId` — Get worker profile
- `PATCH /api/v1/workers/:workerId` — Update worker profile

#### Admin Domain
- `GET /api/v1/admin/companies` — List all companies (admin-only)
- `PATCH /api/v1/admin/companies/:id/status` — Change company status
- `GET /api/v1/admin/workers` — List all workers (admin-only)
- `PATCH /api/v1/admin/workers/:id/verification` — Verify worker
- `POST /api/v1/admin/outbox/relay` — Relay pending events (internal)
- `POST /api/v1/admin/idempotency/cleanup` — Clean expired idempotency keys (internal)

#### Health Checks
- `GET /health` — Service health (Kubernetes liveness probe)
- `GET /health/live` — Liveness check (can handle requests)
- `GET /health/ready` — Readiness check (dependencies healthy)

---

## Security Model

### Authentication

- **Mechanism**: Bearer JWT tokens (from Identity service)
- **Header**: `Authorization: Bearer <token>`
- **Verification**: All routes (except `/health`) validate JWT signature

### Authorization (RBAC)

5 role-based permission scopes:

- **RECRUITER**: Can create/manage jobs, access limited worker profiles
- **TRADE**: Can manage own availability, view jobs
- **ADMIN**: Full system access
- **JOB_CREATE/JOB_READ/JOB_UPDATE**: Job permissions
- **CALENDAR_***: Availability management permissions

### Rate Limiting

4 profile-based rate limiters:

| Profile | Limit | Purpose |
|---------|-------|---------|
| Read | 100/min | GET requests |
| Write | 20/min | POST/PATCH/PUT |
| Admin | 10/min | Administrative operations |
| Auth Burst | 50/min | Login attempts |

### Data Protection

- **Over-posting Prevention**: All write schemas use `z.object(...).strict()` to reject unknown fields
- **Optimistic Locking**: Writes include `version` check to detect concurrent modifications
- **Idempotency**: POST requests require `idempotency-key` header to prevent duplicate operations
- **Audit Logging**: All state mutations recorded with actor, action, and timestamp
- **PII Redaction**: Sensitive fields (email, SSN, phone) automatically filtered from logs

### Security Headers

Helmet.js enforces:

- `X-Content-Type-Options: nosniff` — Prevent MIME-type sniffing
- `X-Frame-Options: DENY` — Prevent clickjacking
- `Referrer-Policy: no-referrer` — Limit referrer leakage
- `Content-Security-Policy` — Restrict script/style sources

### Threat Model

Comprehensive security audit in `docs/threat-model.md`:

- ✅ Authentication bypass protection
- ✅ Role escalation prevention
- ✅ Over-posting mitigation
- ✅ Ownership bypass detection
- ✅ Race condition handling
- ✅ PII redaction in logs
- ✅ Rate limit enforcement
- ✅ CSRF protection (optional for browser clients)

### Endpoint Security Baseline

Core controls required on all write and sensitive endpoints:

- Strict request validation with reject-unknown behavior.
- Authentication and permission checks before business logic.
- Ownership checks for company and worker scoped resources.
- Idempotency for write endpoints that can be retried.
- PII-safe structured logging with `requestId`.

### Frontend BFF Contract

All browser traffic to core-platform goes through Next.js API routes under `/api/core/**`.

- Core-platform receives Bearer tokens forwarded by the BFF.
- Request IDs are generated/forwarded by the BFF and logged end to end.
- The BFF maps upstream failures to a stable error envelope (`code`, `message`, `requestId`, `timestamp`).
- Rate limits align to read/write/admin profiles.

---

## Core Business Logic

### Job Lifecycle

**State Machine**: `open` → `in_progress` → `completed` → `resolved`

- Only recruiters can create & transition jobs
- Admin can transition terminal state to resolved
- Each transition audited with reason

### Calendar Availability

**Lock Rule**: Cannot delete availability if a filled job starts within 7 days (UTC midnight boundary)

- Enforced at application + database layer
- Deletion within lock window emits security event
- Tests verify concurrent deletion edge case

### Idempotency Pattern

- **Key**: UUID + fingerprint (user + endpoint)
- **TTL**: 24 hours (configurable)
- **Behavior**:
  - First call: Execute, cache result
  - Duplicate call (same key, same payload): Return cached 201
  - Duplicate call (same key, different payload): Return 409 Conflict

### Outbox Pattern (Event Publishing)

- All domain events written to `outbox_events` table
- Background worker `outbox-relay` publishes → message queue
- Dead-letter queue for failed events (max 3 retries)
- Ensures at-least-once event delivery

---

## Configuration

### Environment Variables

Core-platform supports 3 runtime profiles using `CORE_PLATFORM_ENV`:

- `local` → loads `.env.local`
- `development` → loads `.env.development`
- `production` → loads `.env.production`

Selection order:

1. `.env.<CORE_PLATFORM_ENV>.local`
2. `.env.<CORE_PLATFORM_ENV>`
3. `.env.local`
4. `.env`

If `CORE_PLATFORM_ENV` is not set, it defaults to:

- `production` when `NODE_ENV=production`
- `development` otherwise

Copy `.env.example` → `.env` and fill in values:

```bash
# Core
CORE_PLATFORM_ENV=development
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/core_platform

# Security

## Operational Readiness Checklist

Run this checklist before release:

- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:security`
- `npm run test:coverage`

Validate runtime and safety guarantees:

- Health endpoints respond and dependency checks pass.
- Sentry is configured and `SENTRY_DSN` is set in target environment.
- Request IDs appear consistently in logs for API flows.
- Sensitive fields are redacted in error and access logs.
- Rate limiting and CSRF protections are active in deployed profile.

## Database Canonical Files

Core-platform now relies on two central SQL sources in the repository root:

- `SQL/schema.sql` for schema and relational structure.
- `SQL/policy.sql` for RLS and access policies.

Avoid maintaining parallel migration scripts in this repo; keep schema and policy state authoritative in the central files.
JWT_PUBLIC_KEY=<public-key-from-identity-service>
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
```

See `.env.example` for complete reference.

Run commands by profile:

```bash
npm run dev:local
npm run dev:development
npm run dev:production
```

### Feature Flags

- `ENABLE_IDEMPOTENCY_KEYS=true` — Require idempotency keys on writes
- `ENABLE_OPTIMISTIC_LOCKING=true` — Enforce version checks on updates
- `ENABLE_OUTBOX_PATTERN=true` — Use outbox for event publishing
- `CSRF_PROTECTION=false` — CSRF tokens (disable for REST API)

---

## Observability & Monitoring

### Logging

- **Format**: Structured JSON (Bunyan)
- **Levels**: `error`, `warn`, `info`, `debug`, `trace`
- **PII Filtering**: Automatic redaction of sensitive fields
- **Request Correlation**: `x-request-id` header for tracing

### Error Tracking (Sentry)

Captures:
- Unhandled exceptions
- Validation errors
- Authorization failures
- Outbox relay failures
- Optimistic lock conflicts

With required tags:
- `user_id`, `user_role`
- `job_id`, `worker_id`, `company_id`
- `from_status`, `to_status` (state transitions)
- `action`, `event_type` (business context)

### Metrics

Tracked events:
- `job.created` — Job count
- `job.status.transitioned` — State machine transitions
- `calendar.availability.lock_violation` — 7-day rule breaches
- `admin.override.used` — Admin actions
- `http.request.duration_ms` — Request latency (histogram)
- `db.query.duration_ms` — Database latency
- `auth.failure`, `rate_limit.exceeded` — Security events

### Health Checks

3-tier health model:

- **Live** (`/health/live`): Service process alive
- **Ready** (`/health/ready`): Database + dependencies healthy
- **General** (`/health`): Combined status for load balancers

---

## Testing Strategy

### Test Layers

| Layer | Tool | Coverage | Purpose |
|-------|------|----------|---------|
| Unit | Vitest | Services, validators | Isolated business logic |
| Integration | Supertest + Vitest | Controllers, DB queries | API response contracts |
| Security | Vitest | Auth, PII, headers, CSRF | Threat model validation |
| System | Supertest + in-memory DB | End-to-end workflows | Critical user paths |

### Test Coverage Targets

- **Overall**: 80%+ lines
- **Auth/Security modules**: 90%+
- **Payment/Financial**: 90%+
- **Critical business logic**: 85%+

### Running Tests

```bash
# Unit tests only
npm run test:unit

# Integration tests (requires DB)
npm run test:integration

# Security tests (auth, PII, headers, etc.)
npm run test:security

# System/E2E tests
npm run test:system

# Full suite with coverage
npm run test:coverage

# Watch mode during development
npm run test:watch
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

File: `.github/workflows/core-platform-ci.yml`

**On every push to main/develop**:

1. ✅ **Lint & Type Check** (Node 20)
   - ESLint (with security plugin)
   - TypeScript type checking
   - Prettier format validation

2. ✅ **Test Suite**
   - Unit tests + coverage
   - Integration tests (PostgreSQL service)
   - Security tests
   - System tests

3. ✅ **Security Scanning**
   - npm audit (dependency vulnerabilities)
   - SAST (ESLint + security rules)
   - Secret detection (TruffleHog)

4. ✅ **Docker Build & Push**
   - Multi-platform build (amd64 + arm64)
   - Trivy container scan
   - Push to GHCR (on main branch only)

5. ✅ **E2E Tests** (main branch only)
   - Staging environment
   - Full user flows
   - Optional (continue on error)

### Deployment

**Development/Staging**:
```bash
# Using Docker Compose
docker-compose up -d

# Or using Docker image
docker build -f backend/services/core-platform/Dockerfile \
   --build-arg CORE_PLATFORM_ENV=development \
   -t core-platform:dev backend

docker run -p 3001:3001 -e CORE_PLATFORM_ENV=development -e DATABASE_URL=... core-platform:dev
```

**Production**:
- Deploy via Kubernetes (Helm chart)
- Use managed PostgreSQL (AWS RDS, GCP Cloud SQL)
- Enable all monitoring: Sentry, CloudWatch, Datadog
- Secrets from HashiCorp Vault or cloud provider

---

## Production Checklist

Before deploying to production:

- [ ] Threat model audit completed (`docs/threat-model.md`)
- [ ] All 75+ security tests passing
- [ ] Code coverage ≥ 80% (critical modules ≥ 90%)
- [ ] No high/critical vulnerabilities (npm audit)
- [ ] Secrets not in code (use environment variables)
- [ ] Rate limits configured for expected load
- [ ] Database backups automated + tested
- [ ] Sentry alerts configured for critical errors
- [ ] Logging aggregation enabled (CloudWatch/Datadog)
- [ ] Database migrations tested on staging
- [ ] Rollback plan documented
- [ ] Load testing completed (if >100 RPS expected)
- [ ] Status page configured

---

## Troubleshooting

### Common Issues

**1. Database Connection Error**
```
Error: connect ENOENT /var/run/postgresql/.s.PGSQL.5432
```
→ Ensure PostgreSQL is running: `docker-compose up -d postgres`

**2. JWT Verification Failure**
```
UnauthorizedError: invalid token
```
→ Check `JWT_PUBLIC_KEY` in `.env` matches Identity service

**3. Rate Limit Too Strict**
```
HTTP 429 Too Many Requests
```
→ Adjust `RATE_LIMIT_*` in `.env` or contact admin

### Debug Mode

Enable verbose logging:

```bash
DEBUG=* LOG_LEVEL=trace npm run dev
```

Check Sentry dashboard for recent errors:
- `sentry.io` → Project → Issues

---

## Performance Tuning

### Database Optimization

- Ensure indexes on `company_id`, `worker_id`, `job_id` (check `migrations/`)
- Connection pool: `DB_POOL_MIN=5 DB_POOL_MAX=20` for high load
- Use `EXPLAIN ANALYZE` for slow queries

### Caching Strategy

- Job data: Cache TTL 5 min (TTL expires on write)
- Availability slots: Cache TTL 1 min
- User roles: Cache TTL 30 min (from JWT)

### Load Testing

```bash
# Apache Bench
ab -n 1000 -c 100 http://localhost:3001/api/v1/jobs

# wrk (modern alternative)
wrk -t4 -c100 -d30s http://localhost:3001/api/v1/jobs
```

---

## Architecture Decisions (ADR)

See `docs/architecture.md` for key decisions:

1. **Stateless REST API**: No session storage, JWT-only authentication
2. **Optimistic Locking**: Prevent lost updates without distributed locks
3. **Outbox Pattern**: Guarantee event delivery despite failures
4. **RBAC via Middleware**: Enforce permissions centrally before controllers
5. **PII Redaction**: Automatic filtering, no manual sanitization

---

## Contributing

### Branch Strategy

- `main` → Production
- `develop` → Staging
- Feature branches: `feat/description-initials`
- Bugfix branches: `fix/description-initials`

### PR Requirements

- [ ] All tests passing (100 score in CI)
- [ ] Type checking: 0 errors
- [ ] Linting: 0 errors
- [ ] Coverage: No drops (>80% overall, >90% critical)
- [ ] Security scan: No high/critical issues
- [ ] PR description: What changed + Why

### Commit Message Format

```
<scope>: <short description>

Root cause: <one line>
Fix: <what changed>
Prevention: <tests added>
Test results: <unit/integration/security summary>
```

Example:
```
jobs: validate empty title before creation

Root cause: Validation missing in controller, passed to DB layer causing 500
Fix: Add title length check in createJobSchema
Prevention: Added unit test for min 1 char, integration test for 400 response
Test results: Unit: 5 passed, Integration: 3 passed, Security: 2 passed
```

---

## Support & Escalation

### Issues & Questions

- **Bug Reports**: [GitHub Issues](https://github.com/g35-project/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/g35-project/discussions)
- **Security Issues**: Contact security@g35-project.org (private)

### On-Call Runbook

If service is down in production:

1. **Check Status**: `curl http://localhost:3001/health`
2. **Check Logs**: `kubectl logs -f deployment/core-platform`
3. **Check Sentry**: Search recent errors
4. **Rollback**: Deploy previous commit (`git bisect` to find root cause)
5. **Post-Incident**: Blameless postmortem within 24h

---

## Related Services

- **Identity Service** (`backend/services/identity`): JWT issuance & validation
- **Email Service** (`backend/services/email`): Notifications
- **Payment Service** (`backend/services/payment`): Billing & charges
- **Admin Dashboard** (`app/admin/dashboard`): Management UI

---

**Last Updated**: 2026-03-25  
**Maintained By**: Backend Team  
**License**: Proprietary (G35 Project)
