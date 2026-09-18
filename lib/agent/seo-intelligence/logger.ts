// ============================================================================
// MUSKY DOSE — SEO INTELLIGENCE LAYER: STRUCTURED LOGGING
// Standardized, audit-grade structured logging for all SEO intelligence events.
// Strict Privacy: Never logs credentials, private keys, tokens, or PII.
// ============================================================================

import { logger } from '@/lib/logger';

export type SeoLogEventType =
  | 'SEO_FETCH_STARTED'
  | 'SEO_FETCH_COMPLETED'
  | 'SEO_ANALYSIS_STARTED'
  | 'SEO_OPPORTUNITY_CREATED'
  | 'SEO_TASK_ENQUEUED'
  | 'SEO_TASK_EXECUTED'
  | 'SEO_TASK_SKIPPED'
  | 'SEO_APPROVAL_REQUIRED'
  | 'SEO_REPORT_GENERATED';

export interface SeoLogPayload {
  event: SeoLogEventType;
  timestamp: string;
  source: string;
  details?: Record<string, unknown>;
}

export class SeoIntelligenceLogger {
  private static sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> {
    if (!details) return {};
    const sanitized: Record<string, unknown> = {};

    const sensitiveKeys = ['key', 'secret', 'token', 'auth', 'private', 'password', 'bearer'];

    for (const [k, v] of Object.entries(details)) {
      const lowerKey = k.toLowerCase();
      if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
        sanitized[k] = '[REDACTED]';
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  public static log(event: SeoLogEventType, details?: Record<string, unknown>): void {
    const payload: SeoLogPayload = {
      event,
      timestamp: new Date().toISOString(),
      source: 'SEO_INTELLIGENCE_LAYER',
      details: this.sanitizeDetails(details),
    };

    logger.info(`[SEO_INTELLIGENCE] [${event}]`, payload);
  }

  public static fetchStarted(sourceName: string, range?: string): void {
    this.log('SEO_FETCH_STARTED', { sourceName, range });
  }

  public static fetchCompleted(sourceName: string, recordsIngested: number, durationMs: number): void {
    this.log('SEO_FETCH_COMPLETED', { sourceName, recordsIngested, durationMs });
  }

  public static analysisStarted(datasetSize: number): void {
    this.log('SEO_ANALYSIS_STARTED', { datasetSize });
  }

  public static opportunityCreated(oppId: string, type: string, query: string, score: number): void {
    this.log('SEO_OPPORTUNITY_CREATED', { oppId, type, query, score });
  }

  public static taskEnqueued(taskId: string, worker: string, title: string, priority: number): void {
    this.log('SEO_TASK_ENQUEUED', { taskId, worker, title, priority });
  }

  public static taskExecuted(taskId: string, outcome: string, changes: string): void {
    this.log('SEO_TASK_EXECUTED', { taskId, outcome, changes });
  }

  public static taskSkipped(taskId: string, reason: string): void {
    this.log('SEO_TASK_SKIPPED', { taskId, reason });
  }

  public static approvalRequired(taskId: string, title: string, reason: string): void {
    this.log('SEO_APPROVAL_REQUIRED', { taskId, title, reason });
  }

  public static reportGenerated(reportId: string, totalOpportunities: number, date: string): void {
    this.log('SEO_REPORT_GENERATED', { reportId, totalOpportunities, date });
  }
}

