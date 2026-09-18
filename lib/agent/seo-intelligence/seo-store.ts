// ============================================================================
// MUSKY DOSE — SEO INTELLIGENCE STORE
// Hybrid Fail-Safe Persistence: In-Memory Ring Buffer + Supabase Synchronization
// ============================================================================

import {
  SeoOpportunity,
  DailySeoBriefReport,
  SeoOpportunityStatus,
  OpportunitySource,
  DataConfidence,
} from './types';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { SeoIntelligenceLogger } from './logger';

export class SeoIntelligenceStore {
  private static instance: SeoIntelligenceStore | null = null;

  private memoryOpportunities: Map<string, SeoOpportunity> = new Map();
  private memoryReports: Map<string, DailySeoBriefReport> = new Map();
  private isLoaded: boolean = false;

  public static getInstance(): SeoIntelligenceStore {
    if (!SeoIntelligenceStore.instance) {
      SeoIntelligenceStore.instance = new SeoIntelligenceStore();
    }
    return SeoIntelligenceStore.instance;
  }

  private constructor() {}

  public async ensureLoaded(forceRefresh: boolean = false): Promise<void> {
    if (this.isLoaded && !forceRefresh) return;

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('master_agent_seo_opportunities')
          .select('*')
          .order('detected_at', { ascending: false })
          .limit(300);

        if (!error && data) {
          this.memoryOpportunities.clear();
          for (const row of data) {
            let canonicalSource: OpportunitySource = 'HEURISTIC_HYPOTHESIS';
            if (row.source === 'GSC_OBSERVED' || (row.source === 'GOOGLE_SEARCH_CONSOLE' && row.is_actual_gsc_query)) {
              canonicalSource = 'GSC_OBSERVED';
            } else if (row.source === 'CATALOG_DERIVED' || (row.source === 'CATALOG_AUDIT' && row.opportunity_type === 'PRODUCT_SEO_OPPORTUNITY')) {
              canonicalSource = 'CATALOG_DERIVED';
            } else if (row.source === 'INTERNAL_GRAPH_DERIVED' || (row.source === 'CATALOG_AUDIT' && row.opportunity_type === 'INTERNAL_LINK_OPPORTUNITY')) {
              canonicalSource = 'INTERNAL_GRAPH_DERIVED';
            } else if (row.source === 'HEURISTIC_HYPOTHESIS' || row.source === 'FIRST_PARTY_SEARCH') {
              canonicalSource = 'HEURISTIC_HYPOTHESIS';
            } else if (row.source === 'GOOGLE_SEARCH_CONSOLE') {
              canonicalSource = (row.clicks > 0 || row.impressions > 0) ? 'GSC_OBSERVED' : 'HEURISTIC_HYPOTHESIS';
            }

            let canonicalConfidence: DataConfidence = row.confidence;
            if (!canonicalConfidence) {
              if (canonicalSource === 'CATALOG_DERIVED' || canonicalSource === 'INTERNAL_GRAPH_DERIVED') {
                canonicalConfidence = 'HIGH';
              } else if (canonicalSource === 'GSC_OBSERVED') {
                canonicalConfidence = row.impressions >= 100 ? 'HIGH' : row.impressions >= 40 ? 'MEDIUM' : 'LOW';
              } else {
                canonicalConfidence = 'INSUFFICIENT_DATA';
              }
            }

            const opp: SeoOpportunity = {
              id: row.id,
              query: row.query,
              pageUrl: row.page_url,
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: Number(row.ctr),
              averagePosition: Number(row.average_position),
              dateRange: row.date_range,
              country: row.country,
              device: row.device,
              opportunityType: row.opportunity_type,
              opportunityScore: row.opportunity_score,
              searchIntent: row.search_intent,
              recommendedAction: row.recommended_action,
              suggestedTitle: row.suggested_title,
              suggestedOutline: row.suggested_outline || [],
              internalLinkTargets: row.internal_link_targets || [],
              relatedProducts: row.related_products || [],
              status: row.status,
              detectedAt: row.detected_at,
              source: canonicalSource,
              confidence: canonicalConfidence,
              evidence: row.evidence || (canonicalSource === 'GSC_OBSERVED' ? `GSC query observed with ${row.impressions} impressions.` : canonicalSource === 'CATALOG_DERIVED' ? 'Catalog completeness audit.' : canonicalSource === 'INTERNAL_GRAPH_DERIVED' ? 'Internal link graph audit.' : 'Heuristic content opportunity hypothesis.'),
              isActualGscQuery: row.is_actual_gsc_query ?? (canonicalSource === 'GSC_OBSERVED'),
              isActualGscPage: row.is_actual_gsc_page ?? (canonicalSource !== 'HEURISTIC_HYPOTHESIS'),
              reason: row.reason || row.recommended_action,
              taskId: row.task_id,
              requiresApproval: row.requires_approval,
              approvalReason: row.approval_reason,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            };
            this.memoryOpportunities.set(opp.id, opp);
          }
        }
      } catch (err: any) {
        logger.warn('[SeoStore] Supabase load warning, using in-memory store:', { error: err?.message });
      }
    }
    this.isLoaded = true;
  }

  public async saveOpportunities(opportunities: SeoOpportunity[]): Promise<void> {
    for (const opp of opportunities) {
      this.memoryOpportunities.set(opp.id, opp);
      SeoIntelligenceLogger.opportunityCreated(opp.id, opp.opportunityType, opp.query, opp.opportunityScore);
    }

    const supabase = getSupabaseAdmin();
    if (supabase && opportunities.length > 0) {
      try {
        const rows = opportunities.map((opp) => ({
          id: opp.id,
          query: opp.query,
          page_url: opp.pageUrl,
          clicks: opp.clicks,
          impressions: opp.impressions,
          ctr: opp.ctr,
          average_position: opp.averagePosition,
          date_range: opp.dateRange,
          country: opp.country,
          device: opp.device,
          opportunity_type: opp.opportunityType,
          opportunity_score: opp.opportunityScore,
          search_intent: opp.searchIntent,
          recommended_action: opp.recommendedAction,
          suggested_title: opp.suggestedTitle,
          suggested_outline: opp.suggestedOutline || [],
          internal_link_targets: opp.internalLinkTargets || [],
          related_products: opp.relatedProducts || [],
          status: opp.status,
          detected_at: opp.detectedAt,
          source: opp.source,
          task_id: opp.taskId,
          requires_approval: opp.requiresApproval,
          approval_reason: opp.approvalReason,
          created_at: opp.createdAt,
          updated_at: opp.updatedAt,
        }));

        const { error } = await supabase
          .from('master_agent_seo_opportunities')
          .upsert(rows, { onConflict: 'id' });

        if (error) {
          logger.warn('[SeoStore] Failed to upsert opportunities to Supabase:', { error: error.message });
        }
      } catch (err: any) {
        logger.warn('[SeoStore] Supabase save error:', { error: err?.message });
      }
    }
  }

  public getOpportunities(status?: SeoOpportunityStatus): SeoOpportunity[] {
    const list = Array.from(this.memoryOpportunities.values());
    if (status) {
      return list.filter((o) => o.status === status);
    }
    return list.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }

  public getOpportunity(id: string): SeoOpportunity | undefined {
    return this.memoryOpportunities.get(id);
  }

  public async updateOpportunityStatus(
    id: string,
    status: SeoOpportunityStatus,
    taskId?: string
  ): Promise<SeoOpportunity | undefined> {
    const opp = this.memoryOpportunities.get(id);
    if (!opp) return undefined;

    const updated: SeoOpportunity = {
      ...opp,
      status,
      taskId: taskId || opp.taskId,
      updatedAt: new Date().toISOString(),
    };

    this.memoryOpportunities.set(id, updated);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from('master_agent_seo_opportunities')
          .update({
            status,
            task_id: updated.taskId,
            updated_at: updated.updatedAt,
          })
          .eq('id', id);
      } catch (err: any) {
        logger.warn('[SeoStore] Failed to update opportunity in Supabase:', { error: err?.message });
      }
    }
    return updated;
  }

  public async saveDailyReport(report: DailySeoBriefReport): Promise<void> {
    this.memoryReports.set(report.date, report);
    SeoIntelligenceLogger.reportGenerated(report.id, report.metadata.totalOpportunitiesDetected, report.date);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from('master_agent_seo_reports')
          .upsert(
            {
              id: report.id,
              report_date: report.date,
              report_data: report,
              created_at: report.generatedAt,
            },
            { onConflict: 'report_date' }
          );
      } catch (err: any) {
        logger.warn('[SeoStore] Failed to save daily SEO report to Supabase:', { error: err?.message });
      }
    }
  }

  public async getLatestDailyReport(): Promise<DailySeoBriefReport | undefined> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('master_agent_seo_reports')
          .select('*')
          .order('report_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data && data.report_data) {
          return data.report_data as DailySeoBriefReport;
        }
      } catch (err: any) {
        logger.warn('[SeoStore] Failed to load latest report from Supabase:', { error: err?.message });
      }
    }

    const reports = Array.from(this.memoryReports.values()).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
    return reports[0];
  }

  public resetForTesting(): void {
    this.memoryOpportunities.clear();
    this.memoryReports.clear();
    this.isLoaded = true;
  }
}

