// ============================================================================
// MUSKY DOSE — AUTONOMOUS LEARNING & STRATEGY OPTIMIZATION ENGINE
// Evidence-Driven Experience Persistence & Adaptive Strategy Selection
// Invariant: Learning optimizes execution strategy; Governance remains authoritative.
// ============================================================================

import { CanonicalTaskDomain, AgentWorkerType } from './types';
import { AgentStore } from './agent-store';
import { logger } from '@/lib/logger';

export interface LearnedStrategyRecord {
  id: string;
  domain: CanonicalTaskDomain;
  worker: AgentWorkerType;
  taskType: string;
  strategy: string;
  successCount: number;
  failureCount: number;
  totalAttempts: number;
  averageDurationMs: number;
  confidence: number; // 0.000 - 1.000
  lastOutcome: 'SUCCESS' | 'FAILURE';
  lastFailureReason?: string;
  recommendedNextStrategy?: string;
  verifiedLessons: string[];
  updatedAt: string;
}

export interface RecordExperienceInput {
  domain: CanonicalTaskDomain;
  worker: AgentWorkerType;
  taskType: string;
  strategy: string;
  success: boolean;
  durationMs: number;
  failureReason?: string;
  lessonSynthesized?: string;
  alternativeStrategy?: string;
}

export class LearningEngine {
  private static instance: LearningEngine | null = null;
  private strategies: Map<string, LearnedStrategyRecord> = new Map();

  public static getInstance(): LearningEngine {
    if (!LearningEngine.instance) {
      LearningEngine.instance = new LearningEngine();
    }
    return LearningEngine.instance;
  }

  private constructor() {
    this.seedFoundationalPlaybooks();
  }

  private seedFoundationalPlaybooks() {
    const defaultPlaybooks: LearnedStrategyRecord[] = [
      {
        id: 'strat-media-primary',
        domain: 'MEDIA',
        worker: 'media_visual',
        taskType: 'PRIMARY_SLOT_GENERATION',
        strategy: 'UNIVERSAL_VISUAL_LANGUAGE_V1',
        successCount: 15,
        failureCount: 0,
        totalAttempts: 15,
        averageDurationMs: 420,
        confidence: 0.98,
        lastOutcome: 'SUCCESS',
        verifiedLessons: ['5200K-5600K daylight and sandstone pedestal deliver consistent luxury appearance.'],
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'strat-seo-canonical',
        domain: 'SEO',
        worker: 'seo_guardian',
        taskType: 'CANONICAL_AUDIT',
        strategy: 'STRICT_HTTPS_SINGLETON',
        successCount: 40,
        failureCount: 0,
        totalAttempts: 40,
        averageDurationMs: 85,
        confidence: 0.99,
        lastOutcome: 'SUCCESS',
        verifiedLessons: ['Ensuring 100% trailing-slash consistency avoids redirect chain penalties.'],
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'strat-commerce-price-guard',
        domain: 'COMMERCE',
        worker: 'commerce_guardian',
        taskType: 'COMMERCIAL_CHANGE',
        strategy: 'STRICT_SAFETY_GATE_APPROVAL',
        successCount: 22,
        failureCount: 0,
        totalAttempts: 22,
        averageDurationMs: 15,
        confidence: 1.0,
        lastOutcome: 'SUCCESS',
        verifiedLessons: ['Always gate pricing changes for owner approval to protect catalog revenue.'],
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const p of defaultPlaybooks) {
      this.strategies.set(p.id, p);
    }
  }

  /**
   * Generates a composite key for looking up strategy performance.
   */
  private makeKey(domain: CanonicalTaskDomain, worker: AgentWorkerType, taskType: string, strategy: string): string {
    return `${domain}::${worker}::${taskType}::${strategy}`;
  }

  /**
   * Records an execution experience and updates empirical strategy confidence.
   */
  public async recordExperience(input: RecordExperienceInput): Promise<LearnedStrategyRecord> {
    const key = this.makeKey(input.domain, input.worker, input.taskType, input.strategy);
    const existing = this.strategies.get(key);

    const now = new Date().toISOString();
    let record: LearnedStrategyRecord;

    if (existing) {
      const newSuccess = existing.successCount + (input.success ? 1 : 0);
      const newFailure = existing.failureCount + (input.success ? 0 : 1);
      const newTotal = newSuccess + newFailure;

      // Incremental rolling average duration
      const newAvgDuration = Math.round(
        (existing.averageDurationMs * existing.totalAttempts + input.durationMs) / newTotal
      );

      // Bayesian Laplace smoothing for confidence: (success + 1) / (total + 2)
      const confidence = Number(((newSuccess + 1) / (newTotal + 2)).toFixed(3));

      const lessons = [...existing.verifiedLessons];
      if (input.lessonSynthesized && !lessons.includes(input.lessonSynthesized)) {
        lessons.push(input.lessonSynthesized);
      }

      record = {
        ...existing,
        successCount: newSuccess,
        failureCount: newFailure,
        totalAttempts: newTotal,
        averageDurationMs: newAvgDuration,
        confidence,
        lastOutcome: input.success ? 'SUCCESS' : 'FAILURE',
        lastFailureReason: input.failureReason || existing.lastFailureReason,
        recommendedNextStrategy: input.success
          ? input.strategy
          : input.alternativeStrategy || existing.recommendedNextStrategy,
        verifiedLessons: lessons.slice(-5), // Keep top 5 latest lessons
        updatedAt: now,
      };
    } else {
      const confidence = input.success ? 0.67 : 0.33;
      record = {
        id: `strat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        domain: input.domain,
        worker: input.worker,
        taskType: input.taskType,
        strategy: input.strategy,
        successCount: input.success ? 1 : 0,
        failureCount: input.success ? 0 : 1,
        totalAttempts: 1,
        averageDurationMs: input.durationMs,
        confidence,
        lastOutcome: input.success ? 'SUCCESS' : 'FAILURE',
        lastFailureReason: input.failureReason,
        recommendedNextStrategy: input.success ? input.strategy : input.alternativeStrategy,
        verifiedLessons: input.lessonSynthesized ? [input.lessonSynthesized] : [],
        updatedAt: now,
      };
    }

    this.strategies.set(key, record);

    // Sync verified lesson to AgentStore durable memory if successful
    if (input.success && input.lessonSynthesized) {
      try {
        const store = AgentStore.getInstance();
        await store.recordLesson({
          id: `mem-strat-${Date.now().toString(36)}`,
          category: 'VERIFIED_LESSON',
          topic: `${input.domain}_${input.taskType}`.toUpperCase(),
          lesson: input.lessonSynthesized,
          confidence: record.confidence,
          sampleSize: record.totalAttempts,
          isCanonical: true,
          verificationData: { strategy: input.strategy, durationMs: input.durationMs },
        });
      } catch (err: any) {
        logger.warn('[LearningEngine] Could not persist lesson to AgentStore:', { error: err?.message });
      }
    }

    return record;
  }

  /**
   * Recommends the highest-confidence strategy among a list of available candidates.
   */
  public getRecommendedStrategy(
    domain: CanonicalTaskDomain,
    worker: AgentWorkerType,
    taskType: string,
    availableStrategies: string[]
  ): { strategy: string; confidence: number; rationale: string } {
    if (availableStrategies.length === 0) {
      return {
        strategy: 'DEFAULT',
        confidence: 0.5,
        rationale: 'No specific strategies provided; using system default.',
      };
    }

    if (availableStrategies.length === 1) {
      return {
        strategy: availableStrategies[0],
        confidence: 0.8,
        rationale: 'Only one strategy available; selected directly.',
      };
    }

    let bestStrategy = availableStrategies[0];
    let highestScore = -1;
    let rationale = 'Initial candidate chosen as baseline.';

    for (const strat of availableStrategies) {
      const key = this.makeKey(domain, worker, taskType, strat);
      const record = this.strategies.get(key);

      if (record) {
        // Penalty for recent failures or low confidence
        let score = record.confidence;
        if (record.lastOutcome === 'FAILURE') {
          score *= 0.5; // Heavily penalize failing strategy
        }

        if (score > highestScore) {
          highestScore = score;
          bestStrategy = strat;
          rationale = `Selected based on ${record.successCount} prior successes (${record.confidence * 100}% confidence).`;
        }
      } else {
        // Unexplored strategy gets exploration score of 0.6
        if (0.6 > highestScore) {
          highestScore = 0.6;
          bestStrategy = strat;
          rationale = 'Selected unexplored strategy for empirical validation.';
        }
      }
    }

    return {
      strategy: bestStrategy,
      confidence: Number(highestScore.toFixed(3)),
      rationale,
    };
  }

  /**
   * Returns all learned strategy records.
   */
  public getAllLearnings(): LearnedStrategyRecord[] {
    return Array.from(this.strategies.values()).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Summarizes learning metrics for admin control center.
   */
  public getSummary() {
    const list = Array.from(this.strategies.values());
    const totalExperiences = list.reduce((sum, r) => sum + r.totalAttempts, 0);
    const totalSuccesses = list.reduce((sum, r) => sum + r.successCount, 0);

    return {
      totalStrategiesTracked: list.length,
      totalExperiences,
      overallSuccessRate: totalExperiences > 0 ? Number(((totalSuccesses / totalExperiences) * 100).toFixed(1)) : 100,
      highConfidenceStrategies: list.filter((r) => r.confidence >= 0.85).length,
      recentLearnings: list.slice(0, 8),
    };
  }

  /**
   * Reset for testing isolation.
   */
  public resetForTesting(): void {
    this.strategies.clear();
    this.seedFoundationalPlaybooks();
  }
}
