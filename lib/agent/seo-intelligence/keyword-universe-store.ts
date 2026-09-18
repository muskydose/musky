// ============================================================================
// MUSKY DOSE — KEYWORD UNIVERSE STORE
// In-Memory Ring Buffer + Supabase Resilience Persistence
// ============================================================================

import crypto from 'crypto';
import {
  KeywordUniverseEntry,
  KeywordUniverseSummaryStats,
  KeywordUniverseFilters,
} from './keyword-universe-types';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Generates a deterministic, reproducible identity for a keyword-to-page relationship.
 * Guarantees that the same query on different pages has distinct durable IDs.
 */
export function generateDeterministicKeywordId(normalizedKeyword: string, targetUrl: string): string {
  const normKey = (normalizedKeyword || '').toLowerCase().trim();
  const normUrl = (targetUrl || '/').trim();
  const hash = crypto.createHash('sha256').update(`${normKey}::${normUrl}`).digest('hex').slice(0, 16);
  const slugPart = normKey.replace(/[^a-z0-9]+/g, '-').slice(0, 24).replace(/^-+|-+$/g, '');
  return `kw_${slugPart || 'term'}_${hash}`;
}

export class KeywordUniverseStore {
  private static instance: KeywordUniverseStore | null = null;

  private memoryEntries: Map<string, KeywordUniverseEntry> = new Map();
  private isLoaded: boolean = false;

  public static getInstance(): KeywordUniverseStore {
    if (!KeywordUniverseStore.instance) {
      KeywordUniverseStore.instance = new KeywordUniverseStore();
    }
    return KeywordUniverseStore.instance;
  }

  private constructor() {}

  /**
   * Generates a deterministic key for deduplication and indexing
   */
  public generateKey(entry: Pick<KeywordUniverseEntry, 'normalizedKeyword' | 'targetUrl'>): string {
    const normKey = (entry.normalizedKeyword || '').toLowerCase().trim();
    const normUrl = (entry.targetUrl || '/').trim();
    return `${normKey}::${normUrl}`;
  }

  /**
   * Ensures data is loaded from Supabase or initialized in memory with batched pagination.
   * Eliminates the 1000-row cap and prevents silent truncation.
   */
  public async ensureLoaded(forceRefresh: boolean = false): Promise<void> {
    if (this.isLoaded && !forceRefresh) return;

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const BATCH_SIZE = 1000;
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('master_agent_keyword_universe')
            .select('*')
            .range(from, from + BATCH_SIZE - 1);

          if (error) {
            logger.warn('[KeywordUniverseStore] Supabase load notice (operating in-memory):', { error: error.message });
            break;
          }

          if (!data || data.length === 0) {
            hasMore = false;
            break;
          }

          for (const row of data) {
            const normalizedKey = row.normalized_keyword || (row.keyword ? row.keyword.toLowerCase().trim() : '');
            const targetUrl = row.target_url || '/';
            const deterministicId = row.id || generateDeterministicKeywordId(normalizedKey, targetUrl);

            const entry: KeywordUniverseEntry = {
              id: deterministicId,
              keyword: row.keyword,
              normalizedKeyword: normalizedKey,
              language: row.language || 'en',
              locale: row.locale || 'en-IN',
              country: row.country || 'IND',
              source: row.source || 'CATALOG_DERIVED',
              confidence: row.confidence || 'HIGH',
              intent: row.intent || 'TRANSACTIONAL',
              cluster: row.cluster || 'sojat-henna',
              entityType: row.entity_type || 'PRODUCT',
              entityId: row.entity_id || '',
              productSlug: row.product_slug,
              categorySlug: row.category_slug,
              targetUrl,
              primaryOrSecondary: row.primary_or_secondary || 'SECONDARY',
              status: row.status || 'ACTIVE',
              firstSeenAt: row.first_seen_at || new Date().toISOString(),
              lastSeenAt: row.last_seen_at || new Date().toISOString(),
              gscClicks: Number(row.gsc_clicks || 0),
              gscImpressions: Number(row.gsc_impressions || 0),
              gscCtr: Number(row.gsc_ctr || 0),
              gscAveragePosition: Number(row.gsc_average_position || 0),
              evidence: row.evidence || 'Stored keyword entry.',
              isActualGscQuery: Boolean(row.is_actual_gsc_query),
              isGeneratedKeyword: Boolean(row.is_generated_keyword),
              generationMethod: row.generation_method || 'CATALOG_DERIVED',
              relevanceScore: Number(row.relevance_score || 50),
              opportunityScore: Number(row.opportunity_score || 50),
              cannibalizationRisk: Boolean(row.cannibalization_risk),
              createdAt: row.created_at || new Date().toISOString(),
              updatedAt: row.updated_at || new Date().toISOString(),
            };
            const key = this.generateKey(entry);
            this.memoryEntries.set(key, entry);
          }

          if (data.length < BATCH_SIZE) {
            hasMore = false;
          } else {
            from += BATCH_SIZE;
          }
        }
      } catch (err: any) {
        logger.warn('[KeywordUniverseStore] Supabase load notice (operating in-memory):', { error: err?.message });
      }
    }
    this.isLoaded = true;
  }

  /**
   * Retrieves all entries in the universe.
   */
  public getAll(): KeywordUniverseEntry[] {
    return Array.from(this.memoryEntries.values());
  }

  /**
   * Retrieves entries matching specific filters.
   */
  public getFiltered(filters: KeywordUniverseFilters): KeywordUniverseEntry[] {
    let list = this.getAll();

    if (filters.source) {
      list = list.filter((e) => e.source === filters.source);
    }
    if (filters.intent) {
      list = list.filter((e) => e.intent === filters.intent);
    }
    if (filters.cluster) {
      list = list.filter((e) => e.cluster === filters.cluster);
    }
    if (filters.language) {
      list = list.filter((e) => e.language === filters.language);
    }
    if (filters.status) {
      list = list.filter((e) => e.status === filters.status);
    }
    if (filters.confidence) {
      list = list.filter((e) => e.confidence === filters.confidence);
    }
    if (filters.productSlug) {
      list = list.filter((e) => e.productSlug === filters.productSlug);
    }
    if (filters.categorySlug) {
      list = list.filter((e) => e.categorySlug === filters.categorySlug);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (e) =>
          e.keyword.toLowerCase().includes(q) ||
          e.normalizedKeyword.includes(q) ||
          e.targetUrl.toLowerCase().includes(q)
      );
    }

    return list;
  }

  /**
   * Upserts entries into memory and asynchronously to Supabase.
   */
  public async upsertEntries(entries: KeywordUniverseEntry[]): Promise<{ upsertedCount: number }> {
    const now = new Date().toISOString();
    const toSaveRows: any[] = [];

    for (const entry of entries) {
      const key = this.generateKey(entry);
      const existing = this.memoryEntries.get(key);
      const deterministicId = generateDeterministicKeywordId(entry.normalizedKeyword, entry.targetUrl);

      const merged: KeywordUniverseEntry = {
        ...existing,
        ...entry,
        id: deterministicId,
        firstSeenAt: existing?.firstSeenAt || entry.firstSeenAt || now,
        lastSeenAt: now,
        createdAt: existing?.createdAt || entry.createdAt || now,
        updatedAt: now,
      };

      this.memoryEntries.set(key, merged);

      toSaveRows.push({
        id: merged.id,
        keyword: merged.keyword,
        normalized_keyword: merged.normalizedKeyword,
        language: merged.language,
        locale: merged.locale,
        country: merged.country,
        source: merged.source,
        confidence: merged.confidence,
        intent: merged.intent,
        cluster: merged.cluster,
        entity_type: merged.entityType,
        entity_id: merged.entityId,
        product_slug: merged.productSlug,
        category_slug: merged.categorySlug,
        target_url: merged.targetUrl,
        primary_or_secondary: merged.primaryOrSecondary,
        status: merged.status,
        first_seen_at: merged.firstSeenAt,
        last_seen_at: merged.lastSeenAt,
        gsc_clicks: merged.gscClicks,
        gsc_impressions: merged.gscImpressions,
        gsc_ctr: merged.gscCtr,
        gsc_average_position: merged.gscAveragePosition,
        evidence: merged.evidence,
        is_actual_gsc_query: merged.isActualGscQuery,
        is_generated_keyword: merged.isGeneratedKeyword,
        generation_method: merged.generationMethod,
        relevance_score: merged.relevanceScore,
        opportunity_score: merged.opportunityScore,
        cannibalization_risk: merged.cannibalizationRisk,
        created_at: merged.createdAt,
        updated_at: merged.updatedAt,
      });
    }

    const supabase = getSupabaseAdmin();
    if (supabase && toSaveRows.length > 0) {
      try {
        const { error } = await supabase
          .from('master_agent_keyword_universe')
          .upsert(toSaveRows, { onConflict: 'id' });

        if (error) {
          logger.warn('[KeywordUniverseStore] Notice: Supabase sync skipped:', { error: error.message });
        }
      } catch (err: any) {
        logger.warn('[KeywordUniverseStore] Supabase save warning:', { error: err?.message });
      }
    }

    return { upsertedCount: entries.length };
  }

  /**
   * Generates real-time summary statistics of the universe.
   * Derives real catalog count dynamically without hardcoded assumptions.
   */
  public getSummaryStats(totalCatalogProducts?: number): KeywordUniverseSummaryStats {
    const all = this.getAll();
    let gscObserved = 0;
    let catalogDerived = 0;
    let internalGraph = 0;
    let heuristic = 0;

    let en = 0;
    let hi = 0;
    let hinglish = 0;

    const clustersCount: Record<string, number> = {};
    const coveredProducts = new Set<string>();
    const mappedUrls = new Set<string>();
    let unmapped = 0;
    let cannibalization = 0;
    let strikingDistance = 0;

    for (const e of all) {
      if (e.source === 'GSC_OBSERVED') gscObserved++;
      else if (e.source === 'CATALOG_DERIVED') catalogDerived++;
      else if (e.source === 'INTERNAL_GRAPH_DERIVED') internalGraph++;
      else if (e.source === 'HEURISTIC_HYPOTHESIS') heuristic++;

      if (e.language === 'en') en++;
      else if (e.language === 'hi') hi++;
      else if (e.language === 'hinglish') hinglish++;

      clustersCount[e.cluster] = (clustersCount[e.cluster] || 0) + 1;

      if (e.productSlug) coveredProducts.add(e.productSlug);
      if (e.targetUrl && e.targetUrl !== '/') mappedUrls.add(e.targetUrl);
      else unmapped++;

      if (e.cannibalizationRisk) cannibalization++;
      if (e.gscAveragePosition > 4 && e.gscAveragePosition <= 20) strikingDistance++;
    }

    const realCatalogCount = totalCatalogProducts !== undefined ? totalCatalogProducts : coveredProducts.size;

    return {
      totalKeywords: all.length,
      gscObservedCount: gscObserved,
      catalogDerivedCount: catalogDerived,
      internalGraphDerivedCount: internalGraph,
      heuristicHypothesesCount: heuristic,
      languagesCount: { en, hi, hinglish },
      clustersCount,
      mappedPagesCount: mappedUrls.size,
      unmappedKeywordsCount: unmapped,
      cannibalizationRisksCount: cannibalization,
      newKeywordsCount: all.filter((e) => e.status === 'OPPORTUNITY').length,
      strikingDistanceCount: strikingDistance,
      productCoverageCount: coveredProducts.size,
      totalProductsInCatalog: realCatalogCount,
    };
  }

  /**
   * Resets memory store for deterministic test scenarios.
   */
  public clearMemory(): void {
    this.memoryEntries.clear();
  }

  public resetForTesting(): void {
    this.memoryEntries.clear();
    this.isLoaded = true;
  }
}
