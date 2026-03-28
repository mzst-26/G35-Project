# Admin Microservice Dependency Matrix

This document captures implementation-ready ownership and contracts for admin-side capabilities that span beyond Core Platform.

## Scope

- Frontend admin dashboard flows under `components/admin_dashboard/*` and `hooks/*`
- Next.js admin proxy routes under `app/api/core/admin/*`
- Cross-service dependencies required to replace placeholders and TODO markers
- Tiered admin authorization model for `standard` and `super` admins under strict RLS

## Tiered Admin Access Model (Least Privilege)

This matrix is the required baseline for policy implementation and API route guards.

| Data Domain | Standard Admin | Super Admin (Business Admin) | Notes |
| --- | --- | --- | --- |
| Appeals, tickets, support workflows | Read + workflow updates | Read + workflow updates | Core operations/compliance workstream |
| Workers and worker compliance records | Read + moderation actions | Read + moderation actions | Includes documents, availability, service zones |
| Companies and registration reviews | Read + review actions | Read + review actions | Includes request approval/rejection lifecycle |
| Jobs, allocations, chats, operational logs | Read (and approved workflow updates) | Read (and approved workflow updates) | No broad destructive actions |
| Payment transactions (`payments`) | No access | Read access | Super-only financial visibility |
| Payment methods (`payment_methods`) | No access | Read access (redacted in UI where possible) | Never expose full card details in client |
| Penalties and charge records (`penalty_fees`) | No access | Read access | Super-only financial/compliance intersection |
| Quotes/pricing (`job_quotes`) | No access | Read access | Super-only commercial data |
| Aggregate financial insights | No access | Read access | Via dedicated aggregate RPC/view only |

### Security Rules

1. Deny by default: every table remains RLS-enabled with explicit allow policies only.
2. Never grant blanket `USING (true)` for sensitive financial domains.
3. Financial access requires `admins.admin_level = 'super'` plus admin role consistency checks.
4. Standard admins operate non-financial support/compliance workflows only.
5. Prefer aggregate financial RPC/views over broad raw-table exposure.
6. All privileged financial actions must be auditable with actor and request metadata.

## Matrix

| Admin Feature | Current Source | Target Owning Service | Required Contract | Frontend Entry Points | No-Data Behavior | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| User management list (companies/workers) | Core admin proxy (`/api/core/admin/companies`, `/api/core/admin/workers`) | Core Platform Service | Stable pagination/filter contract for admin user listing | `hooks/useAdminUsers.ts`, `components/admin_dashboard/UsersManagement.tsx` | Render explicit empty-state cards with no fake seed | Lists load from live API, empty-state shown when no records, errors surfaced with retry |
| Appeals queue and review lifecycle | Temporary mapping from penalties list | Payments & Penalties Service | `GET /admin/appeals`, `PATCH /admin/appeals/:id` with status + reviewer metadata | `hooks/useAppeals.ts`, `components/admin_dashboard/AppealsManagement.tsx`, `components/admin_dashboard/AppealReviewModal.tsx` | Show empty queue with guidance text | Queue and review actions persisted server-side and reflected after refresh |
| Support tickets queue and response workflow | Placeholder/local handling only | Communications Service | `GET /admin/tickets`, `PATCH /admin/tickets/:id/respond` including response payload and state transition | `hooks/useTickets.ts`, `components/admin_dashboard/SupportManagement.tsx`, `components/admin_dashboard/TicketReviewModal.tsx` | Show no-open-tickets state without fabricated tickets | Ticket responses submit successfully and ticket state transitions to resolved/in-progress |
| Admin notifications feed + mark read | Placeholder/local handling only | Communications Service | `GET /admin/notifications`, `PATCH /admin/notifications/:id/read` | `hooks/useAdminNotifications.ts` | Return empty notification tray state | Notifications reflect unread/read counts and remain consistent across refresh |
| Admin payment methods management | Placeholder/local handling only | Payments & Penalties Service | `GET /admin/payment-methods`, `POST /admin/payment-methods`, optional `PATCH /admin/payment-methods/:id` | `hooks/useAdminPaymentMethods.ts` | Show empty-state and CTA to add first method | Added method persists and appears after reload, failures return actionable error |
| Analytics fairness/optimization cards | Static placeholders in admin analytics view | Allocation Service | Aggregated admin analytics endpoint(s) for fairness KPIs and optimization insights | `components/admin_dashboard/AnalyticsManagement.tsx` | Render "data unavailable" placeholders | Cards are populated from live metrics with last-updated timestamp |
| Registration request review pipeline | Frontend depends on availability of registration review endpoints | Identity Service | Admin registration review endpoints with decision + audit trail | `components/admin_dashboard/AdminHome.tsx` and related registration flows | Empty-state queue messaging | Approve/reject decisions are persisted and auditable |

## Missing Core Platform Capabilities (Current Gaps)

Core Platform currently does not provide all admin-domain contracts needed to fully remove placeholders. The following capabilities are missing or delegated:

1. Appeals workflow lifecycle endpoints and admin review transitions (owned by Payments & Penalties Service).
2. Support ticket workflow endpoints and admin response transitions (owned by Communications Service).
3. Notifications feed and read-state persistence for admin users (owned by Communications Service).
4. Admin payment methods management contracts (owned by Payments & Penalties Service).
5. Fairness/optimization analytics aggregates for admin dashboards (owned by Allocation Service).
6. Registration review contracts if not already exposed from Identity Service.

## Implementation Backlog Template

For each dependency, create a ticket with:

- Service owner: team and repo
- Endpoint contract draft: request/response schema and error model
- Auth and role model: required scopes/roles (admin-only)
- Idempotency and concurrency behavior for mutable actions
- Observability requirements: tracing fields, error taxonomy, audit fields
- Frontend integration checklist: hook migration, route proxy, loading/error/empty states
- Test coverage: unit + integration route tests + end-to-end happy path

## Suggested Execution Order

1. Communications Service contracts for tickets and notifications.
2. Payments & Penalties Service contracts for appeals and payment methods.
3. Allocation Service analytics aggregate contract.
4. Identity Service registration review confirmation and final admin workflow wiring.
5. Remove placeholder TODOs only after contract-backed implementations and tests pass.

## Rollout Checklist

1. Apply migration that introduces helper functions and tiered policies.
2. Verify Standard Admin personas can access support/compliance data but are denied all financial domains.
3. Verify Super Admin personas can access both operational and financial domains.
4. Verify recruiter/trade/company/worker personas remain denied admin-only domains.
5. Validate API routes mirror database tier checks (no policy bypass in proxy layers).
6. Confirm audit coverage for privileged financial reads/writes.
7. Run regression tests and sign off with service owners.
