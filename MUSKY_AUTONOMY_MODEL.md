# MUSKY DOSE — AUTONOMY MODEL & OPERATIONAL GOVERNANCE

> **Framework**: OBSERVE $\to$ UNDERSTAND $\to$ DECIDE $\to$ PLAN $\to$ EXECUTE $\to$ VERIFY $\to$ MEASURE $\to$ LEARN $\to$ IMPROVE $\to$ REPEAT  
> **Safety Invariant**: Strict separation between Fully Autonomous Operations and Human-Approval-Required Operations.

---

## 1. The 10-Stage Autonomous Lifecycle

The Musky Dose Autonomous Operating System continuously iterates through ten disciplined phases:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. OBSERVE  │ ──> │2. UNDERSTAND │ ──> │  3. DECIDE   │ ──> │   4. PLAN    │ ──> │  5. EXECUTE  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       ▲                                                                                   │
       │                                                                                   ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  10. REPEAT  │ <── │  9. IMPROVE  │ <── │   8. LEARN   │ <── │  7. MEASURE  │ <── │  6. VERIFY   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Stage 1: OBSERVE
- Inspects real catalog truth, Search Console query impressions/clicks, sitemap freshness, asset derivative health, and technical SEO telemetry.
- Runs without modifying any records or triggering side-effects.

### Stage 2: UNDERSTAND
- Discovers gaps: missing canonical declarations, unrendered WebP sizes, keyword opportunities, query collisions between PDPs and Guides, or stale cache states.
- Analyzes semantic intent (transactional vs educational vs wholesale).

### Stage 3: DECIDE
- Evaluates policy invariants: Does the detected issue qualify for immediate autonomous resolution, or does it touch commercial pricing/publishing rights?
- Selects the target execution lane (`FAST`, `BACKGROUND`, or `MAINTENANCE`).

### Stage 4: PLAN
- Constructs a dependency graph of canonical [`AgentTask`](file:///d:/musky/lib/agent/types.ts) units.
- Attaches deterministic idempotency keys and assigns tasks to specialist domain workers.

### Stage 5: EXECUTE
- Dispatches tasks through the [`CentralExecutionQueue`](file:///d:/musky/lib/agent/central-queue.ts).
- Bounded concurrency optimizer regulates throughput based on server latency and error rate.

### Stage 6: VERIFY
- Post-action sanity probes confirm the mutation succeeded (e.g. DOM inspection confirms `<link rel="canonical">` rendered, WebP header valid, zero horizontal overflow).
- Records `VERIFIED_IMMEDIATE` in the [`ResultEngine`](file:///d:/musky/lib/agent/result-engine.ts).

### Stage 7: MEASURE
- For actions requiring observation windows (e.g. GSC indexing, clicks, CTR), tracks baseline vs post-action outcome.
- Records delta once measurement matures. **Zero synthetic results.**

### Stage 8: LEARN
- Updates Bayesian confidence scores for strategies using Laplace smoothing:
  $$\text{Confidence} = \frac{\text{Successes} + 1}{\text{Total Attempts} + 2}$$
- Persists canonical playbooks into durable agent memory.

### Stage 9: IMPROVE
- Re-ranks execution playbooks. Strategies with higher confidence and lower latency are prioritized for future tasks in that domain.

### Stage 10: REPEAT
- Resets execution state and prepares for next autonomous trigger (Cron schedule at 2:00 AM IST or event-driven product update).

---

## 2. Autonomy Boundaries: What is Autonomous vs What Requires Approval

To guarantee absolute commercial safety and store integrity, all operations are classified strictly into two categories:

| Domain | Action | Autonomy Tier | Rationale |
| :--- | :--- | :--- | :--- |
| **CATALOG** | Validate Core Invariants | **Fully Autonomous** | Deterministic sanity check; read-only verification. |
| **CATALOG** | Edge Cache Revalidation | **Fully Autonomous** | Clears stale cache tags after product update. |
| **CATALOG** | Change Product Status to Active | **APPROVAL_REQUIRED** | Commercial impact: exposes new product for sale. |
| **CATALOG** | Reactivate Hidden Bridal Cones (`prod-3`) | **PERMANENTLY BLOCKED** | Hardcoded invariant: prod-3 must remain hidden & non-purchasable. |
| **COMMERCE** | Verify Variant Price Consistency | **Fully Autonomous** | Pure validation check against database records. |
| **COMMERCE** | Change Base or Variant Price | **APPROVAL_REQUIRED** | Financial impact: price alteration requires owner signature. |
| **MEDIA** | Generate WebP Derivatives (1200w, 800w, 400w) | **Fully Autonomous** | Non-destructive optimization of existing assets. |
| **MEDIA** | Overwrite Authentic Factory Photos | **PERMANENTLY BLOCKED** | Authentic photos (`isRealOwnerPhotoProtected`) are inviolable. |
| **SEO** | Revalidate Self-Referential Canonicals | **Fully Autonomous** | Enforces technical SEO standard without content mutation. |
| **SEO** | Generate Valid JSON-LD Schema | **Fully Autonomous** | Pure technical schema injection (Product, Breadcrumb, FAQ). |
| **SEO** | Ping Google/Bing Sitemaps & IndexNow | **Fully Autonomous** | Non-blocking external notification of public URLs. |
| **KEYWORDS** | Cluster Keyword Universe by Intent | **Fully Autonomous** | Data categorization without altering storefront copy. |
| **CONTENT** | Draft Longtail Botanical Guide | **APPROVAL_REQUIRED** | Editorial quality check required before public indexing. |
| **GUARDIAN** | Block Malicious IP / Enforce Rate Limit | **Fully Autonomous** | Security self-defense against brute force or scraping. |
| **MAINTENANCE** | Reclaim Stuck Tasks (>15 min) | **Fully Autonomous** | Self-healing queue recovery after serverless timeout. |

---

## 3. Honest Telemetry & Failure Remediation Policy

The system enforces strict truthfulness in all logging and reporting:

1. **No Fictitious Self-Healing**:
   - `detectedIssues`: Problems identified during inspection.
   - `remediationPending`: Actions planned or awaiting dispatch.
   - `verifiedHealedActions`: Only mutations that executed **AND** verified via post-action probe.
   - The status `SELF_HEALED` is never reported unless a verified corrective action occurred.
2. **Deterministic Errors Fail-Closed**:
   - If a worker encounters an unrecognized error or invalid input, the task transitions to `FAILED` and preserves the full error message in `narrative.whatLearned`.
   - The system never pretends a failed operation succeeded.
3. **Rollback Information**:
   - Every mutation task records `rollbackAction` and `rollbackSnapshot` in the immutable audit log, enabling 1-click recovery from `/admin/agent`.
