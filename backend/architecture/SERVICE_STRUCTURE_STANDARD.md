# Backend Service Structure Standard

This standard applies to all backend microservices in this monorepo.

## Goals

- Keep service layouts consistent as service count grows.
- Reduce onboarding time and cross-service cognitive load.
- Make architecture boundaries explicit: HTTP, application logic, domain logic, and infrastructure.

## Node.js Service Layout

```text
service-name/
  src/
    bootstrap/         # app startup, composition root, wiring
    platform/          # auth, config, logging, db clients, shared middleware
    modules/
      <capability>/
        http/          # routes + controllers/handlers
        application/   # use-cases/orchestration
        domain/        # entities, policies, invariants
        infrastructure/# repositories/adapters/gateways
        contracts/     # DTOs and validation schemas
    docs/              # OpenAPI, docs router, docs validators
    workers/           # background workers and schedulers
  tests/
    unit/
    integration/
    system/
```

## Python Service Layout

```text
service-name/
  src/
    service_name/
      bootstrap/
      platform/
      modules/
        <capability>/
          http/
          application/
          domain/
          infrastructure/
          contracts/
  tests/
    unit/
    integration/
    system/
```

## Required Rules

1. Every endpoint must belong to a capability module.
2. Every write endpoint must define request contracts in module `contracts/`.
3. Every public endpoint must be documented in service OpenAPI docs.
4. Every module must have at least one integration test.
5. Route files should compose dependencies; business logic stays out of route handlers.

## Migration Strategy

Use incremental migration by introducing module entry points first, then moving internals in small batches.

1. Add `src/modules/<capability>/http/router.ts` wrappers.
2. Rewire top-level router to module entry points.
3. Move controller, service, repository, and contract files into module folders.
4. Remove legacy folders when all imports are migrated.
