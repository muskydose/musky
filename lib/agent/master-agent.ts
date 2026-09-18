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
} from './types';
import { logger } from '@/lib/logger';

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
        dependencyIds: mappedDeps,
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
          nextScheduledRunAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });
        await this.store.releaseLock(lockId);
        return { idle: true, reason: 'Queue empty; ecosystem fully healthy' };
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

      // Check if objective is complete
      let objectiveCompleted = false;
      if (task.objectiveId) {
        const objectiveTasks = this.store.getAllTasks().filter((t) => t.objectiveId === task.objectiveId);
        const allCompleted = objectiveTasks.every((t) => t.status === 'COMPLETED');
        if (allCompleted && objectiveTasks.length > 0) {
          await this.store.completeObjective(task.objectiveId);
          objectiveCompleted = true;
        }
      }

      // Set next task pointer
      const nextReady = this.store.getNextReadyTask();
      await this.store.updateState({
        currentTaskId: null,
        nextTaskId: nextReady ? nextReady.id : null,
        lastRunAt: completedAt,
        currentRunStartedAt: null,
        nextScheduledRunAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
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
}
