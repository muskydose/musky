/**
 * Musky Dose — Campaigns & Offers Database Facade
 * 
 * Re-exports domain modules for 100% backward compatibility:
 * - lib/db/bulk-pricing.ts (Bulk pricing CRUD & discount calculator)
 * - lib/db/campaigns-db.ts (Campaign CRUD, status computation, mapping)
 * - lib/db/coupons.ts (Coupon validation engine & discount calculations)
 * - lib/db/campaign-usage.ts (Campaign usage recording & rollback)
 */

export * from './bulk-pricing';
export * from './campaigns-db';
export * from './coupons';
export * from './campaign-usage';
