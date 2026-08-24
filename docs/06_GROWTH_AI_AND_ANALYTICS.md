# 06 — MUSKY GROWTH AI & MARKET INTELLIGENCE

This document details the Musky Growth AI engine, market demand scoring model, lead CRM, competitor tracking, and analytics subsystem.

---

## 1. Overview & Business Objective
**Musky Growth AI** (`/app/admin/growth` & `lib/growth/*`) is an integrated market intelligence suite engineered specifically for Musky Dose to identify geographic demand expansion opportunities across India's 28 states and 8 union territories.

It combines first-party sales data (order volumes, AOV, wholesale enquiries) with keyword search trends and competitor price tracking to calculate actionable **Market Opportunity Scores** and **Product Demand Scores**.

---

## 2. Core Modules & Sub-Systems

```
┌─────────────────────────────────────────────────────────────────┐
│                    MUSKY GROWTH AI SUITE                       │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
│ India Heatmap │       │ Lead CRM      │       │ Competitor    │
│ & Markets     │       │ Management    │       │ Intelligence  │
└───────┬───────┘       └───────┬───────┘       └───────┬───────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                        ┌───────▼───────┐
                        │ AI Growth     │
                        │ Strategic Feed│
                        └───────────────┘
```

### Module Breakdown
1. **India Market Demand Heatmap (`/admin/growth/map`):**
   - Interactive SVG map of India highlighting state-level market maturity and growth potential.
   - Categorizes states into High Demand (e.g. Rajasthan, Maharashtra, Gujarat, Uttar Pradesh, Punjab), Moderate Demand, and Emerging Markets.

2. **Regional Markets Matrix (`/admin/growth/markets`):**
   - Detailed metrics table for states and major cities detailing Total Customers, Orders Count, Total Revenue, Average Order Value (AOV), Repeat Customer Rate, Wholesale Leads Count, and Opportunity Score (0 - 100).

3. **Wholesale Lead CRM (`/admin/growth/leads`):**
   - Enterprise lead management system for salon owners, body artists, wholesalers, and exporters.
   - Tracks Lead Name, Business Name, Mobile, WhatsApp, State/City, Lead Type (`Wholesaler`, `Salon/Artist`, `Retailer`, `Exporter`), Status (`New`, `Contacted`, `Qualified`, `Converted`, `Lost`), Priority, and Follow-Up Schedule.

4. **Keyword Search Intelligence (`/admin/growth/keywords`):**
   - Search volume and CPC analytics for high-value terms (e.g., *"sojat henna powder"*, *"pure indigo powder"*, *"organic mehendi cone bulk"*).

5. **Competitor Pricing Database (`/admin/growth/competitors`):**
   - Tracks competing henna brands, observed market prices, packaging sizes, and product positioning.

6. **AI Strategic Recommendations (`/admin/growth/recommendations`):**
   - Automated recommendation engine generating prioritized growth actions (e.g. *"Launch targeted WhatsApp campaign for bridal artists in Punjab due to 45% QoQ search volume surge"*).

---

## 3. Opportunity Scoring Algorithm (`lib/growth/scoring.ts`)

The Market Opportunity Score (0 - 100) is calculated dynamically based on configurable weights defined in `growth_settings`:

$$\text{Opportunity Score} = w_1 S_{\text{sales}} + w_2 S_{\text{growth}} + w_3 S_{\text{leads}} + w_4 S_{\text{wholesale}} + w_5 S_{\text{fit}} + w_6 S_{\text{campaign}}$$

Where default weights are:
- **Historical Sales Volume ($w_1 = 30\%$):** Weight assigned to order revenue and customer count.
- **Revenue Growth Trend ($w_2 = 20\%$):** Month-over-month sales velocity.
- **Lead Pipeline ($w_3 = 15\%$):** Number of active leads in CRM.
- **Wholesale Enquiries ($w_4 = 15\%$):** B2B interest for bulk henna bags.
- **Product-Market Fit ($w_5 = 10\%$):** High lawsone demand alignment.
- **Campaign Responsiveness ($w_6 = 10\%$):** Coupon redemption rate in region.

---

## 4. API Endpoints & Server Integration

| Endpoint | Method | Operation |
| :--- | :--- | :--- |
| `/api/admin/growth/overview` | `GET` | Main metrics summary (Total Revenue, Active Markets, Total Leads, Top Opportunity State). |
| `/api/admin/growth/markets` | `GET`, `POST` | List regional market metrics / Create new market record. |
| `/api/admin/growth/leads` | `GET`, `POST`, `PUT` | CRM leads directory list, creation, and status update. |
| `/api/admin/growth/keywords` | `GET`, `POST` | Keyword search intelligence registry. |
| `/api/admin/growth/competitors` | `GET`, `POST` | Competitor registry and price observations. |
| `/api/admin/growth/recommendations`| `GET`, `POST` | AI growth strategic action items feed. |
| `/api/admin/growth/data-sources` | `GET`, `POST` | Data connectors status & sync log monitor. |
| `/api/admin/growth/imports` | `GET`, `POST` | CSV bulk data import execution. |
| `/api/admin/growth/export` | `GET` | Export Growth AI dataset to CSV. |
