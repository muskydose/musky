# Musky Dose — Premium Henna & Herbal Products

A production-grade, full-stack Next.js web application and e-commerce platform for **Musky Dose**, originating from Sojat, Rajasthan, India.

---

## Brand & Purpose

Musky Dose specializes in pure botanical, triple-shifted Sojat Mehendi powder, natural henna, herbal hair care, and wellness products sourced directly from Sojat, Rajasthan.

The website provides:
- A responsive product showcase with detailed herbal ingredients, benefits, and usage instructions.
- A streamlined WhatsApp ordering pipeline with pre-filled customer messages.
- A secure Admin Panel for real-time inventory, category, campaign, order, document, and settings management.
- Future-ready architecture for online payment gateways (currently disabled by design).

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4, Lucide React Icons
- **Animations**: Framer Motion
- **Database & Auth**: Supabase (Postgres, RLS) with local state fallbacks
- **Security**: scrypt KDF password hashing with salt, signed JWT session tokens, rate limiting, and CSRF Origin protection
- **PWA**: Service worker caching and web app manifest

---

## Local Setup

### 1. Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/muskydose/muskydose-website.git
cd muskydose-website

# Install dependencies
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local` and populate required keys:
```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous public API key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role secret key
- `ADMIN_EMAIL`: Primary administrator email address (default: `admin@muskydose.in`)
- `ADMIN_PASSWORD`: Strong administrator password
- `ADMIN_SESSION_SECRET`: Cryptographically random 64-character hex secret for session signing

---

## Development & Build Commands

```bash
# Start development server
npm run dev

# Run linter
npm run lint

# Run TypeScript type checker
npm run typecheck

# Build for production
npm run build

# Start production server
npm run start
```

---

## Core Systems & Architecture

### 1. WhatsApp Ordering Pipeline (Primary)
Orders are processed directly via WhatsApp. Customers enter shipping details at checkout, which generates a server-validated order record and pre-fills a formatted WhatsApp message to the official Musky Dose business line.

### 2. Payment Gateway Architecture
Online payment capabilities are **OFF by default** (`onlinePaymentEnabled = false`). The backend enforces this state regardless of client input.

### 3. Admin Panel & Authentication
Access the admin portal at `/admin`. Authentication uses scrypt KDF with per-password salts, 6-digit SMS/OTP recovery options, and session revocation on password resets.

### 4. Supabase Database Schema
Database migrations are located in `/supabase/migrations/`. Tables include:
- `products`: Product catalog, pricing, inventory, and status
- `categories`: Category taxonomy and sorting
- `orders`: Server-calculated orders and customer details
- `site_settings`: Single-row site configuration and homepage sections
- `admin_users`: Admin accounts with scrypt password hashes
- `admin_otps`: One-time password reset verification records

---

## Security Notes

1. **Secrets Protection**: Never commit `.env.local` or service role keys to version control.
2. **API Error Protection**: Public API responses suppress internal database and SQL messages.
3. **Password Security**: Legacy HMAC hashes are automatically upgraded to scrypt on admin login.
4. **Session Isolation**: Admin auth cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` flags.

---

## License

Copyright © Musky Dose. All rights reserved.
