# Musky Dose — Free Production Hosting & Zero-Cost Architecture Options

**Document Purpose:** Pre-production migration feasibility assessment and commercial compliance audit.  
**Policy Standard:** STRICT FREE-FIRST / NO UNAPPROVED UPGRADE  
**Author:** Antigravity System Architect  
**Audit Date:** September 18, 2026  

---

## 1. Executive Status & Compliance Notice

```text
CURRENT CODE STATUS = STABLE / FROZEN
GSC = NOT_CONFIGURED
VERCEL HOBBY = OWNER DECISION REQUIRED
ORACLE ALWAYS FREE = 2 OCPU / 12 GB CURRENT LIMIT
MIGRATION = NOT YET
PAID SERVICE = NONE
```

### The Commercial Compliance Question
Vercel's Terms of Service for the **Hobby Plan** explicitly restrict usage to personal, non-commercial projects. While Musky Dose operates cleanly on Vercel Hobby during development and pre-production testing, scaling live direct-to-consumer and wholesale sales creates terms-of-service compliance exposure.

This document evaluates zero-cost, commercial-compliant production deployment alternatives that require **₹0 / $0.00 ongoing monthly SaaS expenditure**.

---

## 2. Platform Architecture Requirements

To run Musky Dose in production without degradation, the target hosting platform must provide:

1. **Next.js 15 Standalone Server**: Node.js 20+ runtime executing `.next/standalone/server.js`.
2. **SSR & App Router**: Dynamic route handling for products, categories, guides, and metadata.
3. **API Routes & Webhooks**: Fast handling of `/api/orders`, `/api/products`, `/api/admin/*`.
4. **Supabase PostgreSQL Connection**: Direct pooling connections to Supabase for data persistence.
5. **Master Agent Execution**: Ability to run the autonomous agent cycle headlessly.
6. **Scheduled Jobs (Cron)**:
   - 2:00 AM IST (`30 20 * * *`) autonomous maintenance sweep.
   - 8:00 AM IST (`30 2 * * *`) SEO Intelligence brief.
7. **Persistent Process Management**: Process manager (PM2, systemd, or Docker) with automatic crash restart.
8. **HTTPS & Custom Domain**: SSL certificate termination for `muskydose.in`.
9. **Environment Variables**: Strict separation of public (`NEXT_PUBLIC_`) and server-only secrets.
10. **Zero External Billing**: Zero mandatory credit card charges or recurring subscriptions.

---

## 3. Detailed Zero-Cost Hosting Candidates Comparison

### Candidate A: Oracle Cloud Infrastructure (OCI) Always Free
- **Current Availability:** Available in selected OCI regions; subject to regional capacity availability at creation time.
- **Free Limit:**
  - **Ampere A1 Compute (ARM):** 2 OCPU total, 12 GB RAM total (current official limit).
  - **Block Volume Storage:** 200 GB total (boot + data volume).
  - **Outbound Bandwidth:** 10 TB / month free egress.
- **Commercial-Use Terms:** **FULLY PERMITTED**. Oracle Cloud terms explicitly allow commercial production workloads on Always Free accounts.
- **Persistent Server Support:** Native 24/7 Linux VM (Ubuntu/Oracle Linux). Full root access.
- **Cron / Scheduling Support:** Native system `crontab` executing curl commands directly to localhost endpoints without serverless execution timeouts.
- **ARM Compatibility:** Full Node.js 20+ LTS native ARM64 support.
- **RAM / CPU:** 2 OCPU, 12 GB RAM — more than 6x what is needed for Musky Dose's Next.js server + Master Agent background daemon.
- **Storage:** 200 GB NVMe block storage (Musky Dose application bundle is <2 GB).
- **Bandwidth:** 10 TB/month (Massive headroom for e-commerce traffic).
- **Limitations & Real-World Conditions:**
  - *Regional Resource Availability:* In high-demand data centers (e.g. Mumbai, Frankfurt), ARM Ampere capacity can occasionally show `Out of capacity for shape VM.Standard.A1.Flex`. Requires trying alternative availability domains or waitlists.
  - *Home-Region Lock:* Always Free compute resources can only be provisioned in your chosen home region.
  - *Account Verification:* Requires valid payment method verification at sign-up (small temporary authorization hold; no charges incurred).
  - *Idle Reclamation Policy:* Oracle flags VMs with <20% CPU utilization over 7 days as idle. Running our scheduled 2 AM and 8 AM agent cycles alongside normal web traffic keeps the VM active.
- **Billing Risk:** **Zero ($0.00)** if configured strictly within Always Free tier limits.
- **Migration Complexity:** **Medium** (Standard Linux server setup: Docker/PM2, Nginx reverse proxy, free Certbot Let's Encrypt SSL).

---

### Candidate B: Existing Private Linux VPS / Cloud VM (If Already Owned)
- **Current Availability:** Immediate (if the business already operates an unmetered/flat-rate VPS or dedicated server).
- **Free Limit:** Bound to existing hardware allocations.
- **Commercial-Use Terms:** **FULLY PERMITTED**.
- **Persistent Server Support:** Native Node.js standalone server with PM2 or Docker.
- **Cron / Scheduling Support:** Native Linux `cron`.
- **ARM / x86 Compatibility:** Supports both x86_64 and ARM64 architectures.
- **RAM / CPU:** Minimum recommended: 1 vCPU, 1 GB RAM (runs comfortably).
- **Storage:** 10 GB disk space required.
- **Bandwidth:** Unmetered or standard provider quota.
- **Limitations:** Dependent on the existing server's uptime and provider reliability.
- **Billing Risk:** Zero additional cost (uses existing infrastructure).
- **Migration Complexity:** **Low** (`git pull`, `npm run build`, `pm2 restart`).

---

### Candidate C: Vercel Hobby Tier (Current Pre-Production Baseline)
- **Current Availability:** Active right now.
- **Free Limit:** 100 GB bandwidth, 100 GB-Hrs serverless execution, 500k edge requests.
- **Commercial-Use Terms:** **NON-COMMERCIAL ONLY**. Prohibited for active business commerce under Vercel's Terms of Service.
- **Persistent Server Support:** Serverless only (no persistent background processes; background tasks must execute via serverless invocations or crons).
- **Cron / Scheduling Support:** Built-in Vercel Cron via `vercel.json` (Hobby tier is strictly limited to 2 cron jobs per project; our project defines 5 crons, creating a configuration conflict on Hobby).
- **ARM Compatibility:** Managed serverless environment.
- **RAM / CPU:** Managed (1024 MB per function invocation).
- **Storage:** Ephemeral read-only filesystem (512 MB `/tmp`).
- **Bandwidth:** 100 GB / month.
- **Limitations:**
  - Terms violation risk for commercial stores.
  - Hobby 2-cron limit conflicts with multi-cron autonomous architectures.
- **Billing Risk:** Zero if on Hobby; upgrading to Pro requires **$20/seat/month**.
- **Migration Complexity:** **Zero** (Current hosting).

---

## 4. Comprehensive Comparison Matrix

| Evaluation Criteria | Oracle Cloud Always Free | Existing Private VPS | Vercel Hobby (Current) |
| :--- | :---: | :---: | :---: |
| **Monthly Cost** | **$0.00 / Free Forever** | **$0.00 (Existing)** | **$0.00 (Hobby) / $20 (Pro)** |
| **Commercial Terms Allowed?** | **YES** | **YES** | **NO (Hobby) / YES (Pro)** |
| **Architecture Status** | Compatible (`standalone`) | Compatible (`standalone`) | Compatible (Serverless) |
| **RAM / Memory Limit** | **12 GB RAM** | Bound to hardware | 1 GB ephemeral / function |
| **CPU Allocation** | **2 OCPU (Ampere ARM)** | Bound to hardware | Managed serverless |
| **Storage Allocation** | **200 GB NVMe** | Bound to hardware | Ephemeral /tmp only |
| **Monthly Bandwidth** | **10 TB / month** | Bound to hardware | 100 GB / month |
| **Crons Supported** | Unlimited (Linux crontab) | Unlimited (Linux crontab) | Max 2 on Hobby / 40 on Pro |
| **Persistent Daemons** | Native (PM2 / systemd) | Native (PM2 / systemd) | Not supported |
| **Cold Starts** | None (24/7 dedicated) | None (24/7 dedicated) | Minimal edge warm-up |
| **Migration Required Now?** | **NOT YET** | **NOT YET** | **CURRENT** |

---

## 5. Architectural Recommendation

1. **Phase 1 (Current Pre-Production Freeze):**
   - The application code is **STABLE and FROZEN**.
   - Tests, builds, typechecks, and linters are 100% passing.
   - Do **NOT** migrate, do **NOT** change DNS, and do **NOT** upgrade Vercel right now.

2. **Phase 2 (Owner Decision on Commercial Go-Live):**
   - If the owner chooses a **100% free-forever production stack with zero recurring costs**, deploy the standalone bundle to **Oracle Cloud Always Free** (2 OCPU / 12 GB RAM) or an existing Linux VPS.
   - If the owner prefers **fully managed edge serverless hosting**, upgrade Vercel to Pro ($20/month) for commercial compliance and multi-cron support.
   - The system will **NOT** take any paid action automatically.
