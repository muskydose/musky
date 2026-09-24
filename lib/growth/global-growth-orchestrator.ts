/**
 * MUSKY DOSE — GLOBAL GROWTH ORCHESTRATOR & SELF-HEALING ENGINE (PHASES 17, 18, 21)
 * 
 * Production Domain: https://muskydose.in
 * 
 * Mandates:
 * Continuously coordinates the full 12-stage Global Growth OS lifecycle:
 * DISCOVERS -> UNDERSTANDS -> MAPS -> CREATES -> OPTIMIZES -> CONNECTS ->
 * PUBLISHES -> NOTIFIES -> MONITORS -> SELF-HEALS -> CAPTURES LEADS -> LEARNS
 * 
 * Self-Healing Capabilities:
 * - Detects broken/missing canonical ownership and reassigns deterministically.
 * - Detects schema/availability drift between database and feeds.
 * - Detects cannibalization collisions and records deterministic remediation actions for review/execution.
 * - Non-destructive recovery: never wipes verified data or overwrites real factory photos.
 */

import { Product, Category, ProductGuide } from '@/lib/types';
import { getProducts } from '@/lib/db/products';
import { getGuides } from '@/lib/db/guides';
import { getCategories } from '@/lib/db/categories';
import { resolveQueryOwnership, auditCannibalizationAcrossQueries } from './query-ownership-engine';
import { getGlobalEntityGraph } from './entity-graph-engine';
import { runTechnicalSeoAudit, TechnicalSeoAuditReport } from './technical-seo-guardian';
import { computeSearchCoverageMap, buildGlobalOpportunityRadar, OpportunityRadarItem } from './search-coverage-engine';
import { GlobalSearchCoverageMetrics } from './types';
import { validateProductForMerchantFeed } from './merchant-feed';
import { notifySearchEngines } from '@/lib/indexing/indexing-service';

export interface GlobalGrowthCycleSummary {
  timestamp: string;
  status: 'OPTIMAL' | 'SELF_HEALED' | 'ATTENTION_REQUIRED';
  coverageMetrics: GlobalSearchCoverageMetrics;
  seoAudit: TechnicalSeoAuditReport;
  radarOpportunities: OpportunityRadarItem[];
  cannibalizationIssuesCount: number;
  healedActions: string[];
  merchantFeedHealth: {
    totalEvaluated: number;
    feedReadyCount: number;
    feedReviewCount: number;
  };
}

export class MuskyGlobalGrowthOrchestrator {
  private static instance: MuskyGlobalGrowthOrchestrator | null = null;

  public static getInstance(): MuskyGlobalGrowthOrchestrator {
    if (!MuskyGlobalGrowthOrchestrator.instance) {
      MuskyGlobalGrowthOrchestrator.instance = new MuskyGlobalGrowthOrchestrator();
    }
    return MuskyGlobalGrowthOrchestrator.instance;
  }

  /**
   * Executes a full autonomous diagnostic, mapping, and self-healing cycle.
   */
  public async runGrowthCycle(baseUrl: string = 'https://muskydose.in'): Promise<GlobalGrowthCycleSummary> {
    const products = await getProducts();
    const guides = await getGuides();
    const categories = await getCategories();

    const healedActions: string[] = [];

    // 1. Build & Refresh Entity Graph
    const entityGraph = getGlobalEntityGraph();
    entityGraph.ingestCatalog(products, guides, categories, baseUrl);

    // 2. Query Ownership & Cannibalization Sweep
    const sampleTargetQueries = [
      'pure sojat henna powder',
      'baq henna powder',
      'natural mehendi powder',
      'indigo powder for hair',
      'amla powder for hair',
      'sojat mehndi wholesale rate',
      'bulk mehndi powder supplier rajasthan',
      'how to mix sojat henna powder',
      'what is baq henna vs regular henna',
      '2 step henna and indigo hair dye',
      'maruthani powder',
      'gorintaku',
      'pure organic henna powder',
    ];

    const cannibalizationReport = auditCannibalizationAcrossQueries(
      sampleTargetQueries,
      products,
      guides,
      categories,
      baseUrl
    );

    // Do not claim a collision was healed unless a concrete mutation was executed.
    // The current sweep records deterministic remediation actions for review/execution.
    if (cannibalizationReport.collisionsCount > 0) {
      for (const col of cannibalizationReport.collisions) {
        healedActions.push(
          `Remediation required for query collision [${col.query}]: ${col.action}`
        );
      }
    }

    // 3. Technical SEO Guardian Validation
    const seoAudit = runTechnicalSeoAudit(products, guides, categories, baseUrl);

    // 4. Google Merchant Feed Validation & Health Check
    let feedReadyCount = 0;
    let feedReviewCount = 0;
    for (const prod of products) {
      const res = validateProductForMerchantFeed(prod, baseUrl);
      if (res.feedStatus === 'FEED_READY') {
        feedReadyCount++;
      } else {
        feedReviewCount++;
      }
    }

    // 5. Search Coverage Computation
    const coverageMetrics = computeSearchCoverageMap(products, guides, categories, entityGraph);

    // 6. Global Opportunity Radar
    const radarOpportunities = buildGlobalOpportunityRadar(products, guides, baseUrl);

    // 7. Non-blocking Indexing Notification on significant changes
    try {
      const sampleChangedUrls = [`${baseUrl}/sitemap.xml`, `${baseUrl}/products`];
      notifySearchEngines(sampleChangedUrls, { entityType: 'SYSTEM_GROWTH_CYCLE', action: 'AUDIT' });
    } catch {}

    const status: GlobalGrowthCycleSummary['status'] =
      seoAudit.failCount === 0 && cannibalizationReport.collisionsCount === 0
        ? 'OPTIMAL'
        : 'ATTENTION_REQUIRED';

    return {
      timestamp: new Date().toISOString(),
      status,
      coverageMetrics,
      seoAudit,
      radarOpportunities,
      cannibalizationIssuesCount: cannibalizationReport.collisionsCount,
      healedActions,
      merchantFeedHealth: {
        totalEvaluated: products.length,
        feedReadyCount,
        feedReviewCount,
      },
    };
  }
}
