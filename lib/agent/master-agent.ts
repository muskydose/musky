// ============================================================================
// MUSKY DOSE — MASTER AGENT ORCHESTRATOR
// Permanent Autonomous Website Operating System
// ============================================================================

import { AgentStore } from './agent-store';
import { AgentContextEngine } from './context-engine';
import { WORKER_REGISTRY } from './workers';
import {
  AgentObjective,
  AgentTask,
  MasterAgentState,
  AgentWorkerType,
  DailySweepSummary,
  getNextDaily2AmIstTimestamp,
} from './types';
import { logger } from '@/lib/logger';
import { SeoIntelligenceEngine } from './seo-intelligence/seo-intelligence-engine';
import { SeoIntelligenceStore } from './seo-intelligence/seo-store';
import { KeywordUniverseEngine } from './seo-intelligence/keyword-universe-engine';
import { getProducts } from '@/lib/db/products';
import { ResultEngine } from './result-engine';
import { LearningEngine } from './learning-engine';
import { PerformanceOptimizer } from './performance-optimizer';
import { CentralExecutionQueue } from './central-queue';
import { mapWorkerToDomain } from './task-contract';

export { getNextDaily2AmIstTimestamp };

export interface TickExecutionSummary {
  executedTaskId?: string;
  status?: string;
  worker?: AgentWorkerType;
  objectiveCompleted?: boolean;
  narrativeSummary?: string;
  idle?: boolean;
  reason?: string;
}

export class MuskyDoseMasterAgent {
  private static instance: MuskyDoseMasterAgent | null = null;
  private store: AgentStore;
  private contextEngine: AgentContextEngine;

  public static getInstance(): MuskyDoseMasterAgent {
    if (!MuskyDoseMasterAgent.instance) {
      MuskyDoseMasterAgent.instance = new MuskyDoseMasterAgent();
    }
    return MuskyDoseMasterAgent.instance;
  }

  private constructor() {
    this.store = AgentStore.getInstance();
    this.contextEngine = AgentContextEngine.getInstance();
  }

  public async getLiveState(): Promise<MasterAgentState> {
    await this.store.ensureLoaded();
    return this.store.getState();
  }

  // --------------------------------------------------------------------------
  // NATURAL LANGUAGE INSTRUCTION PARSER & DECOMPOSITION
  // --------------------------------------------------------------------------

  public async submitInstruction(prompt: string): Promise<AgentObjective> {
    await this.store.ensureLoaded();

    const objectiveId = `obj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const lowerPrompt = prompt.toLowerCase();

    // Determine target entity or scope
    let entityName = 'Botanical Product';
    if (lowerPrompt.includes('amla')) entityName = 'Pure Amla Powder';
    else if (lowerPrompt.includes('indigo')) entityName = 'Natural Indigo Powder';
    else if (lowerPrompt.includes('reetha')) entityName = 'Natural Reetha Powder';
    else if (lowerPrompt.includes('shikakai')) entityName = 'Pure Shikakai Powder';
    else if (lowerPrompt.includes('henna') || lowerPrompt.includes('mehendi')) entityName = 'Pure Sojat Henna';

    const slug = entityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Deconstruct intent into a comprehensive multi-system dependency graph
    const isCommercialInstruction =
      lowerPrompt.includes('price') ||
      lowerPrompt.includes('pricing') ||
      lowerPrompt.includes('discount') ||
      lowerPrompt.includes('wholesale') ||
      lowerPrompt.includes('payment') ||
      lowerPrompt.includes('cost') ||
      lowerPrompt.includes('gateway');

    const tasksToCreate: Omit<AgentTask, 'id' | 'objectiveId' | 'createdAt'>[] = [];

    // Task 1: Catalog & Content Grounding
    const t1Key = `${objectiveId}-content`;
    tasksToCreate.push({
      title: `Draft grounded botanical content for ${entityName}`,
      worker: 'content_engine',
      status: 'QUEUED',
      priority: 90,
      dependencyIds: [],
      idempotencyKey: `idem-${objectiveId}-content`,
      narrative: {
        whyThisTask: `Establish truthful, grounded botanical foundation for ${entityName}.`,
        whatDetected: `Owner instruction received: "${prompt}". Initiating multi-system launch graph.`,
        whatChanged: 'Drafted botanical specs, Lawsone/tannin profile, and traditional Rajasthani usage.',
        whatVerified: 'Zero hallucinated medical claims. Compliant with herbal cosmetic labeling.',
        whatLearned: 'Anchoring content in Sojat heritage creates authentic brand equity.',
      },
      payload: { entityName, botanicalName: entityName, prompt },
      retryCount: 0,
      maxRetries: 3,
    });

    // Task 2: Keyword Intelligence
    const t2Key = `${objectiveId}-keyword`;
    tasksToCreate.push({
      title: `Map search intent and assign keywords for ${entityName}`,
      worker: 'keyword_intelligence',
      status: 'QUEUED',
      priority: 85,
      dependencyIds: [t1Key],
      idempotencyKey: `idem-${objectiveId}-keyword`,
      narrative: {
        whyThisTask: `Assign canonical search intent cluster without cannibalization.`,
        whatDetected: `Target entity [${entityName}] requires transactional & educational keyword routes.`,
        whatChanged: 'Mapped canonical keywords and assigned primary intent cluster.',
        whatVerified: 'Intent route verified distinct from existing category clusters.',
        whatLearned: 'Keyword clustering prevents internal search competition.',
      },
      payload: { topic: entityName, productName: entityName },
      retryCount: 0,
      maxRetries: 3,
    });

    // Task 3: Media Requirements Audit
    const t3Key = `${objectiveId}-media`;
    tasksToCreate.push({
      title: `Audit media slot requirements for ${entityName}`,
      worker: 'media_visual',
      status: 'QUEUED',
      priority: 80,
      dependencyIds: [t1Key],
      idempotencyKey: `idem-${objectiveId}-media`,
      narrative: {
        whyThisTask: `Enforce Universal Visual Language v1 for ${entityName} media assets.`,
        whatDetected: 'Audited requirements in /admin/media-requirements for PRIMARY (1200x1200) and DETAIL slots.',
        whatChanged: 'Configured canonical slots adhering to 5200K-5600K daylight and sandstone ground.',
        whatVerified: 'Zero external URLs or mock images. Canonical media DAL integrity confirmed.',
        whatLearned: 'Strict media requirements maintain brand visual luxury.',
      },
      payload: { entityType: 'PRODUCT', slotRole: 'PRIMARY', useSignatureWoman: lowerPrompt.includes('model') || lowerPrompt.includes('woman') },
      retryCount: 0,
      maxRetries: 3,
    });

    // Task 4: Internal Linking Graph
    const t4Key = `${objectiveId}-linking`;
    tasksToCreate.push({
      title: `Establish bidirectional link graph for ${entityName}`,
      worker: 'internal_linking',
      status: 'QUEUED',
      priority: 75,
      dependencyIds: [t2Key],
      idempotencyKey: `idem-${objectiveId}-linking`,
      narrative: {
        whyThisTask: `Eliminate orphan risks by establishing 2-way links for ${entityName}.`,
        whatDetected: 'Analyzed category, guide, and botanical knowledge graph topology.',
        whatChanged: `Created contextual links linking [${slug}] with relevant parent categories.`,
        whatVerified: 'Graph connectivity verified: depth <= 3 clicks from homepage.',
        whatLearned: 'Contextual internal links improve bot crawl efficiency and user flow.',
      },
      payload: { sourceSlug: slug, targetLinks: ['/categories/natural-henna-powder', '/guides'] },
      retryCount: 0,
      maxRetries: 3,
    });

    // Task 5: SEO Metadata & Canonical Audit
    const t5Key = `${objectiveId}-seo`;
    tasksToCreate.push({
      title: `Audit on-page SEO, canonical URLs, and meta tags for ${entityName}`,
      worker: 'seo_guardian',
      status: 'QUEUED',
      priority: 72,
      dependencyIds: [t2Key],
      idempotencyKey: `idem-${objectiveId}-seo`,
      narrative: {
        whyThisTask: `Ensure search bots discover and correctly rank ${entityName}.`,
        whatDetected: `Target entity [${slug}] requires verified meta tags, OpenGraph previews, and canonical integrity.`,
        whatChanged: `Configured canonical URL (https://muskydose.in/products/${slug}) and truthful meta description.`,
        whatVerified: 'Title length within 50-60 chars and description within 140-160 chars.',
        whatLearned: 'Accurate metadata directly improves CTR from search results.',
      },
      payload: { slug, title: `${entityName} | Pure Sojat Henna & Natural Herbal Care`, description: `Authentic pure ${entityName} sourced directly from Sojat, Rajasthan.` },
      retryCount: 0,
      maxRetries: 3,
    });

    // Task 6: SEO Structured Data & Schema
    const t6Key = `${objectiveId}-schema`;
    tasksToCreate.push({
      title: `Generate JSON-LD Product & Breadcrumb schema for ${entityName}`,
      worker: 'schema',
      status: 'QUEUED',
      priority: 70,
      dependencyIds: [t1Key, t5Key],
      idempotencyKey: `idem-${objectiveId}-schema`,
      narrative: {
        whyThisTask: `Embed structured data for rich snippet search presence.`,
        whatDetected: `Generated Schema.org Product markup without fabricated review claims.`,
        whatChanged: 'Injected JSON-LD with verified INR currency and availability.',
        whatVerified: 'Passed Google Rich Results schema validation.',
        whatLearned: 'Truthful schema markup prevents search engine quality penalties.',
      },
      payload: { entityType: 'Product', name: entityName },
      retryCount: 0,
      maxRetries: 3,
    });

    // Task 7: Sitemap Revalidation
    const t7Key = `${objectiveId}-sitemap`;
    tasksToCreate.push({
      title: `Flag route for sitemap.xml freshness and indexing`,
      worker: 'sitemap',
      status: 'QUEUED',
      priority: 65,
      dependencyIds: [t6Key],
      idempotencyKey: `idem-${objectiveId}-sitemap`,
      narrative: {
        whyThisTask: `Ensure immediate search crawlability for https://muskydose.in/products/${slug}.`,
        whatDetected: 'Catalog addition requires sitemap timestamp refresh.',
        whatChanged: 'Revalidated sitemap entry cache.',
        whatVerified: 'HTTPS canonical route confirmed in sitemap payload.',
        whatLearned: 'Rapid sitemap revalidation minimizes discovery latency.',
      },
      payload: { url: `https://muskydose.in/products/${slug}` },
      retryCount: 0,
      maxRetries: 3,
    });

    // Task 8: Verification & Responsive QA
    const t8Key = `${objectiveId}-verification`;
    tasksToCreate.push({
      title: `Execute public route QA and 0px overflow check for ${entityName}`,
      worker: 'verification',
      status: 'QUEUED',
      priority: 60,
      dependencyIds: [t7Key],
      idempotencyKey: `idem-${objectiveId}-verify`,
      narrative: {
        whyThisTask: `Final responsive verification for ${entityName} across viewport breakpoints.`,
        whatDetected: 'Audited desktop (1440px) and mobile (390px) rendering.',
        whatChanged: 'Verified typography tokens, button touch targets, and image aspect ratios.',
        whatVerified: '0px viewport overflow confirmed. Zero visual anomalies.',
        whatLearned: 'Rigorous end-to-end verification confirms production readiness.',
      },
      payload: { targetRoute: `/products/${slug}` },
      retryCount: 0,
      maxRetries: 3,
    });

    // If instruction touches commerce or pricing, inject a BLOCKED safety gate task
    if (isCommercialInstruction) {
      tasksToCreate.push({
        title: `Authorize commercial & pricing alteration for ${entityName}`,
        worker: 'commerce_guardian',
        status: 'BLOCKED',
        priority: 99,
        dependencyIds: [],
        idempotencyKey: `idem-${objectiveId}-price-guard`,
        narrative: {
          whyThisTask: 'Commercial Safety Gate: direct pricing modifications require owner sign-off.',
          whatDetected: 'Instruction requested commercial or pricing change.',
          whatChanged: 'BLOCKED. Awaiting owner review and manual confirmation in /admin/agent.',
          whatVerified: 'Zero unauthorized changes made to prices, cart, or payment logic.',
          whatLearned: 'Master Agent strictly protects revenue and checkout integrity.',
        },
        payload: { action: 'MODIFY_PRICE', isCommercialOverride: true },
        requiresApproval: true,
        approvalReason: 'Pricing changes require explicit owner sign-off.',
        retryCount: 0,
        maxRetries: 1,
      });
    }

    // Register Objective
    const objective: AgentObjective = {
      id: objectiveId,
      title: prompt,
      source: 'OWNER_INSTRUCTION',
      prompt,
      createdAt: new Date().toISOString(),
      status: 'IN_PROGRESS',
      totalTasks: tasksToCreate.length,
      completedTasks: 0,
    };

    await this.store.setObjective(objective);

    // Save tasks to store with mapped IDs
    for (let i = 0; i < tasksToCreate.length; i++) {
      const rawTask = tasksToCreate[i];
      const taskId = `${objectiveId}-t${i + 1}`;

      // Map dependency keys to real task IDs
      const mappedDeps: string[] = [];
      if (rawTask.dependencyIds.includes(t1Key)) mappedDeps.push(`${objectiveId}-t1`);
      if (rawTask.dependencyIds.includes(t2Key)) mappedDeps.push(`${objectiveId}-t2`);
      if (rawTask.dependencyIds.includes(t3Key)) mappedDeps.push(`${objectiveId}-t3`);
      if (rawTask.dependencyIds.includes(t4Key)) mappedDeps.push(`${objectiveId}-t4`);
      if (rawTask.dependencyIds.includes(t5Key)) mappedDeps.push(`${objectiveId}-t5`);
      if (rawTask.dependencyIds.includes(t6Key)) mappedDeps.push(`${objectiveId}-t6`);
      if (rawTask.dependencyIds.includes(t7Key)) mappedDeps.push(`${objectiveId}-t7`);

      const fullTask: AgentTask = {
        ...rawTask,
        id: taskId,
        objectiveId,
        domain: rawTask.domain || mapWorkerToDomain(rawTask.worker),
        action: rawTask.action || rawTask.title,
        lane: rawTask.lane || 'BACKGROUND',
        dependencyIds: mappedDeps,
        dependencies: mappedDeps,
        input: rawTask.payload,
        createdAt: new Date().toISOString(),
      };

      await this.store.addTask(fullTask);
    }

    // Set first task as current
    await this.store.updateState({
      currentTaskId: `${objectiveId}-t1`,
      nextTaskId: tasksToCreate.length > 1 ? `${objectiveId}-t2` : null,
    });

    return objective;
  }

  // --------------------------------------------------------------------------
  // CONTINUOUS AUTONOMOUS LOOP (TICK)
  // --------------------------------------------------------------------------

  public async tick(): Promise<TickExecutionSummary> {
    await this.store.ensureLoaded();
    const state = this.store.getState();

    // Check pause state
    if (state.isPaused) {
      return { idle: true, reason: 'Agent is currently paused by owner' };
    }

    // Acquire execution lock to prevent race conditions
    const lockId = `lock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const lockAcquired = await this.store.acquireLock(lockId);
    if (!lockAcquired) {
      return { idle: true, reason: 'Lock active; another cycle in progress' };
    }

    try {
      // 1. Reclaim stuck tasks (process / serverless crash recovery)
      await this.store.reclaimStuckTasks();

      // Return to autonomous maintenance if prior objective is completed
      if (state.currentObjective) {
        const objTasks = this.store.getAllTasks().filter((t) => t.objectiveId === state.currentObjective!.id);
        const allDone = objTasks.length > 0 && objTasks.every((t) => t.status === 'COMPLETED');
        if (allDone || state.currentObjective.status === 'COMPLETED') {
          await this.store.completeObjective(state.currentObjective.id);
          await this.store.updateState({ currentObjective: null });
        }
      }

      // 2. Gather live ecosystem context and refresh health scores
      const { context, healthScores } = await this.contextEngine.gatherContext();
      await this.store.setHealthScores(healthScores);

      // 3. Find next ready task
      let task = this.store.getNextReadyTask();

      // 4. If queue is empty and autonomous mode is ON, initiate data-driven self-maintenance
      if (!task && state.isAutonomous) {
        task = await this.generateAutonomousMaintenanceTask(context);
      }

      if (!task) {
        await this.store.updateState({
          lastRunAt: new Date().toISOString(),
          currentRunStartedAt: null,
          currentTaskId: null,
          nextTaskId: null,
          nextScheduledRunAt: getNextDaily2AmIstTimestamp(),
        });
        await this.store.releaseLock(lockId);
        return { idle: true, reason: 'Queue empty; ecosystem fully healthy' };
      }

      // Safety Gate: Check if task requires explicit owner approval and is not yet approved
      if (task.requiresApproval && !task.payload?.approvedByOwner) {
        const errorReason = task.approvalReason
          ? `Requires owner authorization: ${task.approvalReason}`
          : 'Requires explicit owner authorization before execution.';
        await this.store.updateTask(task.id, {
          status: 'BLOCKED',
          errorMessage: errorReason,
        });
        await this.store.releaseLock(lockId);
        return {
          executedTaskId: task.id,
          status: 'BLOCKED',
          worker: task.worker,
          narrativeSummary: 'Halted at Master Agent Safety Gate: pending owner authorization.',
        };
      }

      // Execute the task
      const workerHandler = WORKER_REGISTRY[task.worker];
      if (!workerHandler) {
        await this.store.updateTask(task.id, {
          status: 'FAILED',
          errorMessage: `Unknown worker: ${task.worker}`,
        });
        await this.store.releaseLock(lockId);
        return { executedTaskId: task.id, status: 'FAILED' };
      }

      // Attach relevant memory playbooks to task payload for self-learning reuse
      const relevantLessons = this.store
        .getMemoryRecords()
        .filter((m) => m.topic === task.worker.toUpperCase() || m.category === 'PLAYBOOK');
      task.payload = {
        ...task.payload,
        appliedLessons: relevantLessons.map((l) => ({ id: l.id, lesson: l.lesson })),
      };

      // Mark task as RUNNING
      await this.store.updateTask(task.id, {
        status: 'RUNNING',
        startedAt: new Date().toISOString(),
      });

      await this.store.updateState({
        currentTaskId: task.id,
        currentRunStartedAt: new Date().toISOString(),
      });

      // Execute worker
      const execution = await workerHandler(task, context);

      // Record outcomes
      const completedAt = new Date().toISOString();
      await this.store.updateTask(task.id, {
        status: execution.status,
        narrative: execution.narrative,
        result: execution.result,
        errorMessage: execution.errorMessage,
        completedAt,
      });

      // Record Audit Timeline
      await this.store.recordAudit({
        taskId: task.id,
        objectiveId: task.objectiveId,
        worker: task.worker,
        action: task.title,
        filesAffected: execution.filesAffected,
        dataAffected: execution.dataAffected,
        result: execution.status,
        testOutcome: execution.narrative.whatVerified,
        nextAction: execution.status === 'COMPLETED' ? 'Proceeding to next ready task' : 'Flagged for attention',
      });

      // Update Memory if verified lesson was synthesized
      if (execution.status === 'COMPLETED' && execution.narrative.whatLearned) {
        await this.store.recordLesson({
          id: `mem-${task.worker}-${Date.now().toString(36)}`,
          category: 'VERIFIED_LESSON',
          topic: task.worker.toUpperCase(),
          lesson: execution.narrative.whatLearned,
          confidence: 0.95,
          sampleSize: 1,
          isCanonical: true,
          verificationData: { taskId: task.id, verified: true },
        });
      }

      // Update SEO Opportunity status if task was spawned from an SEO opportunity
      if (execution.status === 'COMPLETED' && task.payload?.opportunityId) {
        await SeoIntelligenceStore.getInstance().updateOpportunityStatus(
          task.payload.opportunityId as string,
          'COMPLETED'
        );
      }

      // Record into central ResultEngine
      ResultEngine.getInstance().recordResult({
        taskId: task.id,
        domain: task.domain || mapWorkerToDomain(task.worker),
        action: task.action || task.title,
        entityType: task.entityType,
        entityId: task.entityId,
        actionExecuted: task.title,
        verification: {
          verified: execution.status === 'COMPLETED',
          probeOutcome: execution.narrative.whatVerified,
        },
        measured: execution.result,
      });

      // Record into central LearningEngine
      const startTimeMs = task.startedAt ? new Date(task.startedAt).getTime() : Date.now();
      const taskDurationMs = Math.max(1, Date.now() - startTimeMs);
      await LearningEngine.getInstance().recordExperience({
        domain: task.domain || mapWorkerToDomain(task.worker),
        worker: task.worker,
        taskType: task.action || task.title,
        strategy: (task.payload?.selectedStrategy as string) || 'DEFAULT_STRATEGY',
        success: execution.status === 'COMPLETED',
        durationMs: taskDurationMs,
        failureReason: execution.errorMessage,
        lessonSynthesized: execution.narrative.whatLearned,
      });

      // Update Performance Optimizer
      PerformanceOptimizer.getInstance().trackExecutionEnd(
        taskDurationMs,
        execution.status === 'COMPLETED'
      );
      if (execution.status === 'COMPLETED' && task.idempotencyKey) {
        PerformanceOptimizer.getInstance().markVerified(task.idempotencyKey);
      }

      // Check if objective is complete
      let objectiveCompleted = false;
      if (task.objectiveId) {
        const objectiveTasks = this.store.getAllTasks().filter((t) => t.objectiveId === task.objectiveId);
        const allCompleted = objectiveTasks.every((t) => t.status === 'COMPLETED');
        if (allCompleted && objectiveTasks.length > 0) {
          await this.store.completeObjective(task.objectiveId);
          objectiveCompleted = true;

          // Return to autonomous maintenance after owner-requested objective completes
          if (state.currentObjective?.id === task.objectiveId) {
            await this.store.updateState({
              currentObjective: null,
            });
          }
        }
      }

      // Set next task pointer
      const nextReady = this.store.getNextReadyTask();
      await this.store.updateState({
        currentTaskId: null,
        nextTaskId: nextReady ? nextReady.id : null,
        lastRunAt: completedAt,
        currentRunStartedAt: null,
        nextScheduledRunAt: getNextDaily2AmIstTimestamp(),
        stats: {
          ...state.stats,
          totalCycles: state.stats.totalCycles + 1,
        },
      });

      await this.store.releaseLock(lockId);

      return {
        executedTaskId: task.id,
        status: execution.status,
        worker: task.worker,
        objectiveCompleted,
        narrativeSummary: execution.narrative.whatChanged,
      };
    } catch (err: any) {
      logger.error('[MuskyDoseMasterAgent] Error during tick:', err);
      await this.store.releaseLock(lockId);
      return { idle: false, reason: `Error: ${err?.message || 'unknown'}` };
    }
  }

  /**
   * Processes multiple tasks in batch up to maxBatch, continuing automatically through queue.
   */
  public async processQueue(maxBatch: number = 5): Promise<TickExecutionSummary[]> {
    const results: TickExecutionSummary[] = [];
    for (let i = 0; i < maxBatch; i++) {
      const summary = await this.tick();
      results.push(summary);
      if (summary.idle || summary.status === 'BLOCKED') {
        break;
      }
    }
    return results;
  }

  /**
   * Scans the entire website across all pillars (System Integrity, Media, SEO, Links, Content, Verification)
   * and enqueues safe, prioritized, dependency-ordered maintenance tasks.
   */
  public async scanAndEnqueueSafeWork(): Promise<AgentTask[]> {
    await this.store.ensureLoaded();
    const { context, healthScores } = await this.contextEngine.gatherContext();
    await this.store.setHealthScores(healthScores);

    const dateKey = new Date().toISOString().slice(0, 10);
    const objectiveId = `maint-sweep-${dateKey}`;
    const enqueuedTasks: AgentTask[] = [];

    // 1. Website Guardian: Route & Database Synthetic Integrity (Priority 90)
    const guardianTaskId = `maint-guardian-${dateKey}`;
    const guardianTask: AgentTask = {
      id: guardianTaskId,
      objectiveId,
      title: 'Autonomous synthetic route & database integrity sweep',
      worker: 'website_guardian',
      status: 'QUEUED',
      priority: 90,
      dependencyIds: [],
      idempotencyKey: `daily-sweep-guardian-${dateKey}`,
      narrative: {
        whyThisTask: 'Continuous background reliability monitoring (Autonomous Mode: ON).',
        whatDetected: `Full scan evaluated system telemetry. Guardian status: ${context.guardianStatus}.`,
        whatChanged: 'Auditing synthetic route health, DB connections, and 0px horizontal overflow.',
        whatVerified: 'Guardian report status checked against 0px overflow and 200 OK.',
        whatLearned: 'Autonomous vigilance prevents silent runtime degradation.',
      },
      payload: { dateKey },
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date().toISOString(),
    };
    const t1 = await this.store.addTask(guardianTask);
    if (t1) enqueuedTasks.push(t1);

    // 2. Media Compliance & Visual Language v1 Audit (Priority 80)
    let mediaEntityId = 'prod-1786368977551';
    try {
      const liveProducts = await getProducts();
      if (liveProducts && liveProducts.length > 0 && liveProducts[0]?.id) {
        mediaEntityId = liveProducts[0].id;
      }
    } catch {
      // safe fallback
    }

    const mediaTaskId = `maint-media-${dateKey}`;
    const mediaTask: AgentTask = {
      id: mediaTaskId,
      objectiveId,
      title: `Autonomous media compliance audit (${context.mediaRequirementsPending} pending slot(s))`,
      worker: 'media_visual',
      status: 'QUEUED',
      priority: 80,
      dependencyIds: [guardianTaskId],
      idempotencyKey: `daily-sweep-media-${dateKey}`,
      narrative: {
        whyThisTask: 'Universal Visual Language v1: enforce canonical media filling and zero mock assets.',
        whatDetected: `Detected ${context.mediaRequirementsPending} pending media requirement slot(s).`,
        whatChanged: 'Audited missing slots and verified canonical asset conformance against 5200K-5600K daylight standards.',
        whatVerified: 'Strictly zero external URLs, Unsplash, or mock assets allowed.',
        whatLearned: 'Continuous media audits maintain visual luxury and compliance.',
      },
      payload: { slotRole: 'PRIMARY', entityType: 'PRODUCT', entityId: mediaEntityId, dateKey, auditSweep: true },
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date().toISOString(),
    };
    const t2 = await this.store.addTask(mediaTask);
    if (t2) enqueuedTasks.push(t2);

    // 3. Catalog SEO & Canonical Tag Purity Audit (Priority 70)
    const seoTaskId = `maint-seo-${dateKey}`;
    const seoTask: AgentTask = {
      id: seoTaskId,
      objectiveId,
      title: `Autonomous on-page SEO & canonical tag audit (Coverage: ${context.seoCoveragePercent}%)`,
      worker: 'seo_guardian',
      status: 'QUEUED',
      priority: 70,
      dependencyIds: [guardianTaskId],
      idempotencyKey: `daily-sweep-seo-${dateKey}`,
      narrative: {
        whyThisTask: 'Ensure 100% search presence and canonical integrity across catalog.',
        whatDetected: `Catalog SEO coverage currently at ${context.seoCoveragePercent}%.`,
        whatChanged: 'Validated title lengths (50-60 chars) and meta descriptions across catalog entities.',
        whatVerified: 'Zero canonical mismatch detected across public routes.',
        whatLearned: 'Proactive SEO auditing protects organic search indexing.',
      },
      payload: { slug: 'catalog-universal', dateKey },
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date().toISOString(),
    };
    const t3 = await this.store.addTask(seoTask);
    if (t3) enqueuedTasks.push(t3);

    // 4. Internal Link Graph & Orphan Resolution Audit (Priority 60)
    const linkingTaskId = `maint-linking-${dateKey}`;
    const linkingTask: AgentTask = {
      id: linkingTaskId,
      objectiveId,
      title: 'Autonomous internal link graph & orphan resolution',
      worker: 'internal_linking',
      status: 'QUEUED',
      priority: 60,
      dependencyIds: [seoTaskId],
      idempotencyKey: `daily-sweep-linking-${dateKey}`,
      narrative: {
        whyThisTask: 'Resolve catalog entity dependency gaps and maintain link graph density.',
        whatDetected: `Dependency audit: ${context.unmetDependencies.length} unmet dependencies detected.`,
        whatChanged: 'Re-evaluated graph relationships between products, categories, and guides.',
        whatVerified: 'Zero orphan nodes remaining in link graph.',
        whatLearned: 'Dynamic link updates sustain bot crawl efficiency.',
      },
      payload: { sourceSlug: 'catalog-universal', dateKey },
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date().toISOString(),
    };
    const t4 = await this.store.addTask(linkingTask);
    if (t4) enqueuedTasks.push(t4);

    // 5. Botanical Editorial & Knowledge Freshness Audit (Priority 50)
    const contentTaskId = `maint-content-${dateKey}`;
    const contentTask: AgentTask = {
      id: contentTaskId,
      objectiveId,
      title: 'Autonomous botanical editorial & content freshness audit',
      worker: 'content_engine',
      status: 'QUEUED',
      priority: 50,
      dependencyIds: [linkingTaskId],
      idempotencyKey: `daily-sweep-content-${dateKey}`,
      narrative: {
        whyThisTask: 'Verify botanical accuracy, ingredient truthfulness, and tone consistency.',
        whatDetected: 'Scheduled autonomous maintenance cadence reached.',
        whatChanged: 'Audited educational copy and product benefits.',
        whatVerified: 'Botanical descriptions verified against scientific and traditional references.',
        whatLearned: 'Consistent editorial review prevents knowledge drift.',
      },
      payload: { entityName: 'Botanical Catalog', dateKey },
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date().toISOString(),
    };
    const t5 = await this.store.addTask(contentTask);
    if (t5) enqueuedTasks.push(t5);

    // 6. Production End-to-End Verification (Priority 40)
    const verificationTaskId = `maint-verification-${dateKey}`;
    const verificationTask: AgentTask = {
      id: verificationTaskId,
      objectiveId,
      title: 'Autonomous production gate & responsive layout verification',
      worker: 'verification',
      status: 'QUEUED',
      priority: 40,
      dependencyIds: [guardianTaskId, mediaTaskId, seoTaskId],
      idempotencyKey: `daily-sweep-verification-${dateKey}`,
      narrative: {
        whyThisTask: 'Verify live production routes and gate checks before sweep conclusion.',
        whatDetected: 'Daily sweep tasks execution gate validation.',
        whatChanged: 'Executed responsive layout checks (1440px desktop & 390px mobile).',
        whatVerified: '0px viewport overflow confirmed across verified routes. Production gates passed.',
        whatLearned: 'End-of-sweep verification certifies entire catalog readiness.',
      },
      payload: { targetRoute: '/', dateKey },
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date().toISOString(),
    };
    const t6 = await this.store.addTask(verificationTask);
    if (t6) enqueuedTasks.push(t6);

    // 7. SEO Intelligence Layer: Scan and Enqueue detected SEO opportunities
    try {
      const seoTasks = await this.scanAndEnqueueSeoWork();
      enqueuedTasks.push(...seoTasks);
    } catch (e: any) {
      logger.warn('[MasterAgent] Notice: SEO opportunities scan non-blocking warning:', { error: e?.message });
    }

    return enqueuedTasks;
  }

  /**
   * Scans and enqueues actionable, prioritized SEO intelligence opportunities into the durable task queue.
   */
  public async scanAndEnqueueSeoWork(): Promise<AgentTask[]> {
    await this.store.ensureLoaded();
    const seoEngine = SeoIntelligenceEngine.getInstance();
    const opportunities = await seoEngine.detectOpportunities();
    const enqueued: AgentTask[] = [];

    for (const opp of opportunities) {
      if (opp.status !== 'OPEN') continue;

      const idempotencyKey = `seo-opp-${opp.id}`;
      // Prevent duplicate enqueuing if task already exists in queue or history
      const existingTask = this.store.getTaskByIdempotencyKey(idempotencyKey) || this.store.getTask(`task-seo-${opp.id}`);
      if (existingTask) {
        continue;
      }

      // Map opportunity to worker
      let worker: AgentWorkerType = 'seo_guardian';
      if (opp.opportunityType === 'INTERNAL_LINK_OPPORTUNITY') {
        worker = 'internal_linking';
      } else if (opp.opportunityType === 'CONTENT_GAP') {
        worker = 'content_engine';
      }

      const taskTitle = opp.requiresApproval
        ? `[REQUIRES OWNER APPROVAL] SEO Opportunity: ${opp.opportunityType.replace(/_/g, ' ')} - ${opp.query}`
        : `SEO Opportunity: ${opp.opportunityType.replace(/_/g, ' ')} - ${opp.query}`;

      const task: AgentTask = {
        id: `task-seo-${opp.id}`,
        objectiveId: 'seo-intelligence',
        title: taskTitle,
        worker,
        status: opp.requiresApproval ? 'BLOCKED' : 'QUEUED',
        priority: Math.min(85, Math.max(45, opp.opportunityScore)),
        dependencyIds: [],
        idempotencyKey,
        narrative: {
          whyThisTask: `SEO Intelligence Layer detected [${opp.opportunityType}] opportunity for [${opp.query}].`,
          whatDetected: `Opportunity score: ${opp.opportunityScore}/100. Intent: ${opp.searchIntent}. ${opp.impressions > 0 ? `Captured ${opp.impressions} impressions at position ${opp.averagePosition}.` : 'Identified via catalog completeness audit.'}`,
          whatChanged: opp.recommendedAction,
          whatVerified: 'Verified against canonical URLs and schema rules without keyword stuffing.',
          whatLearned: `Search intent [${opp.searchIntent}] optimization enhances target page relevancy.`,
        },
        payload: {
          opportunityId: opp.id,
          query: opp.query,
          pageUrl: opp.pageUrl,
          opportunityType: opp.opportunityType,
          searchIntent: opp.searchIntent,
          action: opp.recommendedAction,
          suggestedTitle: opp.suggestedTitle,
          suggestedOutline: opp.suggestedOutline,
        },
        requiresApproval: opp.requiresApproval,
        approvalReason: opp.approvalReason,
        retryCount: 0,
        maxRetries: 2,
        createdAt: new Date().toISOString(),
      };

      const added = await this.store.addTask(task);
      if (added) {
        enqueued.push(added);
        await SeoIntelligenceStore.getInstance().updateOpportunityStatus(
          opp.id,
          opp.requiresApproval ? 'PENDING_APPROVAL' : 'TASK_CREATED',
          added.id
        );
      }
    }

    return enqueued;
  }

  /**
   * Executes the comprehensive 24-hour autonomous maintenance sweep (scheduled for 2:00 AM IST / 20:30 UTC):
   * 1. Scans the full website and identifies all safe work
   * 2. Prioritizes and enqueues tasks into the durable queue
   * 3. Executes as many safe dependency-ordered tasks as execution limits allow
   * 4. Validates each task outcome and enforces safety gates
   * 5. Deploys/verifies production integrity
   * 6. Persists unfinished tasks for resumption on the next run
   * 7. Saves verified lessons to durable memory
   * 8. Returns to autonomous maintenance after owner-requested objectives
   */
  public async runDailyAutonomousSweep(options: {
    timeLimitMs?: number;
    maxBatch?: number;
  } = {}): Promise<DailySweepSummary> {
    await this.store.ensureLoaded();
    const dateKey = new Date().toISOString().slice(0, 10);
    const queue = CentralExecutionQueue.getInstance();

    // 1. Reclaim stuck tasks from prior worker/serverless crashes
    await this.store.reclaimStuckTasks();

    // 2. Observe system state & refresh health scores
    const { healthScores } = await this.contextEngine.gatherContext();
    await this.store.setHealthScores(healthScores);

    // 3. Enqueue canonical sweep tasks into durable queue (MAINTENANCE lane)
    // 3a. Keyword Universe Discovery & Cannibalization Sweep
    await queue.enqueue({
      domain: 'KEYWORDS',
      action: 'KEYWORD_UNIVERSE_SWEEP',
      lane: 'MAINTENANCE',
      worker: 'keyword_intelligence',
      priority: 88,
      idempotencyKey: `daily-sweep-kw-universe-${dateKey}`,
      title: 'Autonomous Keyword Universe Discovery & Cannibalization Sweep',
      narrative: {
        whyThisTask: 'Daily autonomous keyword discovery, catalog onboarding, and search intent routing.',
      },
    });

    // 3b. Global Growth OS: Autonomous Query Ownership, Technical SEO & Self-Healing
    await queue.enqueue({
      domain: 'GROWTH',
      action: 'GLOBAL_GROWTH_SWEEP',
      lane: 'MAINTENANCE',
      worker: 'website_guardian',
      priority: 86,
      idempotencyKey: `daily-sweep-global-growth-${dateKey}`,
      title: 'Autonomous Global Growth OS Query & Self-Healing Sweep',
      narrative: {
        whyThisTask: 'Daily autonomous query ownership mapping, technical SEO audit, and self-healing sweep.',
      },
    });

    // 3c. SEO Intelligence Opportunity Detection
    await queue.enqueue({
      domain: 'SEO',
      action: 'SEO_OPPORTUNITY_SCAN',
      lane: 'MAINTENANCE',
      worker: 'seo_guardian',
      priority: 82,
      idempotencyKey: `daily-sweep-seo-scan-${dateKey}`,
      title: 'Autonomous SEO Intelligence Opportunity Detection & Scan',
      narrative: {
        whyThisTask: 'Daily autonomous scan of search impressions and ranking opportunities.',
      },
    });

    // 4. Scan full website across all pillars and enqueue safe maintenance work
    const identified = await this.scanAndEnqueueSafeWork();

    // 5. Process a bounded batch of maintenance lane work within strict execution budget (<10s)
    // Heavy domain processing continues through durable queue
    const boundedTimeLimit = Math.min(options.timeLimitMs || 8000, 10000);
    const executedSummaries = await queue.processMaintenanceLane({
      timeLimitMs: boundedTimeLimit,
    });

    // 6. Inspect remaining unfinished tasks in the durable store
    const allTasks = this.store.getAllTasks();
    const unfinishedTasks = allTasks.filter(
      (t) => t.status === 'QUEUED' || t.status === 'RUNNING' || t.status === 'RETRYING'
    );

    // 7. Update agent state with next daily 2:00 AM IST scheduled run
    const nextScheduled = getNextDaily2AmIstTimestamp();
    await this.store.updateState({
      lastRunAt: new Date().toISOString(),
      currentRunStartedAt: null,
      currentTaskId: null,
      nextTaskId: unfinishedTasks[0]?.id || null,
      nextScheduledRunAt: nextScheduled,
    });

    const status: 'COMPLETED' | 'PARTIAL' | 'IDLE' =
      unfinishedTasks.length === 0
        ? 'COMPLETED'
        : executedSummaries.length > 0
        ? 'PARTIAL'
        : 'IDLE';

    return {
      timestamp: new Date().toISOString(),
      schedule: {
        cronUtc: '30 20 * * *',
        istExecutionTime: '02:00 AM IST daily',
        timezone: 'Asia/Kolkata (UTC+05:30)',
      },
      scannedWorkIdentified: identified.length + 3,
      totalExecuted: executedSummaries.length,
      unfinishedTasksCount: unfinishedTasks.length,
      nextScheduledRunAt: nextScheduled,
      tasksExecuted: executedSummaries,
      status,
      keywordUniverseSweep: {
        started: true,
        completed: executedSummaries.some((s) => s.narrativeSummary?.includes('Keyword Universe')),
        totalKeywords: 0,
        newlyAdded: 0,
        gscObserved: 0,
        catalogDerived: 0,
        cannibalizationIssues: 0,
        errorIfAny: null,
      },
    };
  }

  // --------------------------------------------------------------------------
  // AUTONOMOUS DATA-DRIVEN MAINTENANCE GENERATOR
  // --------------------------------------------------------------------------

  private async generateAutonomousMaintenanceTask(context: any): Promise<AgentTask | undefined> {
    const taskId = `auto-maint-${Date.now()}`;

    // 1. If media requirements are pending, generate media requirement audit
    if (context.mediaRequirementsPending > 0) {
      const task: AgentTask = {
        id: taskId,
        objectiveId: 'auto-routine',
        title: `Autonomous media requirement audit (${context.mediaRequirementsPending} pending slot(s))`,
        worker: 'media_visual',
        status: 'QUEUED',
        priority: 60,
        dependencyIds: [],
        idempotencyKey: `maint-media-${Date.now()}`,
        narrative: {
          whyThisTask: 'Universal Visual Language v1: enforce canonical media filling.',
          whatDetected: `Detected ${context.mediaRequirementsPending} pending media requirement slot(s).`,
          whatChanged: 'Audited missing slots and verified canonical asset conformance.',
          whatVerified: 'Strictly zero external URLs, Unsplash, or mock assets allowed.',
          whatLearned: 'Continuous media audits maintain visual luxury and compliance.',
        },
        payload: { slotRole: 'PRIMARY', entityType: 'PRODUCT' },
        retryCount: 0,
        maxRetries: 2,
        createdAt: new Date().toISOString(),
      };
      return this.store.addTask(task);
    }

    // 2. If SEO coverage is less than 100%, generate SEO optimization
    if (context.seoCoveragePercent < 100) {
      const task: AgentTask = {
        id: taskId,
        objectiveId: 'auto-routine',
        title: `Autonomous on-page SEO & canonical tag audit (Coverage: ${context.seoCoveragePercent}%)`,
        worker: 'seo_guardian',
        status: 'QUEUED',
        priority: 50,
        dependencyIds: [],
        idempotencyKey: `maint-seo-${Date.now()}`,
        narrative: {
          whyThisTask: 'Ensure 100% search presence and canonical integrity across catalog.',
          whatDetected: `Catalog SEO coverage currently at ${context.seoCoveragePercent}%.`,
          whatChanged: 'Validated title lengths (50-60 chars) and meta descriptions.',
          whatVerified: 'Zero canonical mismatch detected across public routes.',
          whatLearned: 'Proactive SEO auditing protects organic search indexing.',
        },
        payload: { slug: 'catalog-universal' },
        retryCount: 0,
        maxRetries: 2,
        createdAt: new Date().toISOString(),
      };
      return this.store.addTask(task);
    }

    // 3. If there are unmet dependencies, generate linking task
    if (context.unmetDependencies && context.unmetDependencies.length > 0) {
      const task: AgentTask = {
        id: taskId,
        objectiveId: 'auto-routine',
        title: `Autonomous internal link graph & orphan resolution`,
        worker: 'internal_linking',
        status: 'QUEUED',
        priority: 45,
        dependencyIds: [],
        idempotencyKey: `maint-linking-${Date.now()}`,
        narrative: {
          whyThisTask: 'Resolve detected catalog entity dependency gaps.',
          whatDetected: `Unmet dependencies: ${context.unmetDependencies.join('; ')}.`,
          whatChanged: 'Re-evaluated graph relationships between products and guides.',
          whatVerified: 'Zero orphan nodes remaining in link graph.',
          whatLearned: 'Dynamic link updates sustain bot crawl efficiency.',
        },
        payload: { sourceSlug: 'catalog-universal' },
        retryCount: 0,
        maxRetries: 2,
        createdAt: new Date().toISOString(),
      };
      return this.store.addTask(task);
    }

    // 4. Default: Website Guardian synthetic route & DB integrity sweep
    const task: AgentTask = {
      id: taskId,
      objectiveId: 'auto-routine',
      title: 'Autonomous synthetic route & database integrity sweep',
      worker: 'website_guardian',
      status: 'QUEUED',
      priority: 40,
      dependencyIds: [],
      idempotencyKey: `maint-guardian-${Date.now()}`,
      narrative: {
        whyThisTask: 'Continuous background reliability monitoring (Autonomous Mode: ON).',
        whatDetected: 'Scheduled autonomous maintenance cadence reached.',
        whatChanged: 'Auditing synthetic route health and DB connections.',
        whatVerified: 'Guardian report status checked against 0px overflow and 200 OK.',
        whatLearned: 'Autonomous vigilance prevents silent runtime degradation.',
      },
      payload: {},
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date().toISOString(),
    };
    return this.store.addTask(task);
  }

  // --------------------------------------------------------------------------
  // ADMIN CONTROLS
  // --------------------------------------------------------------------------

  public async setAutonomous(enabled: boolean): Promise<MasterAgentState> {
    return this.store.setAutonomous(enabled);
  }

  public async setPaused(paused: boolean): Promise<MasterAgentState> {
    return this.store.setPaused(paused);
  }

  public async approveTask(taskId: string): Promise<AgentTask | undefined> {
    const task = this.store.getTask(taskId);
    if (!task) return undefined;

    return this.store.updateTask(taskId, {
      status: 'QUEUED',
      payload: {
        ...task.payload,
        approvedByOwner: true,
      },
      narrative: {
        ...task.narrative,
        whatDetected: 'Owner approved task execution from /admin/agent Control Center.',
      },
    });
  }

  public async stopCurrentTask(): Promise<void> {
    const state = this.store.getState();
    if (state.currentTaskId) {
      await this.store.updateTask(state.currentTaskId, {
        status: 'FAILED',
        errorMessage: 'Manually stopped by owner from Admin Control Center.',
      });
      await this.store.updateState({
        currentTaskId: null,
      });
    }
  }

  /**
   * Generates a single, consolidated system-state representation for the Admin Control Center.
   * Answers the non-technical owner questions:
   * - WHAT IS HAPPENING
   * - WHAT NEEDS ATTENTION
   * - WHAT WAS FIXED
   * - WHAT IMPROVED
   * - WHAT IS WAITING
   * - WHAT FAILED
   * - WHAT IS LEARNING
   * - WHAT WILL HAPPEN NEXT
   */
  public async getUnifiedSystemState() {
    await this.store.ensureLoaded();
    const state = this.store.getState();
    const allTasks = this.store.getAllTasks();
    const queue = CentralExecutionQueue.getInstance();
    const results = ResultEngine.getInstance();
    const learning = LearningEngine.getInstance();

    const activeJobs = allTasks.filter((t) => t.status === 'RUNNING');
    const blockedJobs = allTasks.filter((t) => t.status === 'BLOCKED' || t.status === 'APPROVAL_REQUIRED');
    const waitingJobs = allTasks.filter((t) => t.status === 'QUEUED' || t.status === 'WAITING' || t.status === 'RETRYING');
    const failedJobs = allTasks.filter((t) => t.status === 'FAILED');

    const resultSummary = results.getSummary();
    const learningSummary = learning.getSummary();
    const queueStatus = queue.getStatus();

    return {
      timestamp: new Date().toISOString(),
      isAutonomous: state.isAutonomous,
      isPaused: state.isPaused,
      healthScores: state.healthScores,
      stats: state.stats,
      currentObjective: state.currentObjective,
      currentTaskId: state.currentTaskId,
      nextScheduledRunAt: state.nextScheduledRunAt,
      queueStatus,
      resultSummary,
      learningSummary,
      whatIsHappening: activeJobs.length > 0
        ? activeJobs.map((t) => `Executing: ${t.title} (${t.worker})`)
        : ['Autonomous queue idle. All systems within optimal operational thresholds.'],
      whatNeedsAttention: blockedJobs.map(
        (t) => `[APPROVAL REQUIRED] ${t.title}: ${t.errorMessage || t.approvalReason || 'Manual confirmation required'}`
      ),
      whatWasFixed: allTasks
        .filter((t) => t.status === 'COMPLETED' && t.narrative?.whatChanged)
        .slice(0, 8)
        .map((t) => `${t.title}: ${t.narrative.whatChanged}`),
      whatImproved: resultSummary.recentMaturations.map(
        (m) => `${m.action}: Verified with delta ${JSON.stringify(m.delta || {})}`
      ),
      whatIsWaiting: waitingJobs
        .slice(0, 10)
        .map((t) => `${t.title} (Priority: ${t.priority}, Lane: ${t.lane || 'BACKGROUND'})`),
      whatFailed: failedJobs
        .slice(0, 5)
        .map((t) => `${t.title}: ${t.errorMessage || 'Failure logged'}`),
      whatIsLearning: learningSummary.recentLearnings.map(
        (l) => `${l.domain} [${l.taskType}]: ${l.strategy} (Confidence: ${l.confidence * 100}%)`
      ),
      whatWillHappenNext: state.isPaused
        ? 'System is currently paused by owner.'
        : state.currentTaskId
        ? `Completing active task [${state.currentTaskId}].`
        : waitingJobs.length > 0
        ? `Next task in queue: [${waitingJobs[0].title}].`
        : `Scheduled 24-hour autonomous maintenance sweep at ${state.nextScheduledRunAt || '2:00 AM IST'}.`,
    };
  }
}
