# MUSKY DOSE — UNIFIED AUTONOMOUS OPERATING SYSTEM ARCHITECTURE

> **Production Canonical Domain**: `https://muskydose.in`  
> **Architecture Core**: ONE Autonomous Operating System, ONE Central Orchestrator, ONE Canonical Task Contract, THREE Segregated Execution Lanes, 11 Specialist Domain Engines, Closed-Loop Result & Bayesian Learning Engines.

---

## 1. Executive Summary & Operating System Principle

The Musky Dose platform does not run isolated, competing background scripts or disconnected agents. It operates as **ONE Unified Autonomous Operating System** where all autonomous and deterministic operations across Catalog, Commerce, Media, SEO, Content, Growth, Analytics, and Security flow through a single centralized orchestration kernel.

```
                              ┌─────────────────────────────────────────┐
                              │            OWNER INTENT / CRON          │
                              └────────────────────┬────────────────────┘
                                                   │
                                                   ▼
                              ┌─────────────────────────────────────────┐
                              │       MuskyDoseMasterAgent (KERNEL)     │
                              │  - Durable State Store                  │
                              │  - Unified Context Engine               │
                              │  - Central Invariant Authority          │
                              └────────────────────┬────────────────────┘
                                                   │
                                                   ▼
                              ┌─────────────────────────────────────────┐
                              │          CentralExecutionQueue          │
                              │  - Task De-duplication (Hash Keys)      │
                              │  - Verified-State TTL Caching           │
                              │  - Adaptive Concurrency Optimizer       │
                              └───────┬────────────┼────────────┬───────┘
                                      │            │            │
            ┌─────────────────────────┘            │            └─────────────────────────┐
            ▼                                      ▼                                      ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│        FAST LANE        │   │     BACKGROUND LANE     │   │    MAINTENANCE LANE     │
│ - Synchronous (<50ms)   │   │ - Bounded Concurrency   │   │ - Scheduled (2 AM IST)  │
│ - Invariant Assertions  │   │ - Max 4 Workers         │   │ - Stuck Task Recovery   │
│ - Instant Validation    │   │ - Media/SEO/Content     │   │ - Integrity Sweeps      │
│ - Edge Cache Purges     │   │ - Dependency Resolved   │   │ - Playbook Sync         │
└─────────────────────────┘   └─────────────┬───────────┘   └─────────────────────────┘
                                            │
                                            ▼
                        ┌────────────────────────────────────────┐
                        │      11 SPECIALIST WORKER ENGINES      │
                        │  CATALOG   · COMMERCE · MEDIA · SEO    │
                        │  KEYWORDS  · CONTENT  · GROWTH · QA    │
                        │  ANALYTICS · GUARDIAN · INDEXING       │
                        └───────────────────┬────────────────────┘
                                            │
                                            ▼
                        ┌────────────────────────────────────────┐
                        │           Master Safety Gate           │
                        │  - Fail-Closed Secret Verification     │
                        │  - Commercial Price Mutation Block     │
                        │  - Owner Approval Hold                 │
                        └───────────────────┬────────────────────┘
                                            │
                                            ▼
                        ┌────────────────────────────────────────┐
                        │         Closed-Loop Verification       │
                        │  - ResultEngine: Baseline vs Delta     │
                        │  - LearningEngine: Bayesian Laplace    │
                        │  - Audit Timeline: Immutable Trace     │
                        └────────────────────────────────────────┘
```

---

## 2. Central Orchestration Kernel

The canonical orchestrator is [`MuskyDoseMasterAgent`](file:///d:/musky/lib/agent/master-agent.ts). It enforces strict coordination across all operations:

1. **Deterministic-First Design**: Deterministic rules, mathematical hash comparisons, schema validators, and direct database adapters always run first. LLMs or external models are never invoked for deterministic arithmetic, inventory math, canonical verification, or status checks.
2. **Read-Only Purity**: Admin dashboard pages (such as `/admin/agent`, `/admin/media`, `/admin/products`, `/admin/orders`) are strictly read-only inspection surfaces. Visiting a dashboard triggers **zero side-effects, zero rogue task enqueues, and zero mutation pipelines**.
3. **Fail-Closed Authorization**: All cron endpoints (`/api/cron/agent-tick`, `/api/cron/daily-sweep`, `/api/cron/media-queue`, `/api/cron/growth-autopilot`) mandate valid authorization headers (`Authorization: Bearer <CRON_SECRET>`). If the header is missing, malformed, or if `CRON_SECRET` is undefined, the endpoint strictly rejects with HTTP 401/500 and aborts execution.

---

## 3. The Canonical Task Contract

Every operation throughout Musky Dose conforms to the canonical [`AgentTask`](file:///d:/musky/lib/agent/types.ts) model defined in [`lib/agent/task-contract.ts`](file:///d:/musky/lib/agent/task-contract.ts):

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Deterministic ID (`task-<timestamp>-<hash>`) |
| `domain` | `CanonicalTaskDomain` | One of 11 system domains (`CATALOG`, `COMMERCE`, `MEDIA`, `SEO`, `KEYWORDS`, `CONTENT`, `GROWTH`, `ANALYTICS`, `GUARDIAN`, `INDEXING`, `QA`) |
| `action` | `string` | Specific action verb (`ASSERT_INVARIANTS`, `GENERATE_WEBP`, `AUDIT_CANONICAL`) |
| `lane` | `ExecutionLane` | `FAST`, `BACKGROUND`, or `MAINTENANCE` |
| `entityType` | `string` | Target entity (`PRODUCT`, `PAGE`, `GUIDE`, `MEDIA_SLOT`, `SYSTEM`) |
| `entityId` | `string` | Target identifier (`pure-sojat-henna`, `prod-3`, etc.) |
| `priority` | `number` | Priority score (1–100, where 100 is highest) |
| `status` | `AgentTaskStatus` | `QUEUED`, `RUNNING`, `RETRYING`, `WAITING`, `COMPLETED`, `FAILED`, `BLOCKED`, `APPROVAL_REQUIRED`, `CANCELLED` |
| `dependencies` | `string[]` | Prerequisite task IDs that must complete before dispatch |
| `idempotencyKey`| `string` | Deterministic hash for deduplication |
| `input` | `Record<string, any>`| Input parameters (aliased to `payload` for backward compatibility) |
| `attempts` | `number` | Current attempt counter (aliased to `retryCount`) |
| `maxRetries` | `number` | Maximum allowed retries before permanent failure |
| `approvalState`| `object` | Owner authorization status and timestamp |
| `narrative` | `TaskNarrative` | Structured explanation: `whyThisTask`, `whatDetected`, `whatChanged`, `whatVerified`, `whatLearned` |

---

## 4. The Three Segregated Execution Lanes

To prevent long-running tasks from locking user requests or degrading site responsiveness, all execution is strictly segregated into three distinct lanes managed by [`CentralExecutionQueue`](file:///d:/musky/lib/agent/central-queue.ts):

### Lane 1: FAST LANE (Synchronous & Deterministic)
- **Target Latency**: `<50ms` (Inline execution)
- **Scope**:
  - Lifecycle state resolution via `resolveProductLifecycle`
  - Invariant assertion checks (e.g. `prod-3` non-purchasable, price positive)
  - Edge cache purges (`revalidatePath`)
  - Read-through verified state cache checks
- **Concurrency**: Inline with caller request; zero queuing overhead.

### Lane 2: BACKGROUND LANE (Bounded Asynchronous Concurrency)
- **Target Concurrency**: 1 to 4 workers (Managed by `PerformanceOptimizer`)
- **Scope**:
  - Media derivative rendering (WebP 1200w/800w/400w)
  - Deep SEO crawling and GSC Search Console query synchronization
  - Keyword Universe clustering and cannibalization resolution
  - Long-tail botanical content drafting
  - Merchant feed XML compilation
- **Concurrency Protection**: Uses `Promise.allSettled` bounded batches with per-run execution timeouts (default 45s). Throttles dynamically if failure rate exceeds 10% or latency exceeds 1000ms.

### Lane 3: MAINTENANCE LANE (Scheduled & Recovery Sweeps)
- **Execution Schedule**: Daily 2:00 AM IST (20:30 UTC previous day) or manual trigger from `/admin/agent`
- **Scope**:
  - Reclaiming stuck tasks (tasks in `RUNNING` status for >15 minutes reclaimed as `RETRYING` or `FAILED`)
  - Memory consolidation and verified playbook synchronization
  - Full catalog schema consistency audit
  - Orphaned media slot cleanup

---

## 5. Specialist Worker Engines Under Central Control

The 11 specialist domains operate as modular workers dispatched exclusively by the central orchestrator:

1. **CATALOG**: Enforces product types, unit configurations, variant rules, and catalog invariants.
2. **COMMERCE**: Protects inventory counters, pricing integrity, variant pricing authoritativeness, and checkout sanity. Blocked from automatic price alterations without owner signature.
3. **MEDIA**: Governs the Universal Visual Language v1 (5200K–5600K daylight, Sojat sandstone, zero airbrushing), protects authentic owner factory photography (`isRealOwnerPhotoProtected`), and generates WebP derivatives.
4. **SEO**: Audits canonical consistency, metadata presence, JSON-LD structured data (Product, FAQPage, BreadcrumbList), and Open Graph cards.
5. **KEYWORDS**: Manages the multi-language Keyword Universe (English, Hindi, Hinglish, Tamil, Telugu), intent classification, search volume clustering, and opportunity scoring.
6. **CONTENT**: Authoritative knowledge hub and editorial guidelines for botanical Lawonia inermis education.
7. **GROWTH**: Autonomous playbooks, query-to-page mapping, and Merchant Center feed validation.
8. **ANALYTICS**: Search Console indexing statistics, search queries, impressions, CTR, and conversion telemetry.
9. **GUARDIAN**: Rate limiting, CSRF verification, fail-closed authorization, and 0px viewport horizontal overflow prevention.
10. **INDEXING**: Non-blocking Search Console ping and IndexNow notifications.
11. **QA**: Responsive rendering verification, desktop (1440px) vs mobile (390px) parity, and HTTP 200 contract verification.

---

## 6. Closed-Loop Result & Bayesian Learning Engines

### Result Engine (`ResultEngine`)
Tracks every mutation through strict empirical stages:
$$\text{BASELINE} \longrightarrow \text{ACTION} \longrightarrow \text{VERIFICATION} \longrightarrow \text{MEASUREMENT} \longrightarrow \text{DELTA}$$

- **VERIFIED_IMMEDIATE**: Immediate post-action verification (e.g. asserting HTTP 200, valid JSON-LD schema, or file written to disk).
- **MEASUREMENT_PENDING**: Actions that require time to show statistical outcomes (e.g., GSC clicks over 14 days).
- **MEASURED**: When post-action telemetry is gathered, the empirical delta is recorded (e.g. $+14$ clicks). **No synthetic or fabricated gains are ever reported.**

### Learning Engine (`LearningEngine`)
Improves execution strategy through Bayesian Laplace-smoothed confidence:
$$\text{Confidence} = \frac{\text{Successes} + 1}{\text{Total Attempts} + 2}$$

- Provides neutral prior (0.500) for untried strategies.
- Rewards consistent successes and heavily penalizes failing strategies ($50\%$ score penalty).
- Persists canonical verified lessons into durable memory for long-term autonomous planning.

---

## 7. Protected Core Invariants

The following invariants are hardcoded and non-negotiable:

1. **Hidden Bridal Cones (`prod-3`)**:
   - Status: Hidden & Inactive.
   - HTTP Status: `200 OK` (Direct access preserved for legacy links).
   - Robots: `noindex,follow` (Strictly excluded from sitemap).
   - Commerce: Non-purchasable (Add-to-cart blocked).
   - Lifecycle: The Master Agent and Lifecycle Orchestrator will **never reactivate, publish, or index prod-3**.
2. **Universal Visual Language**:
   - Authentic owner factory photographs are marked `isRealOwnerPhotoProtected: true` and cannot be overwritten by AI-generated imagery.
   - All AI imagery must strictly conform to 5200K–5600K daylight, Sojat sandstone, and zero synthetic airbrushing.
3. **No Commercial Mutations Without Approval**:
   - Price increases, price drops, and product deletions require explicit owner authorization via `/admin/agent`.
