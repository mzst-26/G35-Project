# Oracle Always Free — resource allocation for microservices

## Always Free tier summary

| Shape | OCPUs | RAM | Max instances | Notes |
|-------|-------|-----|---------------|-------|
| **VM.Standard.A1.Flex** (ARM) | 4 total | 24 GB total | 4 | Split across instances; flexible OCPU:RAM ratio |
| **VM.Standard.E2.1.Micro** (AMD) | 0.125 each | 1 GB each | 2 | Very limited; 1/8 OCPU per instance |

**Constraint:** With 200 GB block storage and 47 GB min boot per instance, you can run **up to 4 A1 instances**. For 5 microservices, either consolidate 2 light services on one VM or use 4 A1 + 2 Micro (Micro is tight for Node.js).

---

## Service workload assessment

| Service | Stack | Workload | Relative need |
|---------|-------|----------|---------------|
| **core-platform** | Node/Express | Main API gateway, routing, aggregation | **High** — central, more traffic |
| **identity** | Node/Express | Auth, sessions, MFA, Supabase, Redis, OTP | **Medium** — crypto, session handling |
| **allocation** | Python/Uvicorn | Matching, scheduling (likely CPU-bound) | **Medium–High** — algorithmic |
| **communications** | Node/Express | Email (nodemailer), SMS (Twilio) | **Low** — I/O bound |
| **payments-penalties** | Node/Express | Stripe, webhooks | **Low** — I/O bound |

---

## Recommended Oracle layout (4 A1 instances)

| VM | Service(s) | OCPU | RAM | Rationale |
|----|------------|------|-----|------------|
| 1 | core-platform | 2 | 10 GB | Heaviest — main gateway |
| 2 | identity | 1 | 6 GB | Auth, sessions, Redis |
| 3 | allocation | 1 | 6 GB | Python; potentially CPU-heavy |
| 4 | communications + payments-penalties | 1 (shared) | 2 GB | Both light, I/O bound; co-locate |

**Total:** 4 OCPUs, 24 GB — matches Always Free A1 quota.

---

## Local Docker limits (mirror production)

Set limits in each service's `docker-compose.*.yml` to match Oracle allocation:

| Service | Production (Oracle) | Local limit (docker) | Notes |
|---------|--------------------|----------------------|-------|
| identity | 1 OCPU, 6 GB | 1 CPU, 512M–1G | Use 512M–1G for parity; 6G is heavy on 16GB laptops |
| core-platform | 2 OCPU, 10 GB | 2 CPU, 1G | When containerized |
| allocation | 1 OCPU, 6 GB | 1 CPU, 512M | When containerized |
| communications | 0.5 OCPU, 1 GB | 0.5 CPU, 256M | When containerized |
| payments-penalties | 0.5 OCPU, 1 GB | 0.5 CPU, 256M | When containerized |
| redis (shared) | N/A | 0.25 CPU, 128M | Capped to avoid drift |

**Adjust for weaker machines:** On 16GB RAM laptops, reduce memory limits (e.g. identity 384M) or remove limits; document in README.

---

## Idle reclamation (Oracle)

Oracle may reclaim instances if, over 7 days, **all** of: CPU p95 &lt; 20%, memory &lt; 20%, network &lt; 20%. Keep services modestly active or accept possible reclamation.
