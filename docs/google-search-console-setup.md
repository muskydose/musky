# Google Search Console — Free Integration Setup Guide

**Project:** Musky Dose  
**Cost:** **$0.00 / Free Forever** (Uses official Google Cloud Service Account & Google Search Console API)  
**Security Standard:** Zero secret leakage in browser/client code; strictly server-side JWT authentication.

---

## 1. Current Status

```text
GSC_STATUS = NOT_CONFIGURED
GSC_PAID_COST = $0.00
FALLBACK_MODE = ACTIVE (Graceful, non-crashing catalog completeness & graph analysis)
```

The application's `SearchConsoleDataSourceAdapter` and SEO Intelligence Layer are completely built, tested, and waiting for production credentials. In the absence of credentials, the system never crashes or halts cron sweeps.

---

## 2. Prerequisites (All 100% Free)

1. A verified **Google Search Console** property for `https://muskydose.in` (URL-prefix) or `sc-domain:muskydose.in` (Domain property).
2. A standard **Google Cloud Console** project (free tier, no billing required for Search Console API).

---

## 3. Step-by-Step Production Configuration

### Step 1: Enable Google Search Console API in Google Cloud
1. Go to [Google Cloud Console API Library](https://console.cloud.google.com/apis/library).
2. Search for **Google Search Console API** (or Search Console API).
3. Click **Enable**.

### Step 2: Create a Free Service Account
1. Go to **IAM & Admin** $\to$ **Service Accounts**.
2. Click **Create Service Account**.
3. Name: `musky-gsc-reader`.
4. Role: No Google Cloud IAM role is needed (Search Console permissions are granted inside Search Console itself).
5. Click **Done**.

### Step 3: Generate RSA Key Pair
1. Click on the newly created service account (`musky-gsc-reader@...`).
2. Go to the **Keys** tab $\to$ **Add Key** $\to$ **Create new key**.
3. Select **JSON** and click **Create**.
4. A JSON file will download to your computer containing:
   - `client_email`
   - `private_key` (RSA private key starting with `-----BEGIN PRIVATE KEY-----`)
   - `project_id`

### Step 4: Grant Access in Google Search Console
1. Open [Google Search Console](https://search.google.com/search-console).
2. Select your property: `https://muskydose.in` (or `sc-domain:muskydose.in`).
3. In the left sidebar, click **Settings** $\to$ **Users and permissions**.
4. Click **Add User**.
5. Email: Paste the `client_email` from your downloaded JSON file.
6. Permission: Select **Full** or **Restricted** (Read-only is completely sufficient).
7. Click **Add**.

---

## 4. Required Production Environment Variables

Add these variables to your production hosting environment (e.g. Vercel Project Settings $\to$ Environment Variables):

| Environment Variable | Description | Example / Format | Secret? |
| :--- | :--- | :--- | :---: |
| `GOOGLE_SEARCH_CONSOLE_SITE_URL` | Exact verified Search Console property | `https://muskydose.in` or `sc-domain:muskydose.in` | No |
| `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` | Service Account email address | `musky-gsc-reader@project.iam.gserviceaccount.com` | Yes |
| `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` | Full RSA private key from JSON | `"-----BEGIN PRIVATE KEY-----\nMIIEvgI...\n-----END PRIVATE KEY-----\n"` | **YES (Server-Only)** |
| `GOOGLE_SEARCH_CONSOLE_PROJECT_ID` | Optional Google Cloud project ID | `musky-dose-production` | No |

> [!IMPORTANT]
> - `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` must contain the complete PEM block including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. Newlines can be entered as literal `\n`.
> - **Zero Client Exposure**: Never prefix these variables with `NEXT_PUBLIC_`. They are consumed strictly by server-side routes (`/api/cron/gsc-sync`, `/api/cron/seo-report`).

---

## 5. API Scope & Authentication Verification

- **API Scope:** `https://www.googleapis.com/auth/webmasters.readonly`
- **Token Exchange:** The adapter generates an RS256 JWT assertion signed with Node's native `crypto` module, and exchanges it at `https://oauth2.googleapis.com/token` for an ephemeral Google access token.
- **Verification Endpoint:** Once configured, triggering `/api/cron/gsc-sync` or clicking **Scan SEO Now** in `/admin/agent` will transition status from `NOT_CONFIGURED` to `CONNECTED`.

