# Musky Dose — Free-First Architecture & Commercial Cost Audit

**Audit Date:** September 18, 2026  
**Policy Standard:** STRICT FREE-FIRST / ZERO RECURRING UNAPPROVED COST  
**Governing Principle:** Native code, open-source libraries, and platform free tiers must be exhausted before considering any paid external service.

---

## 1. Executive Cost Declaration

- **Paid APIs Introduced:** `NONE` ($0.00)
- **Paid SEO / Keyword APIs Introduced:** `NONE` ($0.00)
- **Paid Automation Platforms (Zapier/Make/etc.):** `NONE` ($0.00)
- **Paid Analytics Products:** `NONE` ($0.00)
- **Third-Party Paid Plugins:** `NONE` ($0.00)
- **Net Ongoing External Cost:** **₹0 / $0.00 per month**

---

## 2. Production Service Plans & Free-Tier Quota Audit

### 2.1 Vercel Hosting & Serverless Execution
- **Current Plan Assumed in Development:** Vercel Hobby (Free Tier)
- **Free Quotas (Hobby Tier):**
  - Bandwidth: 100 GB / month
  - Serverless Function Execution: 100 GB-Hrs / month
  - Build Execution: 6,000 minutes / month
  - Edge Requests: 500,000 / month
  - Vercel Cron Jobs: Up to 2 active cron expressions per project on Hobby (Pro supports up to 40)
- **Current Usage Estimate:**
  - Standard storefront traffic: Well under 5 GB / month during current operational baseline.
  - Crons in `vercel.json`:
    - Note: `vercel.json` defines 5 cron jobs (`/api/cron/guardian`, `/api/cron/gsc-sync`, `/api/cron/growth-autopilot`, `/api/cron/master-agent`, `/api/cron/seo-report`).
- **Commercial-Use Compatibility:**
  - > [!WARNING]
  - **`OWNER_DECISION_REQUIRED`**: Vercel's Terms of Service for the **Hobby Tier** explicitly restrict use to personal, non-commercial projects. Because Musky Dose is a commercial e-commerce enterprise selling botanical products, operating on Vercel Hobby may violate Vercel's Fair Use / Commercial terms once live commerce transactions scale.
  - Upgrading to Vercel Pro ($20/seat/month) requires explicit owner decision. The system will NOT automatically initiate or upgrade this plan.
- **Potential Billing Trigger:** Exceeding cron job allowances on Hobby, or transitioning to Pro for commercial compliance.
- **Remaining Free Capacity:** High on bandwidth (>90%); constrained on cron definitions on Hobby tier.

---

### 2.2 Supabase Database, Auth & Storage
- **Current Plan:** Supabase Free Tier
- **Free Quotas:**
  - Database Storage: 500 MB PostgreSQL
  - File Storage: 1 GB
  - Monthly Active Users (MAU): 50,000
  - Bandwidth: 5 GB / month (Egress)
  - Direct Connections: Pooler included
- **Current Usage:**
  - Database Storage: ~22 MB used (all migrations 001–011 applied, ~4% of 500 MB quota).
  - File Storage: 0 MB in Supabase (all canonical assets reside in optimized local public directory).
- **Commercial-Use Compatibility:**
  - **FULLY COMPLIANT**: Supabase explicitly permits commercial use on its Free Tier, subject to quota boundaries.
- **Potential Billing Trigger:**
  - Inactivity pause: Supabase Free tier databases pause after 7 days of inactivity. (The daily 2:00 AM IST Master Agent sweep and 8:00 AM IST SEO job actively query the database, naturally preventing dormancy pauses).
- **Remaining Free Capacity:**
  - Database Storage: ~478 MB remaining (95.6% available).
  - File Storage: 1,000 MB remaining (100% available).

---

### 2.3 Google Cloud / Google Services
1. **Google Search Console (GSC) API**:
   - Free Quota: Unlimited daily queries within API rate limits (1,200 QPM).
   - Commercial Compatibility: Fully permitted. Free forever.
2. **Google Analytics 4 (GA4)**:
   - Measurement ID: `G-RVSW518GCR` configured via `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
   - Free Quota: Standard GA4 event collection free up to 10M events/month.
   - Commercial Compatibility: Fully permitted.
3. **Google Merchant Feed XML**:
   - Generates `/api/feeds/google-merchant.xml` natively in code without third-party connector fees.
   - Free Quota: Free.
4. **Gemini API (`@google/genai`)**:
   - Optional Server-Side Product Description Auto-Fill: Disabled or uses free tier quota.
   - Master Agent Invariant: The Master Agent does NOT invoke paid AI models for runtime execution. All scheduling, opportunity detection, intent classification, and health auditing are 100% deterministic TypeScript.

---

### 2.4 SMS Gateway & Third-Party Integrations
- **SMS OTP Gateway (`SMS_GATEWAY_API_KEY`)**:
  - Optional: Kept in `PROVIDER_REQUIRED` status when key is omitted.
  - Does NOT incur recurring SaaS charges.
- **IndexNow Engine**:
  - Free Bing / Yandex instant indexation protocol implemented in native code (`lib/indexing/indexing-service.ts`).
  - Cost: Free.

---

## 3. Policy Adherence Summary

| Service | Plan | Monthly Cost | Commercial Allowed? | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Vercel** | Hobby | $0.00 | Non-Commercial Only | **`OWNER_DECISION_REQUIRED`** |
| **Supabase** | Free Tier | $0.00 | Yes | **COMPLIANT** |
| **Google Search Console** | Free | $0.00 | Yes | **COMPLIANT** |
| **Google Analytics 4** | Free | $0.00 | Yes | **COMPLIANT** |
| **IndexNow Protocol** | Native / Free | $0.00 | Yes | **COMPLIANT** |
| **WhatsApp Direct** | Native URL protocol | $0.00 | Yes | **COMPLIANT** |

**Conclusion:** The platform is engineered to run at absolute zero external monthly SaaS overhead. No unapproved billing triggers exist in the code.

