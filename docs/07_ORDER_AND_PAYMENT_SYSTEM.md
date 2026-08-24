# 07 — ORDER FULFILLMENT & PAYMENT ARCHITECTURE

This document provides a comprehensive audit of the primary WhatsApp ordering workflow, order status lifecycle, payment architecture rules, and coupon verification engine.

---

## 1. Primary Order Method: WhatsApp Integration

### Business Rationale
In accordance with local market preferences for Indian botanical brands, Musky Dose operates primarily through **direct WhatsApp ordering** (`whatsapp_order_enabled = true`). This eliminates checkout friction, enables direct customer communication with the Sojat warehouse team, and allows custom delivery charge calculations based on exact package weight and destination pincode.

### WhatsApp Message Generation (`lib/whatsapp.ts`)
When a customer completes the checkout form at `/checkout`, the system constructs a structured URL using `https://wa.me/918233703080?text=...`:

```
Hello Musky Dose!

I would like to place an order from your website.

Order Number: ORD-20260822-K8M1

Customer Details:
Name: Priya Sharma
Phone: +91 98290 12345
Address: 124 Station Road, Civil Lines, Jaipur, Rajasthan - 302006

Products:
- Sojat Pure Triple-Shifted Henna Powder (250g Pack) x 2 = ₹498
- Pure Sojat Damask Rose Water Spray (100ml Bottle) x 1 = ₹199

Subtotal: ₹697
Tiered Discount: -₹50
Product Amount: ₹647

Notes: Please dispatch via express courier.

Please confirm product availability and shipping charges.
```

At the exact moment the WhatsApp window opens, a POST request is executed to `/api/orders` to save the order record in the Supabase `orders` table.

---

## 2. Strict Rule: Online Payment Disabled (`false`)

### Hard Architectural Enforcement
Online payment processing is **strictly DISABLED** across the application:

1. **Database Schema:** `payment_settings.online_payment_enabled` is hardcoded and default set to `false`.
2. **Server Mapping (`lib/server-db.ts`):**
   ```ts
   function mapRowToPaymentSettings(row: any): PaymentSettings {
     return {
       ...INITIAL_PAYMENT_SETTINGS,
       online_payment_enabled: false, // CRITICAL RULE: ALWAYS OFF
       whatsappOrderEnabled: true,
     };
   }
   ```
3. **Admin Settings (`AdminPaymentsClient.tsx`):** The admin UI displays a clear notice confirming that Online Payment is deactivated, preventing accidental activation while maintaining database schema readiness for future UPI/Card integration.

---

## 3. Order Lifecycle & Status Machine

Orders transition through distinct administrative status states:

```
                  ┌───────────────┐
                  │      NEW      │  (Created via WhatsApp Checkout)
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │   CONFIRMED   │  (Sojat Team Verifies Stock & Pincode)
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │  PROCESSING   │  (Packed in Moisture-Proof Pouch)
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │    SHIPPED    │  (Handed to Courier with Tracking Link)
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │   DELIVERED   │  (Successfully Handed to Customer)
                  └───────────────┘
```

| Order Status | Description |
| :--- | :--- |
| `NEW` | Initial state when customer submits WhatsApp checkout form. |
| `PENDING` | Order under review for pincode serviceability or stock check. |
| `CONFIRMED` | Order details confirmed with customer on WhatsApp. |
| `PROCESSING` | Items picked and sealed in multi-layer aluminum pouches at Sojat factory. |
| `SHIPPED` | Consignment dispatched with tracking details sent to customer via WhatsApp. |
| `DELIVERED` | Package delivered to customer address. |
| `CANCELLED` | Order cancelled prior to dispatch. |

---

## 4. Payment Tracking Statuses

Although online payment is off, payment status is tracked separately from order status for accounting purposes:

| Payment Status | Description |
| :--- | :--- |
| `UNPAID` | Default status for WhatsApp orders prior to payment receipt. |
| `PENDING` | Payment remittance in process (e.g., Bank Transfer / UPI QR shared). |
| `PAID` | Payment received and verified by accounts team. |
| `FAILED` | Payment remittance failed. |
| `REFUNDED` | Money returned to customer for cancelled/damaged order. |

---

## 5. Discount Engine & Order Calculations

Server-side order calculation in `lib/server-db.ts` handles multi-tier discount logic:

1. **Regular Subtotal:** Sum of item prices ($\text{Unit Price} \times \text{Quantity}$).
2. **Tiered Quantity Bulk Discount:** Evaluates active `bulk_pricing_rules` (e.g., 5% off for 5+ packs, 10% off for 10+ packs).
3. **Campaign / Coupon Discount:** Evaluates active promo codes via `increment_campaign_usage` RPC. Checks campaign timeframe, minimum order value threshold, and per-customer usage limits.
4. **Idempotency Protection:** Prevents duplicate order creation by verifying `idempotency_key` before executing mutations.
