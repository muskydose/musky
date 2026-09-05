-- ============================================================================
-- TARGETED PRODUCTION DATA REPAIR — MANUAL EXECUTION ONLY
-- ============================================================================
-- Purpose:
--   Repair the images array for 'Bridal Henna Oil' (id: 'prod-bridal-henna-oil').
--   Clears out the accidentally saved fallback SVG ['/images/fallback.svg'] and
--   resets it to an empty JSONB array [] so the product has a clean, unpolluted gallery.
--
-- TARGET VERIFICATION (CONFIRMED VIA LIVE AUDIT):
--   Target ID: prod-bridal-henna-oil
--   Target Name: Bridal Henna Oil
--   Target Slug: bridal-henna-oil
--   Current DB Value: ["/images/fallback.svg"]
--   Desired DB Value: []
--
-- SAFETY CONSTRAINTS:
--   - Scoped strictly to id = 'prod-bridal-henna-oil'
--   - Does NOT touch any other product
--   - Wrapped in an explicit transaction block with pre- and post-checks
--   - DO NOT EXECUTE AUTOMATICALLY. Review in Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- 1. PRE-CHECK: Confirm target product identity and inspect current value
SELECT id, name, slug, product_type, images
FROM products
WHERE id = 'prod-bridal-henna-oil';

-- 2. TARGETED UPDATE: Reset images to empty jsonb array
UPDATE products
SET images = '[]'::jsonb,
    updated_at = NOW()
WHERE id = 'prod-bridal-henna-oil';

-- 3. POST-CHECK: Verify that exactly 1 row was updated and images is now []
SELECT id, name, slug, product_type, images
FROM products
WHERE id = 'prod-bridal-henna-oil';

-- 4. COMMIT TRANSACTION:
-- Execute COMMIT; only after reviewing the query output above.
-- If any discrepancy is found, execute ROLLBACK; instead.
COMMIT;
