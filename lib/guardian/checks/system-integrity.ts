// ============================================================
// MUSKY DOSE — WEBSITE GUARDIAN: SYSTEM INTEGRITY CHECKS
// In-Memory Deterministic Business Rule & Engine Validation
// ============================================================

import { GuardianCheckResult } from '../types';
import { deriveProductIntelligence } from '@/lib/growth/product-intelligence';
import { deriveProductGuide } from '@/lib/growth/guide-generator';
import { generateProductKeywordUniverseV2 } from '@/lib/growth/keyword-universe-engine';
import { INITIAL_PRODUCTS } from '@/lib/data-store';

export async function runSystemIntegrityChecks(): Promise<GuardianCheckResult[]> {
  const results: GuardianCheckResult[] = [];

  // 1. Universal Auto-Guide V3 Determinism Check
  const guideStart = Date.now();
  try {
    const sample = INITIAL_PRODUCTS[0];
    const draft = deriveProductGuide({ name: sample.name, slug: sample.slug });
    const isGuideValid =
      draft.title.length > 5 &&
      draft.slug.endsWith('-complete-guide') &&
      draft.content.length > 100;

    results.push({
      checkId: 'chk_sys_auto_guide_v3',
      name: 'System Integrity: Universal Auto-Guide V3 Pipeline',
      target: 'AUTO_GUIDE_ENGINE',
      type: 'CORE_SYSTEM',
      status: isGuideValid ? 'PASS' : 'FAIL',
      durationMs: Date.now() - guideStart,
      error: isGuideValid ? undefined : 'Universal Auto-Guide V3 failed deterministic generation',
      observedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    results.push({
      checkId: 'chk_sys_auto_guide_v3',
      name: 'System Integrity: Universal Auto-Guide V3 Pipeline',
      target: 'AUTO_GUIDE_ENGINE',
      type: 'CORE_SYSTEM',
      status: 'FAIL',
      durationMs: Date.now() - guideStart,
      error: err.message,
      observedAt: new Date().toISOString(),
    });
  }

  // 2. Multi-Herb Blend Classification Check
  const blendStart = Date.now();
  try {
    const blendIntel = deriveProductIntelligence('Amla Reetha Shikakai Hair Pack 300g');
    const isBlendValid =
      blendIntel.entity === 'HERBAL_BLEND' &&
      Array.isArray(blendIntel.blendComponents) &&
      blendIntel.blendComponents.length === 3;

    results.push({
      checkId: 'chk_sys_blend_taxonomy',
      name: 'System Integrity: Multi-Herb Blend Taxonomy',
      target: 'TAXONOMY_ENGINE',
      type: 'CORE_SYSTEM',
      status: isBlendValid ? 'PASS' : 'FAIL',
      durationMs: Date.now() - blendStart,
      error: isBlendValid ? undefined : 'Multi-herb blend collapsed to single entity',
      observedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    results.push({
      checkId: 'chk_sys_blend_taxonomy',
      name: 'System Integrity: Multi-Herb Blend Taxonomy',
      target: 'TAXONOMY_ENGINE',
      type: 'CORE_SYSTEM',
      status: 'FAIL',
      durationMs: Date.now() - blendStart,
      error: err.message,
      observedAt: new Date().toISOString(),
    });
  }

  // 3. GSC Zero-Fabrication Metric Check
  const gscStart = Date.now();
  try {
    const emptyKw = generateProductKeywordUniverseV2({
      intelligence: deriveProductIntelligence(INITIAL_PRODUCTS[0]),
      gscQueries: [],
    });
    const isZeroFake = emptyKw.realGscKeywordsCount === 0;

    results.push({
      checkId: 'chk_sys_gsc_integrity',
      name: 'System Integrity: GSC Zero-Fabrication Rule',
      target: 'GSC_KEYWORD_ENGINE',
      type: 'CORE_SYSTEM',
      status: isZeroFake ? 'PASS' : 'FAIL',
      durationMs: Date.now() - gscStart,
      error: isZeroFake ? undefined : 'System fabricated GSC metrics when GSC was empty',
      observedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    results.push({
      checkId: 'chk_sys_gsc_integrity',
      name: 'System Integrity: GSC Zero-Fabrication Rule',
      target: 'GSC_KEYWORD_ENGINE',
      type: 'CORE_SYSTEM',
      status: 'FAIL',
      durationMs: Date.now() - gscStart,
      error: err.message,
      observedAt: new Date().toISOString(),
    });
  }

  // 4. Wholesale Pricing & Unit Sanity Check
  const wholesaleStart = Date.now();
  try {
    const wholesaleItems = INITIAL_PRODUCTS.filter((p) => p.isWholesaleEligible);
    const hasValidWholesale =
      wholesaleItems.length > 0 &&
      wholesaleItems.every((p) => p.price > 0 && p.sku.length > 0);

    results.push({
      checkId: 'chk_sys_wholesale_pricing',
      name: 'System Integrity: Wholesale Tier Pricing Governance',
      target: 'WHOLESALE_ENGINE',
      type: 'CORE_SYSTEM',
      status: hasValidWholesale ? 'PASS' : 'WARN',
      durationMs: Date.now() - wholesaleStart,
      details: { eligibleProductsCount: wholesaleItems.length },
      observedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    results.push({
      checkId: 'chk_sys_wholesale_pricing',
      name: 'System Integrity: Wholesale Tier Pricing Governance',
      target: 'WHOLESALE_ENGINE',
      type: 'CORE_SYSTEM',
      status: 'FAIL',
      durationMs: Date.now() - wholesaleStart,
      error: err.message,
      observedAt: new Date().toISOString(),
    });
  }

  return results;
}
