# 03 — CUSTOMER FLOWS & UI ARCHITECTURE

This document details the user experience, component hierarchy, interactive state management, and storefront workflows.

---

## 1. Brand Visual Identity & Design System
The visual presentation of Musky Dose balances premium organic aesthetics with modern, conversion-focused e-commerce layout principles:

- **Primary Brand Color:** Deep Forest Green (`#183F2B` / `bg-[#183F2B]`) — Represents authentic Indian botanical purity.
- **Secondary Accent:** Earthy Olive Green (`#5F7F52`) — Used for subtle highlights and secondary badges.
- **Henna Signature Tone:** Terracotta Rust (`#9A4F32`) — Sourced from the natural Lawsone pigment stain.
- **Accent Highlight:** Royal Gold (`#C49A55`) — Highlights special offers, badges, and trust icons.
- **Canvas Neutral:** Warm Botanical Cream (`#F7F3E8`) — Prevents harsh eye fatigue and elevates luxury positioning.
- **Typography:** Plus Jakarta Sans for UI body and button labels; Playfair Display for elegant headlines.
- **Borders & Radii:** Controlled 8px to 12px border-radius on cards and controls to maintain clean structure.

---

## 2. Storefront Layout Architecture

### Header Navigation (`components/Navbar.tsx`)
The header is composed of two responsive visual rows:
1. **Top Announcement Bar:**
   - Displays live promotional messaging (e.g. *"Direct Factory Shipping from Sojat, Rajasthan"*).
   - Features customizable banner text, link, and optional campaign countdown timer.
2. **Main Navigation Header:**
   - **Logo:** Displays official PNG brand logo (`/public/logo.png`) via `components/BrandLogo.tsx`.
   - **Search Input:** Real-time search query input redirecting to `/products?search=...`.
   - **Navigation Links:** Desktop menu items (Home, Products, Categories, Wholesale, About Us, Our Factory, Contact). On mobile, the upper secondary navigation bar is hidden to keep the header clean and compact.
   - **Action Controls:** Search drawer toggle, Wishlist drawer trigger with active badge count, Cart drawer trigger with item count badge, and "Order on WhatsApp" direct action button.

### Mobile Bottom Navigation (`components/MobileBottomNav.tsx`)
On screens smaller than `768px`, a sticky bottom navigation bar is fixed to the viewport:
- **Home (`/`)** — Home icon.
- **Products (`/products`)** — Storefront grid icon.
- **Wishlist (`/wishlist`)** — Heart icon with dynamic saved count.
- **Cart (`/cart`)** — Shopping bag icon with active badge count.
- **WhatsApp (`https://wa.me/918233703080`)** — Quick WhatsApp order CTA.

---

## 3. Customer Shopping Journey & Workflow

```
[ Visitor Lands on Storefront ]
             │
             ├──► Explore Categories (/categories)
             ├──► Search / Filter Products (/products)
             └──► Read Sojat Story & Factory Process (/factory)
             │
             ▼
[ Product Detail Page (/products/[slug]) ]
  - View High-Res Images & Packaging
  - Review Lawsone Pigment & Sifting Details
  - Inspect 100% Botanical Ingredients List
  - Select Quantity & Weight Option
             │
             ├──► Click "Add to Cart" (Opens Slide-out Cart Drawer)
             └──► Click "Direct WhatsApp Order"
             │
             ▼
[ Checkout / Address Details (/checkout) ]
  - Enter Full Name, Mobile, WhatsApp, Delivery Pincode
  - System automatically calculates Subtotal, Tiered Bulk Discount & Coupon Code
  - Generates pre-filled WhatsApp Order Message
             │
             ▼
[ Opens Official WhatsApp App ]
  - Pre-filled message sent to +91 82337 03080
  - Order recorded in Supabase Database as status 'NEW'
```

---

## 4. Interactive Slide-Out Drawers

### Cart Drawer (`components/CartDrawer.tsx`)
- Triggered from header, mobile bottom nav, or product card "Add to Cart" action.
- Displays list of cart items with thumbnail image, title, selected pack weight, unit price, and quantity stepper (`+` / `-`).
- Features a **Free Shipping / Tiered Discount Progress Indicator** displaying progress toward bonus discounts.
- Includes a coupon input field for validating active campaign promotional codes.
- Highlights clear subtotal, total discount savings, and final total amount.
- Direct CTA: **"Proceed to WhatsApp Checkout"**.

### Wishlist Drawer (`components/WishlistDrawer.tsx`)
- Slide-out overlay displaying user's saved items stored in `localStorage`.
- Allows instant "Move to Cart" or "Remove" actions.

---

## 5. Key Interactive Components

| Component File | Key Features & Responsibilities |
| :--- | :--- |
| `components/HeroCarousel.tsx` | Auto-playing homepage banner carousel showcasing Sojat Henna harvest, Triple Shifted Mehendi, and Organic Indigo. |
| `components/ProductCard.tsx` | Grid card rendering product image, title, category badge, star rating, price (with compare-at slash price), stock status tag, Wishlist toggle, and "Add to Cart" button. |
| `components/CategoryCard.tsx` | Visual card with background thumbnail and category title. |
| `components/TrustStrip.tsx` | 4-column trust feature row ("Direct Sojat Origin", "Triple Shifted", "100% Chemical Free", "Fast Factory Dispatch"). |
| `components/WhatsAppFloat.tsx` | Floating action button on bottom-right of viewport allowing instant customer support chat with Sojat team. |
| `components/CouponInput.tsx` | Interactive coupon validation control making POST requests to `/api/coupons/validate`. |
| `components/PwaInstallCTA.tsx` | Progressive Web App install prompt banner for mobile users. |
| `components/PolicyPageLayout.tsx` | Clean, readable wrapper for shipping, return, privacy, terms, and cancellation policies. |
