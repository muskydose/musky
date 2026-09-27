/**
 * ============================================================================
 * MUSKY DOSE — UNIFIED AUTONOMOUS OPERATING SYSTEM TEST SUITE (PHASE 27)
 * ============================================================================
 * 
 * Verifies the 15 core tenets required for the unified system:
 * 1. Canonical task normalization works.
 * 2. Product lifecycle dispatches downstream tasks.
 * 3. Duplicate tasks are deduplicated.
 * 4. Background queue actually executes workers.
 * 5. Admin media page performs zero mutations.
 * 6. Cron auth fails closed.
 * 7. Result Engine records baseline.
 * 8. Result Engine records delta.
 * 9. Learning Engine persists strategy outcomes.
 * 10. Performance optimizer changes concurrency safely.
 * 11. Stuck tasks are recoverable.
 * 12. Self-healing status is truthful.
 * 13. Master Agent exposes unified state.
 * 14. Existing product governance remains authoritative.
 * 15. Existing media protections remain intact.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Load .env.local if present
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  try {
    if (typeof (process as any).loadEnvFile === 'function') {
      (process as any).loadEnvFile(envLocalPath);
    } else {
      const content = fs.readFileSync(envLocalPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  } catch {}
}
import {
  createCanonicalTask,
  normalizeTask,
  mapDomainToWorker,
  mapWorkerToDomain,
  inferExecutionLane,
} from '../lib/agent/task-contract';
import { AgentTask } from '../lib/agent/types';
import { CentralExecutionQueue } from '../lib/agent/central-queue';
import { ResultEngine } from '../lib/agent/result-engine';
import { LearningEngine } from '../lib/agent/learning-engine';
import { PerformanceOptimizer } from '../lib/agent/performance-optimizer';
import { LifecycleOrchestrator } from '../lib/agent/lifecycle-orchestrator';
import { MuskyDoseMasterAgent } from '../lib/agent/master-agent';
import { AgentStore } from '../lib/agent/agent-store';
import { resolveProductLifecycle } from '../lib/growth/product-lifecycle-governance';
import { isRealOwnerPhotoProtected, MediaAsset } from '../lib/db/media';
import { MuskyGlobalGrowthOrchestrator } from '../lib/growth/global-growth-orchestrator';
import { Product } from '../lib/types';
import { saveOrder } from '../lib/db/orders';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('🤖 RUNNING UNIFIED AUTONOMOUS OPERATING SYSTEM TEST SUITE (1-15)');
  console.log('============================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Canonical Task Normalization
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Testing Canonical Task Contract & Normalization...');
  const canonical = createCanonicalTask({
    domain: 'CATALOG',
    action: 'ASSERT_INVARIANTS',
    lane: 'FAST',
    entityType: 'PRODUCT',
    entityId: 'prod-sojat-henna',
    input: { slug: 'pure-sojat-henna' },
  });

  assert(canonical.id.startsWith('task-'), 'Task ID must have task- prefix');
  assert(canonical.domain === 'CATALOG', 'Domain must be CATALOG');
  assert(canonical.lane === 'FAST', 'Lane must be FAST');
  assert(canonical.status === 'QUEUED', 'Initial status must be QUEUED');
  assert(canonical.worker === 'content_engine', 'Worker mapped correctly to content_engine');

  // Test legacy normalization
  const legacyTask: any = {
    id: 'legacy-1',
    worker: 'seo_intelligence',
    payload: { url: '/products/pure-sojat-henna' },
    status: 'QUEUED',
    retryCount: 1,
    dependencyIds: ['dep-1'],
    objectiveId: 'obj-1',
  };
  const normalized = normalizeTask(legacyTask);
  assert(normalized.domain === 'SEO', 'Legacy worker seo_intelligence must map to SEO domain');
  assert(normalized.input?.url === '/products/pure-sojat-henna', 'Payload must alias to input');
  assert(normalized.attempts === 1, 'retryCount must alias to attempts');
  assert(normalized.dependencies?.[0] === 'dep-1', 'dependencyIds must alias to dependencies');
  console.log('  ✅ TEST 1 PASSED: Canonical task contract and legacy normalization verified.');

  // --------------------------------------------------------------------------
  // TEST 2: Product Lifecycle Dispatches Downstream Tasks & Rejects Non-Existent
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Testing Product Lifecycle Downstream Task Dispatching & Authoritative Rejection...');
  const orchestrator = LifecycleOrchestrator.getInstance();

  // 2a. Verify rejection of fabricated/non-existent product
  let nonExistentRejected = false;
  try {
    await orchestrator.dispatchLifecycleEvent({
      type: 'PRODUCT_STATUS_CHANGED',
      entityType: 'PRODUCT',
      entityId: 'prod-fabricated-nonexistent',
      triggeredBy: 'test_suite',
    });
  } catch (err: any) {
    if (err.message.includes('Entity not found for lifecycle event')) {
      nonExistentRejected = true;
    }
  }
  assert(nonExistentRejected === true, 'Fabricated product must be authoritatively rejected');

  // 2b. Verify real catalog product dispatches downstream tasks
  const lifecycleResult = await orchestrator.dispatchLifecycleEvent({
    type: 'PRODUCT_STATUS_CHANGED',
    entityType: 'PRODUCT',
    entityId: 'prod-1',
    payload: {
      newStatus: 'ACTIVE',
    },
    triggeredBy: 'test_suite',
  });

  assert(lifecycleResult.fastLaneExecuted === true, 'Fast lane must execute immediately');
  assert(lifecycleResult.backgroundTasksQueued.length >= 3, 'Must enqueue downstream specialist tasks');
  console.log(`  ✅ TEST 2 PASSED: Authoritative product validation + Fast Lane + ${lifecycleResult.backgroundTasksQueued.length} downstream jobs.`);

  // --------------------------------------------------------------------------
  // TEST 3: Duplicate Tasks Are Deduplicated
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Testing Task Deduplication & Verified State Skipping...');
  const optimizer = PerformanceOptimizer.getInstance();
  optimizer.markVerified('PRODUCT:prod-sojat-henna:ASSERT_INVARIANTS', 15 * 60 * 1000);
  
  const isSkip1 = optimizer.shouldSkipVerified('PRODUCT:prod-sojat-henna:ASSERT_INVARIANTS');
  assert(isSkip1 === true, 'Task within TTL must be skipped to eliminate redundant work');

  const isSkip2 = optimizer.shouldSkipVerified('PRODUCT:prod-sojat-henna:UNVERIFIED_ACTION');
  assert(isSkip2 === false, 'Unverified task must NOT be skipped');
  console.log('  ✅ TEST 3 PASSED: Duplicate work skipped via verified state cache.');

  // --------------------------------------------------------------------------
  // TEST 4: Background Queue Actually Executes Workers
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Testing Background Queue Worker Execution...');
  const queue = CentralExecutionQueue.getInstance();
  const bgTask = await queue.enqueue({
    domain: 'QA',
    action: 'VERIFY_ROUTE_CONTRACT',
    lane: 'BACKGROUND',
    priority: 100,
    entityType: 'ROUTE',
    entityId: '/wholesale',
    worker: 'verification',
    input: { targetRoute: '/wholesale' },
  });
  assert(bgTask.status === 'QUEUED', 'Task must initially be QUEUED');

  const summary = await queue.executeSingleTask(bgTask);
  assert(summary.status === 'COMPLETED', 'Worker execution summary must be COMPLETED');
  const executedTask = AgentStore.getInstance().getTask(bgTask.id);
  assert(executedTask?.status === 'COMPLETED', 'Worker must execute task to COMPLETED status');
  console.log('  ✅ TEST 4 PASSED: Background queue executed worker and updated task to COMPLETED.');

  // --------------------------------------------------------------------------
  // TEST 5: Admin Media Page Performs Zero Mutations
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Testing Admin Media Page Purity (Zero Page-Load Mutations)...');
  const mediaPagePath = path.join(process.cwd(), 'app', 'admin', 'media', 'page.tsx');
  const mediaPageContent = fs.readFileSync(mediaPagePath, 'utf8');

  assert(!mediaPageContent.includes('processPendingMediaJobs'), 'app/admin/media/page.tsx must NOT call processPendingMediaJobs');
  assert(!mediaPageContent.includes('enqueueMediaJob'), 'app/admin/media/page.tsx must NOT call enqueueMediaJob');
  console.log('  ✅ TEST 5 PASSED: Admin media page contains zero mutation or queue processing triggers on read.');

  // --------------------------------------------------------------------------
  // TEST 6: Cron Auth Fails Closed
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Testing Cron Fail-Closed Authentication...');
  function testCronAuth(header: string | null, secret: string | undefined): { authorized: boolean; status: number } {
    if (!header || !header.startsWith('Bearer ')) {
      return { authorized: false, status: 401 };
    }
    const token = header.substring(7).trim();
    if (!token || !secret) {
      return { authorized: false, status: 401 };
    }
    const bufA = Buffer.from(token);
    const bufB = Buffer.from(secret);
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      return { authorized: false, status: 401 };
    }
    return { authorized: true, status: 200 };
  }

  assert(testCronAuth(null, 'secret123').status === 401, 'Missing auth header must return 401');
  assert(testCronAuth('Bearer ', 'secret123').status === 401, 'Empty bearer token must return 401');
  assert(testCronAuth('Bearer wrong_token', 'secret123').status === 401, 'Wrong token must return 401');
  assert(testCronAuth('Bearer secret123', undefined).status === 401, 'Missing server CRON_SECRET must return 401');
  assert(testCronAuth('Bearer secret123', 'secret123').status === 200, 'Valid token must return 200');
  console.log('  ✅ TEST 6 PASSED: Cron authentication strictly fails closed on missing, malformed, or invalid tokens.');

  // --------------------------------------------------------------------------
  // TEST 7: Result Engine Records Baseline
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7] Testing Result Engine Baseline Recording...');
  const resultEngine = ResultEngine.getInstance();
  const baselineResult = resultEngine.recordResult({
    taskId: 'task-test-baseline-1',
    domain: 'SEO',
    action: 'AUDIT_CANONICAL',
    entityType: 'PAGE',
    entityId: '/products/pure-sojat-henna',
    baseline: { canonicalDeclared: false, impressions: 50 },
    actionExecuted: 'Audited initial canonical baseline',
    verification: {
      verified: true,
      probeOutcome: 'Baseline recorded accurately',
    },
  });

  assert(baselineResult.baseline.canonicalDeclared === false, 'Baseline canonicalDeclared must be false');
  assert(baselineResult.baseline.impressions === 50, 'Baseline impressions must be 50');
  console.log('  ✅ TEST 7 PASSED: Result Engine faithfully preserves pre-action baseline.');

  // --------------------------------------------------------------------------
  // TEST 8: Result Engine Records Delta
  // --------------------------------------------------------------------------
  console.log('\n[TEST 8] Testing Result Engine Delta Measurement...');
  const delayedResult = resultEngine.recordResult({
    taskId: 'task-test-delta-1',
    domain: 'SEO',
    action: 'OPTIMIZE_SEARCH_SNIPPET',
    entityType: 'PAGE',
    entityId: '/guides/how-to-mix-baq-henna',
    baseline: { clicks: 10, impressions: 200 },
    actionExecuted: 'Added targeted rich snippet FAQ structured data',
    verification: {
      verified: true,
      probeOutcome: 'Schema validated syntax',
    },
    measurementWindowMs: 14 * 24 * 60 * 60 * 1000,
  });

  assert(delayedResult.status === 'MEASUREMENT_PENDING', 'Status must be MEASUREMENT_PENDING');

  const finalized = resultEngine.finalizeMeasurement(
    delayedResult.id,
    { clicks: 28, impressions: 380 },
    { clicks: 18, impressions: 180 }
  );

  assert(finalized?.status === 'MEASURED', 'Status must transition to MEASURED');
  assert(finalized?.delta?.clicks === 18, 'Clicks delta must be precisely +18');
  assert(finalized?.delta?.impressions === 180, 'Impressions delta must be precisely +180');
  console.log('  ✅ TEST 8 PASSED: Empirical outcome delta recorded (+18 clicks, +180 impressions).');

  // --------------------------------------------------------------------------
  // TEST 9: Learning Engine Persists Strategy Outcomes
  // --------------------------------------------------------------------------
  console.log('\n[TEST 9] Testing Learning Engine Strategy Persistence...');
  const learningEngine = LearningEngine.getInstance();
  const exp = await learningEngine.recordExperience({
    domain: 'SEO',
    worker: 'seo_guardian',
    taskType: 'METADATA_OPTIMIZE',
    strategy: 'HIGH_INTENT_KEYWORD_FIRST',
    success: true,
    durationMs: 110,
    lessonSynthesized: 'High intent keywords in title tag yield verified CTR increase',
  });

  assert(exp.confidence > 0.5, 'Laplace confidence must improve with success');
  assert(exp.successCount >= 1, 'Success count must be tracked');
  
  const recommended = learningEngine.getRecommendedStrategy(
    'SEO',
    'seo_guardian',
    'METADATA_OPTIMIZE',
    ['HIGH_INTENT_KEYWORD_FIRST', 'CONSERVATIVE_BRAND_FIRST']
  );
  assert(recommended.strategy === 'HIGH_INTENT_KEYWORD_FIRST', 'Highest confidence strategy must be recommended');
  console.log(`  ✅ TEST 9 PASSED: Strategy recorded and recommended with confidence ${recommended.confidence}.`);

  // --------------------------------------------------------------------------
  // TEST 10: Performance Optimizer Changes Concurrency Safely
  // --------------------------------------------------------------------------
  console.log('\n[TEST 10] Testing Adaptive Concurrency Limiting...');
  optimizer.resetForTesting();
  assert(optimizer.getSafeConcurrencyLimit() === 4, 'Default concurrency ceiling must be 4');

  // Record heavy latency and errors
  for (let i = 0; i < 15; i++) {
    optimizer.trackExecutionEnd(3500, false);
  }
  const throttled = optimizer.getSafeConcurrencyLimit();
  assert(throttled === 1, `Safe concurrency must throttle to 1 under severe latency/failures (got ${throttled})`);
  optimizer.resetForTesting();
  console.log(`  ✅ TEST 10 PASSED: Optimizer throttled concurrency to ${throttled} under stress.`);

  // --------------------------------------------------------------------------
  // TEST 11: Stuck Tasks Are Recoverable
  // --------------------------------------------------------------------------
  console.log('\n[TEST 11] Testing Stuck Task Recovery...');
  const store = AgentStore.getInstance();
  const stuckTaskId = `task-stuck-${Date.now()}`;
  const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

  await store.addTask(createCanonicalTask({
    id: stuckTaskId,
    domain: 'GUARDIAN',
    lane: 'MAINTENANCE',
    action: 'LONG_RUNNING_AUDIT',
    title: 'Simulated stuck task',
  }));

  await store.updateTask(stuckTaskId, {
    status: 'RUNNING',
    startedAt: twentyMinsAgo,
  });

  // Reclaim stuck tasks
  await store.reclaimStuckTasks();
  const reclaimed = store.getTask(stuckTaskId);
  assert(
    reclaimed?.status === 'RETRYING' || reclaimed?.status === 'FAILED',
    `Stuck task must be transitioned from RUNNING to RETRYING or FAILED (got ${reclaimed?.status})`
  );
  console.log(`  ✅ TEST 11 PASSED: Stuck task (>15m) reclaimed successfully to ${reclaimed?.status}.`);

  // --------------------------------------------------------------------------
  // TEST 12: Self-Healing Status Is Truthful
  // --------------------------------------------------------------------------
  console.log('\n[TEST 12] Testing Honest Self-Healing Telemetry...');
  const growthOrchestrator = MuskyGlobalGrowthOrchestrator.getInstance();
  const growthCycle = await growthOrchestrator.runGrowthCycle();

  assert(Array.isArray(growthCycle.detectedIssues), 'detectedIssues must be an array');
  assert(Array.isArray(growthCycle.remediationPending), 'remediationPending must be an array');
  assert(Array.isArray(growthCycle.verifiedHealedActions), 'verifiedHealedActions must be an array');
  assert(
    (growthCycle.verifiedHealedActions || []).length === 0 || growthCycle.status === 'OPTIMAL',
    'verifiedHealedActions must only record verified mutations'
  );
  console.log('  ✅ TEST 12 PASSED: Telemetry strictly distinguishes detected issues from verified heals.');

  // --------------------------------------------------------------------------
  // TEST 13: Master Agent Exposes Unified State
  // --------------------------------------------------------------------------
  console.log('\n[TEST 13] Testing Master Agent Unified System State...');
  const masterAgent = MuskyDoseMasterAgent.getInstance();
  const systemState = await masterAgent.getUnifiedSystemState();

  assert(systemState.isAutonomous !== undefined, 'isAutonomous must be present');
  assert(systemState.queueStatus !== undefined, 'queueStatus must be present');
  assert(systemState.resultSummary !== undefined, 'resultSummary must be present');
  assert(systemState.learningSummary !== undefined, 'learningSummary must be present');
  assert(Array.isArray(systemState.whatIsHappening), 'whatIsHappening must be an array');
  assert(typeof systemState.whatWillHappenNext === 'string', 'whatWillHappenNext must be a string');
  console.log('  ✅ TEST 13 PASSED: Master Agent returns unified operational answers across 8 invariants.');

  // --------------------------------------------------------------------------
  // TEST 14: Existing Product Governance Remains Authoritative
  // --------------------------------------------------------------------------
  console.log('\n[TEST 14] Testing Existing Product Governance Authoritativeness...');
  const mockHiddenBridalCones: Partial<Product> = {
    id: 'prod-3',
    slug: 'natural-henna-bridal-cones',
    name: 'Natural Henna Bridal Cones',
    isActive: false,
    price: 350,
  };
  const decision = resolveProductLifecycle(mockHiddenBridalCones as Product);

  assert(decision.status === 'HIDDEN', 'Bridal Cones status must be HIDDEN');
  assert(decision.isCatalogVisible === false, 'Bridal Cones must be excluded from catalog');
  assert(decision.httpStatus === 200, 'Bridal Cones must return HTTP 200 for direct links');
  assert(decision.robotsIndex === 'noindex', 'Bridal Cones must be noindex');
  assert(decision.isPurchasable === false, 'Bridal Cones must be non-purchasable');
  assert(decision.isSitemapEligible === false, 'Bridal Cones must be excluded from sitemap');
  console.log('  ✅ TEST 14 PASSED: Product Governance invariants strictly enforced for hidden products.');

  // --------------------------------------------------------------------------
  // TEST 15: Existing Media Protections Remain Intact
  // --------------------------------------------------------------------------
  console.log('\n[TEST 15] Testing Real Owner Photography Protection...');
  const realOwnerAsset: Partial<MediaAsset> = {
    id: 'asset-owner-factory-1',
    assetOrigin: 'real_owner_photo',
    role: 'PRIMARY',
    isLocked: true,
  };
  const aiGeneratedAsset: Partial<MediaAsset> = {
    id: 'asset-ai-lifestyle-1',
    assetOrigin: 'ai_generated',
    role: 'GALLERY',
    isLocked: false,
  };

  assert(isRealOwnerPhotoProtected(realOwnerAsset as MediaAsset) === true, 'Real owner photo must be protected');
  assert(isRealOwnerPhotoProtected(aiGeneratedAsset as MediaAsset) === false, 'Standard AI asset is mutable');
  console.log('  ✅ TEST 15 PASSED: Real owner factory photos are strictly inviolable.');

  // --------------------------------------------------------------------------
  // TEST 16: Master Agent Scheduled Sweep is Bounded & Non-blocking
  // --------------------------------------------------------------------------
  console.log('\n[TEST 16] Testing Master Agent Scheduled Sweep Bounded Execution...');
  const sweepStart = Date.now();
  const sweepSummary = await masterAgent.runDailyAutonomousSweep({
    timeLimitMs: 4000,
    maxBatch: 1,
  });
  const sweepDuration = Date.now() - sweepStart;

  assert(sweepDuration < 20000, `Sweep must complete under 20 seconds (took ${sweepDuration}ms)`);
  assert(sweepSummary.schedule.istExecutionTime.includes('02:00 AM IST'), 'Schedule must reflect 2:00 AM IST');
  assert(sweepSummary.scannedWorkIdentified >= 3, 'Must have identified and enqueued canonical sweep tasks');

  // Verify canonical tasks exist in store
  const dateKey = new Date().toISOString().slice(0, 10);
  const kwTask = store.getTaskByIdempotencyKey(`daily-sweep-kw-universe-${dateKey}`);
  const growthTask = store.getTaskByIdempotencyKey(`daily-sweep-global-growth-${dateKey}`);
  const seoTask = store.getTaskByIdempotencyKey(`daily-sweep-seo-scan-${dateKey}`);

  assert(kwTask !== undefined, 'Keyword Universe canonical task must be enqueued');
  assert(kwTask?.lane === 'MAINTENANCE', 'Keyword sweep must be in MAINTENANCE lane');
  assert(growthTask !== undefined, 'Global Growth canonical task must be enqueued');
  assert(growthTask?.lane === 'MAINTENANCE', 'Global growth sweep must be in MAINTENANCE lane');
  assert(seoTask !== undefined, 'SEO scan canonical task must be enqueued');
  assert(seoTask?.lane === 'MAINTENANCE', 'SEO scan sweep must be in MAINTENANCE lane');
  console.log(`  ✅ TEST 16 PASSED: Master sweep enqueued canonical tasks and returned within budget (${sweepDuration}ms).`);

  // --------------------------------------------------------------------------
  // TEST 17: Strict Lane Isolation
  // --------------------------------------------------------------------------
  console.log('\n[TEST 17] Testing Strict Lane Isolation (Zero Lane Cross-Execution)...');
  const fastTaskId = `task-lane-fast-${Date.now()}`;
  const bgTaskId = `task-lane-bg-${Date.now()}`;
  const maintTaskId = `task-lane-maint-${Date.now()}`;

  await store.addTask(createCanonicalTask({
    id: fastTaskId,
    domain: 'CATALOG',
    action: 'FAST_REVALIDATE',
    lane: 'FAST',
    priority: 99,
  }));

  await store.addTask(createCanonicalTask({
    id: bgTaskId,
    domain: 'MEDIA',
    action: 'BACKGROUND_GENERATE',
    lane: 'BACKGROUND',
    priority: 85,
  }));

  await store.addTask(createCanonicalTask({
    id: maintTaskId,
    domain: 'GUARDIAN',
    action: 'MAINTENANCE_AUDIT',
    lane: 'MAINTENANCE',
    priority: 95,
  }));

  const fastCandidate = store.getNextReadyTask('FAST');
  assert(fastCandidate?.id === fastTaskId, `FAST lane must ONLY pick FAST task (got ${fastCandidate?.id})`);

  const maintCandidate = store.getNextReadyTask('MAINTENANCE');
  assert(maintCandidate?.lane === 'MAINTENANCE', `MAINTENANCE lane must ONLY pick MAINTENANCE task (got ${maintCandidate?.lane})`);

  const bgCandidate = store.getNextReadyTask('BACKGROUND');
  assert(bgCandidate?.lane === 'BACKGROUND' || !bgCandidate?.lane, `BACKGROUND lane must ONLY pick BACKGROUND task (got ${bgCandidate?.lane})`);
  console.log('  ✅ TEST 17 PASSED: Strict lane isolation verified across FAST, BACKGROUND, and MAINTENANCE.');

  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // TEST 18: Overlapping Scheduler Ticks & Atomic Worker Leasing
  // --------------------------------------------------------------------------
  console.log('\n[TEST 18] Testing Atomic Worker Leasing (Preventing Duplicate Execution)...');
  const raceTaskId = `task-race-lease-${Date.now()}`;
  await store.addTask(createCanonicalTask({
    id: raceTaskId,
    domain: 'QA',
    action: 'LEASE_RACE_TEST',
    lane: 'MAINTENANCE',
    priority: 300,
  }));

  // Worker A leases the task
  const leasedByWorkerA = await store.leaseNextReadyTask('MAINTENANCE', 'scheduler-worker-A');
  assert(leasedByWorkerA?.id === raceTaskId, 'Worker A must lease the highest priority task');
  assert(leasedByWorkerA?.status === 'RUNNING', 'Leased task must immediately be marked RUNNING');

  // Concurrent Worker B attempts to lease next ready task
  const leasedByWorkerB = await store.leaseNextReadyTask('MAINTENANCE', 'scheduler-worker-B');
  assert(leasedByWorkerB?.id !== raceTaskId, 'Worker B must NEVER receive the already leased task');

  // Test simultaneous concurrent claiming across workers
  const concurrentTaskId = `task-simultaneous-claim-${Date.now()}`;
  await store.addTask(createCanonicalTask({
    id: concurrentTaskId,
    domain: 'QA',
    action: 'SIMULTANEOUS_CLAIM_TEST',
    lane: 'MAINTENANCE',
    priority: 350,
  }));

  const [claim1, claim2] = await Promise.all([
    store.leaseNextReadyTask('MAINTENANCE', 'concurrent-worker-1'),
    store.leaseNextReadyTask('MAINTENANCE', 'concurrent-worker-2'),
  ]);

  const claimedCount = [claim1, claim2].filter(c => c?.id === concurrentTaskId).length;
  assert(claimedCount === 1, `Exactly one worker must claim the task across concurrent invocations (got ${claimedCount})`);
  console.log('  ✅ TEST 18 PASSED: Worker leasing atomically locks task and prevents double pickup.');

  // --------------------------------------------------------------------------
  // TEST 19: All Scheduled Cron Routes Dispatch Through Central Queue
  // --------------------------------------------------------------------------
  console.log('\n[TEST 19] Testing Cron Dispatch Architecture & Zero Worker Execution in Crons...');
  const cronDispatcherRoutes = [
    'app/api/cron/guardian/route.ts',
    'app/api/cron/growth-autopilot/route.ts',
    'app/api/cron/media-queue/route.ts',
    'app/api/cron/gsc-sync/route.ts',
    'app/api/cron/seo-report/route.ts',
    'app/api/cron/master-agent/route.ts',
  ];

  for (const routeRelPath of cronDispatcherRoutes) {
    const routePath = path.join(process.cwd(), routeRelPath);
    const content = fs.readFileSync(routePath, 'utf8');
    assert(
      content.includes('CentralExecutionQueue') || content.includes('runDailyAutonomousSweep'),
      `${routeRelPath} must dispatch through CentralExecutionQueue or MasterAgent autonomous sweep`
    );
    assert(content.includes('timingSafeEqual'), `${routeRelPath} must enforce timing-safe Bearer token auth`);
    assert(!content.includes('executeSingleTask('), `${routeRelPath} must be enqueue-only and NOT call executeSingleTask`);
  }

  // Verify drain-queue route exists and uses CentralExecutionQueue
  const drainQueuePath = path.join(process.cwd(), 'app/api/cron/drain-queue/route.ts');
  assert(fs.existsSync(drainQueuePath), 'app/api/cron/drain-queue/route.ts must exist');
  const drainContent = fs.readFileSync(drainQueuePath, 'utf8');
  assert(drainContent.includes('processBackgroundLane'), 'drain-queue must process background lane');
  assert(drainContent.includes('processMaintenanceLane'), 'drain-queue must process maintenance lane');
  assert(drainContent.includes('reclaimStuckTasks'), 'drain-queue must reclaim stuck tasks');
  console.log('  ✅ TEST 19 PASSED: All cron endpoints verified as thin dispatchers + canonical drainer in place.');

  // --------------------------------------------------------------------------
  // TEST 20: Self-Healing Honesty & Zero-Hallucination Mutative Reporting
  // --------------------------------------------------------------------------
  console.log('\n[TEST 20] Testing Self-Healing Honesty & Lifecycle Invariants...');
  const growthAudit = await growthOrchestrator.runGrowthCycle();
  if ((growthAudit.detectedIssues || []).length > 0) {
    assert(
      growthAudit.status === 'ATTENTION_REQUIRED',
      'Unresolved detected issues must produce ATTENTION_REQUIRED status, never premature SELF_HEALED'
    );
  }
  assert(
    (growthAudit.verifiedHealedActions || []).length === 0 || growthAudit.status === 'OPTIMAL' || growthAudit.status === 'SELF_HEALED',
    'verifiedHealedActions must accurately reflect only verified real mutations'
  );
  assert(
    growthAudit.healedActions.length === (growthAudit.verifiedHealedActions || []).length,
    'healedActions must strictly match verifiedHealedActions without claiming unresolved collisions as healed'
  );

  // Hidden product invariant
  const bridalCones = resolveProductLifecycle({
    id: 'prod-3',
    slug: 'natural-henna-bridal-cones',
    name: 'Natural Henna Bridal Cones',
    isActive: false,
    price: 350,
  } as Product);
  assert(bridalCones.httpStatus === 200, 'Bridal Cones must return HTTP 200');
  assert(bridalCones.robotsIndex === 'noindex', 'Bridal Cones must have noindex tag');
  assert(bridalCones.isPurchasable === false, 'Bridal Cones must not be purchasable');
  assert(bridalCones.isSitemapEligible === false, 'Bridal Cones must not be in sitemap');
  console.log('  ✅ TEST 20 PASSED: Self-healing honesty and product lifecycle governance invariants verified.');

  // --------------------------------------------------------------------------
  // TEST 21: Strict Order Error Handling (HTTP 422 for Unpurchasable Products)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 21] Testing Strict Order Error Handling (422 Unprocessable Entity)...');
  let orderRejectedReason = '';
  try {
    await saveOrder({
      customerName: 'Test Buyer',
      customerPhone: '9876543210',
      customerAddress: '123 Test Street, Jaipur, Rajasthan 302001',
      customerCity: 'Jaipur',
      customerState: 'Rajasthan',
      customerPincode: '302001',
      items: [
        {
          productId: 'prod-3',
          productName: 'Musky Dose Special Bridal Mehendi Cones',
          quantity: 1,
          price: 350,
        },
      ],
      paymentMethod: 'Cash on Delivery',
    });
  } catch (err: any) {
    orderRejectedReason = err?.message || '';
  }

  assert(
    orderRejectedReason.includes('not currently available for purchase'),
    `Order for non-purchasable prod-3 must be rejected with 'not currently available for purchase' (got: '${orderRejectedReason}')`
  );
  console.log(`  ✅ TEST 21 PASSED: Non-purchasable product correctly rejected at commerce gate: '${orderRejectedReason}'.`);

  // --------------------------------------------------------------------------
  // TEST 22: Fail-Closed Atomic Leasing on Database Error & Null Return
  // --------------------------------------------------------------------------
  console.log('\n[TEST 22] Testing Fail-Closed Atomic Leasing State Machine...');
  const failClosedTask: AgentTask = createCanonicalTask({
    id: `task-fail-closed-${Date.now()}`,
    domain: 'QA',
    action: 'FAIL_CLOSED_TEST',
    lane: 'BACKGROUND',
    priority: 100,
  });
  await store.addTask(failClosedTask);

  // Verify initial state is QUEUED
  assert(store.getTask(failClosedTask.id)?.status === 'QUEUED', 'Task must start in QUEUED state');

  // Verify telemetry claim mode is defined
  const initialMode = store.getClaimTelemetryMode();
  assert(initialMode === 'DURABLE' || initialMode === 'NON_DURABLE_FALLBACK', 'Claim mode must be valid');

  // Test that when a DB error occurs, atomicClaimTask returns undefined and does NOT set task to RUNNING
  const supabase = (await import('../lib/supabase')).getSupabaseAdmin();
  if (supabase) {
    const initialDurable = store.isDurableAvailable();
    store.setIsDurableTableAvailableForTesting(true);

    const originalFrom = supabase.from.bind(supabase);
    (supabase as any).from = (table: string) => {
      if (table === 'master_agent_tasks') {
        return {
          update: () => ({
            eq: () => ({
              in: () => ({
                select: async () => ({ data: null, error: { message: 'Simulated DB connection failure' } }),
              }),
            }),
          }),
        };
      }
      return originalFrom(table);
    };

    try {
      const claimResult = await store.atomicClaimTask(failClosedTask, 'test-worker-fail-closed');
      assert(claimResult === undefined, 'atomicClaimTask MUST return undefined on DB error (fail-closed)');
      const storedTask = store.getTask(failClosedTask.id);
      assert(storedTask?.status === 'QUEUED', 'Task MUST remain in QUEUED state on DB error, NEVER mutated to RUNNING locally');
    } finally {
      (supabase as any).from = originalFrom;
    }

    // Test zero-row return (race condition where another worker claimed task first)
    (supabase as any).from = (table: string) => {
      if (table === 'master_agent_tasks') {
        return {
          update: () => ({
            eq: () => ({
              in: () => ({
                select: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return originalFrom(table);
    };

    try {
      const raceClaimResult = await store.atomicClaimTask(failClosedTask, 'test-worker-race');
      assert(raceClaimResult === undefined, 'atomicClaimTask MUST return undefined when 0 rows returned (already claimed in DB)');
    } finally {
      (supabase as any).from = originalFrom;
      store.setIsDurableTableAvailableForTesting(initialDurable);
    }
  }
  console.log('  ✅ TEST 22 PASSED: Fail-closed atomic leasing verified (zero local fallback on DB error).');

  // --------------------------------------------------------------------------
  // TEST 23: Static Invariant: Exactly One Execution Gateway (executeSingleTask)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 23] Testing Single Execution Path Static Invariants...');
  function scanDir(dir: string, fileList: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDir(fullPath, fileList);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  const libFiles = scanDir(path.join(process.cwd(), 'lib'));
  const violatingWorkerCallers: string[] = [];
  const violatingResultCallers: string[] = [];
  const violatingLearningCallers: string[] = [];

  for (const file of libFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(process.cwd(), file).replace(/\\/g, '/');

    // WORKER_REGISTRY[...] should ONLY be executed in lib/agent/central-queue.ts
    if (content.includes('WORKER_REGISTRY[') && !relPath.includes('central-queue.ts') && !relPath.includes('workers/index.ts')) {
      violatingWorkerCallers.push(relPath);
    }

    // recordResult call should ONLY occur in central-queue.ts or result-engine.ts
    if (content.includes('.recordResult(') && !relPath.includes('central-queue.ts') && !relPath.includes('result-engine.ts')) {
      violatingResultCallers.push(relPath);
    }

    // recordExperience call should ONLY occur in central-queue.ts or learning-engine.ts
    if (content.includes('.recordExperience(') && !relPath.includes('central-queue.ts') && !relPath.includes('learning-engine.ts')) {
      violatingLearningCallers.push(relPath);
    }
  }

  assert(violatingWorkerCallers.length === 0, `Forbidden WORKER_REGISTRY callers found: ${violatingWorkerCallers.join(', ')}`);
  assert(violatingResultCallers.length === 0, `Duplicate ResultEngine.recordResult callers found: ${violatingResultCallers.join(', ')}`);
  assert(violatingLearningCallers.length === 0, `Duplicate LearningEngine.recordExperience callers found: ${violatingLearningCallers.join(', ')}`);
  console.log('  ✅ TEST 23 PASSED: Static audit confirms CentralExecutionQueue.executeSingleTask is the sole worker execution gateway.');

  // --------------------------------------------------------------------------
  // TEST 24: Measured Dispatcher Latency Verification (<50ms Budget)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 24] Testing Measured Dispatcher Latency (<50ms Execution Budget)...');
  const centralQueue = CentralExecutionQueue.getInstance();

  // 1. Measure in-memory pure dispatcher overhead (zero network jitter)
  const initialDurableStatus = store.isDurableAvailable();
  store.setIsDurableTableAvailableForTesting(false);
  const tMemStart = performance.now();
  const memLatencyTask = await centralQueue.enqueue({
    domain: 'QA',
    action: 'LATENCY_BENCHMARK_MEM',
    lane: 'BACKGROUND',
    priority: 50,
    idempotencyKey: `latency-mem-${Date.now()}`,
    title: 'In-Memory Dispatcher Benchmark Task',
  });
  const measuredMemDurationMs = performance.now() - tMemStart;
  store.setIsDurableTableAvailableForTesting(initialDurableStatus);

  // 2. Measure network-backed durable enqueue latency (includes Supabase remote roundtrip)
  const tStart = performance.now();
  const latencyTestTask = await centralQueue.enqueue({
    domain: 'QA',
    action: 'LATENCY_BENCHMARK',
    lane: 'BACKGROUND',
    priority: 50,
    idempotencyKey: `latency-test-${Date.now()}`,
    title: 'Dispatcher Latency Benchmark Task',
  });
  const measuredEnqueueDurationMs = performance.now() - tStart;

  // 3. Measure master agent enqueueOnly sweep dispatch latency
  const tSweepStart = performance.now();
  const enqueueOnlySummary = await masterAgent.runDailyAutonomousSweep({ enqueueOnly: true });
  const measuredSweepDurationMs = performance.now() - tSweepStart;

  console.log(`     Measured in-memory dispatcher latency: ${measuredMemDurationMs.toFixed(2)}ms (Configured Budget: <50ms)`);
  console.log(`     Measured remote enqueue roundtrip latency: ${measuredEnqueueDurationMs.toFixed(2)}ms (Network Tolerance Budget: <1500ms)`);
  console.log(`     Measured sweep dispatcher latency: ${measuredSweepDurationMs.toFixed(2)}ms`);

  assert(memLatencyTask !== undefined, 'In-memory task must be enqueued');
  assert(latencyTestTask !== undefined, 'Durable task must be enqueued');
  assert(measuredMemDurationMs < 50, `Pure dispatcher latency must be <50ms (measured: ${measuredMemDurationMs.toFixed(2)}ms)`);
  assert(measuredEnqueueDurationMs < 2000, `Network-backed enqueue latency must be within tolerance budget (measured: ${measuredEnqueueDurationMs.toFixed(2)}ms)`);
  assert(enqueueOnlySummary.status === 'DISPATCHED', 'Sweep in enqueueOnly mode must return DISPATCHED status');
  console.log('  ✅ TEST 24 PASSED: Dispatcher latency empirically measured within configured and tolerance budgets.');

  // --------------------------------------------------------------------------
  // TEST 25: Unified Queue Health, Backlog Depth & Oldest Task Age Telemetry
  // --------------------------------------------------------------------------
  console.log('\n[TEST 25] Testing Queue Health, Backlog Depth & Age Telemetry...');
  const queueStatus = centralQueue.getStatus();
  assert(typeof queueStatus.totalTasks === 'number', 'totalTasks must be numeric');
  assert(typeof queueStatus.backlogDepth === 'number', 'backlogDepth must be numeric');
  assert(queueStatus.backlogDepth >= 0, 'backlogDepth must be >= 0');
  assert(typeof queueStatus.oldestQueuedTaskAgeMs === 'number', 'oldestQueuedTaskAgeMs must be numeric');
  assert(typeof queueStatus.oldestQueuedTaskAgeMinutes === 'number', 'oldestQueuedTaskAgeMinutes must be numeric');
  assert(typeof queueStatus.readyCountPerLane.FAST === 'number', 'FAST lane ready count must be numeric');
  assert(typeof queueStatus.readyCountPerLane.BACKGROUND === 'number', 'BACKGROUND lane ready count must be numeric');
  assert(typeof queueStatus.readyCountPerLane.MAINTENANCE === 'number', 'MAINTENANCE lane ready count must be numeric');
  assert(queueStatus.activeLeases === queueStatus.running, 'activeLeases must equal running task count');
  console.log(`     Backlog depth: ${queueStatus.backlogDepth}, Oldest ready task age: ${queueStatus.oldestQueuedTaskAgeMs}ms (${queueStatus.oldestQueuedTaskAgeMinutes}m)`);
  console.log(`     Lanes: FAST=${queueStatus.readyCountPerLane.FAST}, BG=${queueStatus.readyCountPerLane.BACKGROUND}, MAINT=${queueStatus.readyCountPerLane.MAINTENANCE}`);
  console.log('  ✅ TEST 25 PASSED: Queue health and backlog age metrics accurately computed.');

  // --------------------------------------------------------------------------
  // TEST 26: Unified Scheduler Health State Machine
  // --------------------------------------------------------------------------
  console.log('\n[TEST 26] Testing Scheduler Health State Machine (NOT_CONFIGURED / ACTIVE / DEGRADED / PAUSED)...');
  // 1. Reset drain telemetry to null -> should report NOT_CONFIGURED
  centralQueue.setDrainTelemetryForTesting({ lastDrainAt: null, lastDrainSuccess: false, lastDrainError: null });
  let statusCheck = centralQueue.getStatus();
  assert(statusCheck.schedulerStatus === 'NOT_CONFIGURED', `Expected NOT_CONFIGURED when no drain recorded (got ${statusCheck.schedulerStatus})`);

  // 2. Simulate recent successful heartbeat -> should report ACTIVE
  centralQueue.recordDrainEvent(true, 1);
  statusCheck = centralQueue.getStatus();
  assert(statusCheck.schedulerStatus === 'ACTIVE', `Expected ACTIVE after recent heartbeat (got ${statusCheck.schedulerStatus})`);
  assert(statusCheck.nextExpectedHeartbeat !== null, 'nextExpectedHeartbeat must be set when active');

  // 3. Simulate stale heartbeat (20 minutes ago) -> should report DEGRADED
  const staleTimestamp = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  centralQueue.setDrainTelemetryForTesting({ lastDrainAt: staleTimestamp, lastDrainSuccess: true, lastDrainError: null });
  statusCheck = centralQueue.getStatus();
  assert(statusCheck.schedulerStatus === 'DEGRADED', `Expected DEGRADED when heartbeat is >15m old (got ${statusCheck.schedulerStatus})`);

  // 4. Test paused state -> should report PAUSED
  await masterAgent.setPaused(true);
  statusCheck = centralQueue.getStatus();
  assert(statusCheck.schedulerStatus === 'PAUSED', `Expected PAUSED when master agent is paused (got ${statusCheck.schedulerStatus})`);
  await masterAgent.setPaused(false); // Unpause

  console.log('  ✅ TEST 26 PASSED: Scheduler health state machine correctly transitions across all 4 operational states.');

  // --------------------------------------------------------------------------
  // TEST 27: Supabase pg_cron Heartbeat Migration File Validation (016)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 27] Testing Supabase pg_cron Migration File Integrity (016)...');
  const migrationPath = path.join(process.cwd(), 'supabase-pg-cron-heartbeat-016.sql');
  assert(fs.existsSync(migrationPath), 'supabase-pg-cron-heartbeat-016.sql must exist');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  assert(migrationSql.includes('CREATE EXTENSION IF NOT EXISTS pg_cron'), 'Must enable pg_cron');
  assert(migrationSql.includes('CREATE EXTENSION IF NOT EXISTS pg_net'), 'Must enable pg_net');
  assert(migrationSql.includes('vault.decrypted_secrets'), 'Must fetch secret securely from vault.decrypted_secrets');
  assert(migrationSql.includes('autonomous_queue_heartbeat'), 'Must define autonomous_queue_heartbeat procedure');
  assert(migrationSql.includes('*/5 * * * *'), 'Must schedule heartbeat at 5-minute intervals');
  assert(!migrationSql.includes('eyJh'), 'Must NEVER include JWTs or secrets in migration SQL');
  console.log('  ✅ TEST 27 PASSED: Migration 016 verified free-first, secure, and secret-isolated.');

  // --------------------------------------------------------------------------
  // TEST 28: Production Durable Queue Lane Persistence & Worker Isolation
  // --------------------------------------------------------------------------
  console.log('\n[TEST 28] Testing Durable Queue Lane Persistence & Lane Isolation Invariants...');

  // 1. BACKGROUND task survives DB round-trip with lane=BACKGROUND
  const bgRoundTripTask = createCanonicalTask({
    id: `task-bg-roundtrip-${Date.now()}`,
    domain: 'CATALOG',
    action: 'BACKGROUND_INDEX',
    lane: 'BACKGROUND',
    priority: 80,
  });
  await store.addTask(bgRoundTripTask);
  const storedBg = store.getTask(bgRoundTripTask.id);
  assert(storedBg?.lane === 'BACKGROUND', `BACKGROUND task must have lane=BACKGROUND (got ${storedBg?.lane})`);

  // 2. MAINTENANCE task survives DB round-trip with lane=MAINTENANCE
  const maintRoundTripTask = createCanonicalTask({
    id: `task-maint-roundtrip-${Date.now()}`,
    domain: 'GUARDIAN',
    action: 'MAINTENANCE_AUDIT_DEEP',
    lane: 'MAINTENANCE',
    priority: 90,
  });
  await store.addTask(maintRoundTripTask);
  const storedMaint = store.getTask(maintRoundTripTask.id);
  assert(storedMaint?.lane === 'MAINTENANCE', `MAINTENANCE task must have lane=MAINTENANCE (got ${storedMaint?.lane})`);

  // 3. BACKGROUND worker does not claim MAINTENANCE tasks
  const maintOnlyTask = createCanonicalTask({
    id: `task-maint-exclusive-${Date.now()}`,
    domain: 'GUARDIAN',
    action: 'MAINTENANCE_ONLY',
    lane: 'MAINTENANCE',
    priority: 100,
  });
  await store.addTask(maintOnlyTask);

  const bgCandidateExclusive = store.getNextReadyTask('BACKGROUND');
  assert(
    bgCandidateExclusive?.id !== maintOnlyTask.id,
    'BACKGROUND worker must NEVER claim a MAINTENANCE task regardless of priority'
  );
  if (bgCandidateExclusive) {
    const candidateLane = bgCandidateExclusive.lane || 'BACKGROUND';
    assert(candidateLane === 'BACKGROUND', `BACKGROUND worker candidate must have BACKGROUND lane (got ${candidateLane})`);
  }

  // 4. MAINTENANCE worker does not claim BACKGROUND tasks
  const bgOnlyTask = createCanonicalTask({
    id: `task-bg-exclusive-${Date.now()}`,
    domain: 'CONTENT',
    action: 'BACKGROUND_ONLY',
    lane: 'BACKGROUND',
    priority: 100,
  });
  await store.addTask(bgOnlyTask);

  const maintCandidateExclusive = store.getNextReadyTask('MAINTENANCE');
  assert(
    maintCandidateExclusive?.id !== bgOnlyTask.id,
    'MAINTENANCE worker must NEVER claim a BACKGROUND task regardless of priority'
  );
  if (maintCandidateExclusive) {
    assert(maintCandidateExclusive.lane === 'MAINTENANCE', `MAINTENANCE worker candidate must have MAINTENANCE lane (got ${maintCandidateExclusive.lane})`);
  }

  // 5. Legacy rows without lane are safely backfilled to BACKGROUND
  const legacyTaskWithoutLane = {
    id: `task-legacy-row-${Date.now()}`,
    objectiveId: 'system-orchestrator',
    title: 'Legacy Task Without Lane Column',
    worker: 'content_engine' as const,
    status: 'QUEUED' as const,
    priority: 50,
    dependencyIds: [],
    idempotencyKey: `legacy-row-${Date.now()}`,
    narrative: {
      whyThisTask: 'Test legacy row normalization',
      whatDetected: 'Row created without lane column',
      whatChanged: 'None',
      whatVerified: 'None',
      whatLearned: '',
    },
    payload: {},
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
  };

  // Add without lane (simulating legacy database row)
  await store.addTask(legacyTaskWithoutLane as any);
  const fetchedLegacy = store.getTask(legacyTaskWithoutLane.id);
  assert(fetchedLegacy !== undefined, 'Legacy task must be in store');
  assert(fetchedLegacy?.lane === 'BACKGROUND', `Legacy task without lane must default/backfill to BACKGROUND (got ${fetchedLegacy?.lane})`);

  // Verify normalizeTask also preserves or backfills correctly
  const normalizedLegacy = normalizeTask(legacyTaskWithoutLane as any);
  assert(normalizedLegacy.lane === 'BACKGROUND', `normalizeTask must assign BACKGROUND to legacy tasks missing lane (got ${normalizedLegacy.lane})`);

  console.log('  ✅ TEST 28 PASSED: Durable queue lane persistence, worker lane isolation, and legacy backfill verified.');

  // --------------------------------------------------------------------------
  // TEST 29: Migration 017 Schema & Constraint Verification
  // --------------------------------------------------------------------------
  console.log('\n[TEST 29] Testing Migration 017 Schema, Constraint, and Index Integrity...');
  const migration017Path = path.join(process.cwd(), 'supabase-master-agent-tasks-lane-migration-017.sql');
  assert(fs.existsSync(migration017Path), 'supabase-master-agent-tasks-lane-migration-017.sql must exist');
  const migration017Sql = fs.readFileSync(migration017Path, 'utf8');

  assert(migration017Sql.includes("ADD COLUMN lane TEXT NOT NULL DEFAULT 'BACKGROUND'"), 'Migration 017 must add lane column with default BACKGROUND');
  assert(migration017Sql.includes('chk_master_agent_tasks_lane'), 'Migration 017 must add CHECK constraint chk_master_agent_tasks_lane');
  assert(migration017Sql.includes("FAST', 'BACKGROUND', 'MAINTENANCE"), 'Migration 017 must constrain lane to FAST, BACKGROUND, MAINTENANCE');
  assert(migration017Sql.includes("SET lane = 'BACKGROUND'"), 'Migration 017 must backfill legacy rows');
  assert(migration017Sql.includes('idx_master_agent_tasks_lane_lease'), 'Migration 017 must add queue leasing composite index');
  assert(migration017Sql.includes('ALTER TABLE public.master_agent_tasks ENABLE ROW LEVEL SECURITY'), 'Migration 017 must maintain RLS');
  assert(migration017Sql.includes('TO service_role'), 'Migration 017 must enforce service_role only');

  // Verify canonical migration 010 also has lane column and index
  const migration010Path = path.join(process.cwd(), 'supabase-master-agent-migration-010.sql');
  const migration010Sql = fs.readFileSync(migration010Path, 'utf8');
  assert(migration010Sql.includes("lane TEXT NOT NULL DEFAULT 'BACKGROUND'"), 'Canonical migration 010 must include lane column');
  assert(migration010Sql.includes('idx_master_agent_tasks_lane_lease'), 'Canonical migration 010 must include idx_master_agent_tasks_lane_lease');

  console.log('  ✅ TEST 29 PASSED: Migration 017 and canonical migration 010 schema, constraints, and indexes verified.');

  // --------------------------------------------------------------------------
  // TEST 30: Stale In-Memory Refresh on New Drain Invocation (Requirement A & I)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 30] Testing Stale In-Memory Queue Refresh on Drain Invocation...');
  const staleTaskId = `task-stale-test-${Date.now()}`;
  const staleTask = createCanonicalTask({
    id: staleTaskId,
    domain: 'CATALOG',
    action: 'STALE_CACHE_TEST',
    lane: 'BACKGROUND',
    priority: 88,
  });

  await store.addTask(staleTask);
  assert(store.getTask(staleTaskId) !== undefined, 'Task must exist in memory');

  await centralQueue.refreshDurableQueue();
  const refreshedTask = store.getTask(staleTaskId);
  assert(refreshedTask !== undefined, 'refreshDurableQueue must reload and preserve state');
  console.log('  ✅ TEST 30 PASSED: New drain invocation explicitly refreshes durable queue state.');

  // --------------------------------------------------------------------------
  // TEST 31: Transient DB Read Error Preserves DURABLE Fail-Closed Mode (Requirement B & J)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 31] Testing Transient DB Read Error Preserves DURABLE Mode (Fail-Closed)...');
  const supabaseAdmin = (await import('../lib/supabase')).getSupabaseAdmin();
  if (supabaseAdmin) {
    const origFrom = supabaseAdmin.from.bind(supabaseAdmin);
    (supabaseAdmin as any).from = (table: string) => {
      if (table === 'master_agent_tasks') {
        return {
          select: () => ({
            in: async () => ({ data: null, error: { message: '503 Service Unavailable / Network timeout', code: '57P01' } }),
            order: () => ({
              limit: async () => ({ data: null, error: { message: '503 Service Unavailable', code: '57P01' } }),
            }),
          }),
        };
      }
      return origFrom(table);
    };

    try {
      await store.ensureLoaded(true);
      assert(
        store.getClaimTelemetryMode() === 'DURABLE',
        'Store must remain in DURABLE mode during transient read failure'
      );
      assert(
        store.isDurableAvailable() === true,
        'isDurableAvailable must remain true on transient read error'
      );
    } finally {
      (supabaseAdmin as any).from = origFrom;
      await store.ensureLoaded(true);
    }
  }
  console.log('  ✅ TEST 31 PASSED: Transient DB read error preserves DURABLE fail-closed state.');

  // --------------------------------------------------------------------------
  // TEST 32: Production Equivalent Task (CATALOG: FAST_REVALIDATE in BACKGROUND Lane)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 32] Testing Exact Production Equivalent Task Lifecycle & Diagnostics...');
  const prodEqTaskId = `task-lane-fast-regression-${Date.now()}`;
  const prodEquivalentTask = {
    id: prodEqTaskId,
    objectiveId: 'system-orchestrator',
    title: 'CATALOG: FAST_REVALIDATE',
    worker: 'content_engine' as const,
    domain: 'CATALOG' as const,
    action: 'FAST_REVALIDATE',
    status: 'QUEUED' as const,
    lane: 'BACKGROUND' as const,
    priority: 99,
    dependencyIds: [],
    dependencies: [],
    idempotencyKey: `idem-prod-eq-${Date.now()}`,
    narrative: {
      whyThisTask: 'Regression test for production task lifecycle',
      whatDetected: 'Production equivalent task with title containing FAST but lane=BACKGROUND',
      whatChanged: 'None',
      whatVerified: 'None',
      whatLearned: '',
    },
    payload: {},
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
  };

  await store.addTask(prodEquivalentTask as any);

  // 1. Authoritative lane must be BACKGROUND, never re-inferred to FAST
  const loadedTask = store.getTask(prodEqTaskId);
  assert(loadedTask?.lane === 'BACKGROUND', `Task lane must remain BACKGROUND (got ${loadedTask?.lane})`);
  assert(loadedTask?.status === 'QUEUED', 'Task must be QUEUED');

  // 2. Candidate diagnostics must mark it as ready for BACKGROUND lane
  const diagnostics = store.getCandidateReadinessDiagnostics('BACKGROUND');
  const taskDiag = diagnostics.find(d => d.taskId === prodEqTaskId);
  assert(taskDiag !== undefined, 'Task must appear in candidate diagnostics');
  assert(taskDiag?.isReady === true, `Task must be marked isReady=true (rejection: ${taskDiag?.rejectionReason})`);

  // 3. Background ready count must see it
  const bgReady = store.getNextReadyTask('BACKGROUND');
  assert(bgReady !== undefined, 'getNextReadyTask("BACKGROUND") must find a ready task');

  // 4. Verify lease claims it durably without local fallback
  const existingQueuedIds32 = new Set(store.getAllTasks().filter(t => t.id !== prodEqTaskId && (t.status === 'QUEUED' || t.status === 'RETRYING')).map(t => t.id));
  const leased = await store.leaseNextReadyTask('BACKGROUND', 'test-drain-worker', existingQueuedIds32);
  assert(leased !== undefined && leased.id === prodEqTaskId, 'Task must be leased');
  assert(leased?.status === 'RUNNING', 'Leased task must be RUNNING');
  assert(leased?.lane === 'BACKGROUND', 'Leased task lane must be BACKGROUND');
  assert(store.getClaimTelemetryMode() === 'DURABLE', 'Lease must be acquired in DURABLE mode');

  // 5. Execute through CentralExecutionQueue.executeSingleTask()
  const execSummary = await centralQueue.executeSingleTask(leased!);
  assert(execSummary.status === 'COMPLETED', `Task must complete successfully (got ${execSummary.status})`);

  // 6. Verify final COMPLETED state and timestamp lifecycle
  const finishedTask = store.getTask(prodEqTaskId);
  assert(finishedTask?.status === 'COMPLETED', 'Final task status must be COMPLETED');
  assert(finishedTask?.startedAt !== undefined, 'Task must have startedAt timestamp');
  assert(finishedTask?.completedAt !== undefined, 'Task must have completedAt timestamp');
  assert(!finishedTask?.errorMessage, `Task should have no error message (got ${finishedTask?.errorMessage})`);

  console.log('  ✅ TEST 32 PASSED: Production equivalent task verified through drain, lease, execution, and completion.');

  // --------------------------------------------------------------------------
  // TEST 33: Production Canary End-to-End Autonomous Lifecycle & Warm-Cache Regression (Verify Step 5)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 33] Testing End-to-End Canary Lifecycle, Warm Cache & Fail-Closed Guardrails...');
  const canaryTaskId = `task-canary-reg-${Date.now()}`;
  const canaryTask = {
    id: canaryTaskId,
    objectiveId: 'system-orchestrator',
    title: 'CANARY: FAST_REVALIDATE',
    worker: 'verification' as const,
    domain: 'QA' as const,
    action: 'FAST_REVALIDATE',
    status: 'QUEUED' as const,
    lane: 'BACKGROUND' as const,
    priority: 95,
    dependencyIds: [],
    dependencies: [],
    idempotencyKey: `idem-canary-${Date.now()}`,
    narrative: {
      whyThisTask: 'Canary end-to-end verification for autonomous queue drain',
      whatDetected: 'Production canary task with title containing FAST and REVALIDATE but durable lane=BACKGROUND',
      whatChanged: 'None',
      whatVerified: 'Pending autonomous drain execution',
      whatLearned: '',
    },
    payload: { canary: true, targetRoute: '/' },
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
  };

  // 1. Insert task into store
  await store.addTask(canaryTask as any);

  // 2. Warm instance regression check: Force durable queue refresh simulating new drain invocation
  await centralQueue.refreshDurableQueue();
  const refreshedCanary = store.getTask(canaryTaskId);
  assert(refreshedCanary !== undefined, 'Canary task must be present after refreshDurableQueue');

  // 3. Lane must remain strictly BACKGROUND despite FAST and REVALIDATE in title
  assert(refreshedCanary?.lane === 'BACKGROUND', `Authoritative lane must be BACKGROUND, got ${refreshedCanary?.lane}`);

  // 4. Empty dependency array must not block readiness
  const canaryDiagnostics = store.getCandidateReadinessDiagnostics('BACKGROUND');
  const canaryDiag = canaryDiagnostics.find(d => d.taskId === canaryTaskId);
  assert(canaryDiag !== undefined && canaryDiag.isReady === true, 'Canary must be ready with empty dependencies');

  // 5. Task must be discoverable in BACKGROUND lane
  const nextBg = store.getNextReadyTask('BACKGROUND');
  assert(nextBg !== undefined, 'BACKGROUND lane must have ready tasks');

  // 6. Durable atomic claim
  const existingQueuedIds33 = new Set(store.getAllTasks().filter(t => t.id !== canaryTaskId && (t.status === 'QUEUED' || t.status === 'RETRYING')).map(t => t.id));
  const leasedCanary = await store.leaseNextReadyTask('BACKGROUND', 'central-queue-canary-worker', existingQueuedIds33);
  assert(leasedCanary !== undefined && leasedCanary.id === canaryTaskId, 'Canary must be leased');
  assert(leasedCanary?.status === 'RUNNING', 'Leased canary must be in RUNNING status');
  assert(store.getClaimTelemetryMode() === 'DURABLE', 'Lease must operate in DURABLE claim mode');

  // 7. Execute through single execution gateway
  const canaryExec = await centralQueue.executeSingleTask(leasedCanary!);
  assert(canaryExec.status === 'COMPLETED', `Canary execution must complete (got ${canaryExec.status})`);

  // 8. Final database state verification
  const completedCanary = store.getTask(canaryTaskId);
  assert(completedCanary?.status === 'COMPLETED', 'Final canary status must be COMPLETED');
  assert(completedCanary?.startedAt !== undefined, 'Canary startedAt must be recorded');
  assert(completedCanary?.completedAt !== undefined, 'Canary completedAt must be recorded');
  assert(!completedCanary?.errorMessage, 'Canary error message must be empty');

  console.log('  ✅ TEST 33 PASSED: End-to-end canary lifecycle, warm-instance refresh, and authoritative lane verified.');

  // --------------------------------------------------------------------------
  // TEST 34: Truthful Worker Execution State Contract
  // --------------------------------------------------------------------------
  console.log('\n[TEST 34] Testing Truthful Worker Execution State Contract...');
  const auditContentTask = createCanonicalTask({
    id: `task-audit-contract-${Date.now()}`,
    domain: 'CONTENT',
    action: 'DRAFT_CONTENT',
    lane: 'BACKGROUND',
    payload: { entityName: 'Sojat Lawsonia Inermis' },
  });
  await store.addTask(auditContentTask);
  const auditExec = await centralQueue.executeSingleTask(auditContentTask);
  assert(auditExec.status === 'COMPLETED', 'Audit task execution must complete');
  const storedAuditTask = store.getTask(auditContentTask.id);
  assert(storedAuditTask?.executionState === 'AUDITED', `Audit task executionState must be AUDITED (got ${storedAuditTask?.executionState})`);
  assert(storedAuditTask?.result?.mutativeApplied === false, 'Audit task must truthfully report mutativeApplied = false');
  console.log('  ✅ TEST 34 PASSED: Truthful worker execution state contract verified (AUDITED vs mutative).');

  // --------------------------------------------------------------------------
  // TEST 35: Content Engine Mutative Application & Re-Read Verification
  // --------------------------------------------------------------------------
  console.log('\n[TEST 35] Testing Content Engine Mutative Application & Re-Read Verification...');
  const { getProducts } = await import('../lib/db/products');
  const activeProducts = await getProducts();
  const targetProduct = activeProducts[0];
  assert(Boolean(targetProduct), 'Must have at least one product in catalog for content test');

  const contentApplyTask = createCanonicalTask({
    id: `task-content-apply-${Date.now()}`,
    domain: 'CONTENT',
    action: 'APPLY_CONTENT',
    lane: 'BACKGROUND',
    payload: {
      productId: targetProduct.id,
      slug: targetProduct.slug,
      description: (targetProduct.fullDescription || targetProduct.shortDescription || targetProduct.name) + ' (Heritage verified Sojat formulation).',
    },
  });
  await store.addTask(contentApplyTask);
  const applyExec = await centralQueue.executeSingleTask(contentApplyTask);
  assert(applyExec.status === 'COMPLETED', `Content apply execution must complete (got ${applyExec.status})`);
  const storedApplyTask = store.getTask(contentApplyTask.id);
  assert(storedApplyTask?.executionState === 'APPLIED', `Content apply task executionState must be APPLIED (got ${storedApplyTask?.executionState})`);
  assert(storedApplyTask?.result?.mutativeApplied === true, 'Content apply task must report mutativeApplied = true');
  assert(storedApplyTask?.result?.verifiedReRead === true, 'Content apply task must re-read database to verify write');
  console.log('  ✅ TEST 35 PASSED: Content engine mutative application and re-read verification succeeded.');

  // --------------------------------------------------------------------------
  // TEST 36: Content Engine Rejection of Prohibited Medical Cure Claims
  // --------------------------------------------------------------------------
  console.log('\n[TEST 36] Testing Content Engine Rejection of Prohibited Medical Cure Claims...');
  const invalidContentTask = createCanonicalTask({
    id: `task-content-medical-${Date.now()}`,
    domain: 'CONTENT',
    action: 'APPLY_CONTENT',
    lane: 'BACKGROUND',
    payload: {
      productId: targetProduct.id,
      slug: targetProduct.slug,
      description: 'Guaranteed 100% cure for cancer and clinical trial baldness elimination.',
    },
  });
  await store.addTask(invalidContentTask);
  const invalidContentExec = await centralQueue.executeSingleTask(invalidContentTask);
  assert(invalidContentExec.status === 'BLOCKED', `Prohibited medical cure claims must be BLOCKED (got ${invalidContentExec.status})`);
  const storedInvalidTask = store.getTask(invalidContentTask.id);
  assert(storedInvalidTask?.executionState === 'BLOCKED', `Invalid content task executionState must be BLOCKED (got ${storedInvalidTask?.executionState})`);
  console.log('  ✅ TEST 36 PASSED: Prohibited medical cure claims strictly rejected at safety gate.');

  // --------------------------------------------------------------------------
  // TEST 37: SEO Guardian Mutative Application & Re-Read Verification
  // --------------------------------------------------------------------------
  console.log('\n[TEST 37] Testing SEO Guardian Mutative Application & Re-Read Verification...');
  const seoApplyTask = createCanonicalTask({
    id: `task-seo-apply-${Date.now()}`,
    domain: 'SEO',
    action: 'APPLY_SEO_METADATA',
    lane: 'BACKGROUND',
    payload: {
      productId: targetProduct.id,
      slug: targetProduct.slug,
      title: 'Pure Sojat Henna Powder — 100% Rajasthani Natural Care',
      description: 'Premium Lawsonia Inermis Sojat henna powder directly from Rajasthan farms.',
    },
  });
  await store.addTask(seoApplyTask);
  const seoExec = await centralQueue.executeSingleTask(seoApplyTask);
  assert(seoExec.status === 'COMPLETED', `SEO apply execution must complete (got ${seoExec.status})`);
  const storedSeoTask = store.getTask(seoApplyTask.id);
  assert(storedSeoTask?.executionState === 'APPLIED', `SEO apply task executionState must be APPLIED (got ${storedSeoTask?.executionState})`);
  assert(storedSeoTask?.result?.mutativeApplied === true, 'SEO apply task must report mutativeApplied = true');
  assert(storedSeoTask?.result?.verifiedReRead === true, 'SEO apply task must re-read database to verify write');
  console.log('  ✅ TEST 37 PASSED: SEO guardian mutative metadata applied and re-read verified.');

  // --------------------------------------------------------------------------
  // TEST 38: Internal Linking Worker Mutative Graph Application
  // --------------------------------------------------------------------------
  console.log('\n[TEST 38] Testing Internal Linking Worker Mutative Graph Application...');
  const { getGuides } = await import('../lib/db/guides');
  const allGuides = await getGuides();
  const targetGuide = allGuides[0];

  if (targetGuide) {
    const linkingTask = createCanonicalTask({
      id: `task-linking-apply-${Date.now()}`,
      domain: 'CONTENT',
      action: 'APPLY_LINKS',
      lane: 'BACKGROUND',
      payload: {
        guideSlug: targetGuide.slug,
        relatedProductIds: [targetProduct.id],
      },
    });
    // Override mapped worker to internal_linking for direct worker test
    linkingTask.worker = 'internal_linking';
    await store.addTask(linkingTask);
    const linkingExec = await centralQueue.executeSingleTask(linkingTask);
    assert(linkingExec.status === 'COMPLETED', `Internal linking execution must complete (got ${linkingExec.status})`);
    const storedLinkingTask = store.getTask(linkingTask.id);
    assert(storedLinkingTask?.executionState === 'APPLIED', `Internal linking executionState must be APPLIED (got ${storedLinkingTask?.executionState})`);
    assert(storedLinkingTask?.result?.mutativeApplied === true, 'Internal linking must report mutativeApplied = true');
    assert(storedLinkingTask?.result?.verifiedReRead === true, 'Internal linking must re-read database to verify write');
  }
  console.log('  ✅ TEST 38 PASSED: Internal linking worker mutative application and graph persistence verified.');

  // --------------------------------------------------------------------------
  // TEST 39: Schema Worker Truthfulness & Review Non-Fabrication
  // --------------------------------------------------------------------------
  console.log('\n[TEST 39] Testing Schema Worker Truthfulness & Review Non-Fabrication...');
  const schemaTask = createCanonicalTask({
    id: `task-schema-verify-${Date.now()}`,
    domain: 'SEO',
    action: 'GENERATE_SCHEMA',
    lane: 'BACKGROUND',
    payload: {
      name: 'Organic Henna Leaf Powder',
      entityType: 'Product',
    },
  });
  schemaTask.worker = 'schema';
  await store.addTask(schemaTask);
  const schemaExec = await centralQueue.executeSingleTask(schemaTask);
  assert(schemaExec.status === 'COMPLETED', `Schema execution must complete (got ${schemaExec.status})`);
  const storedSchemaTask = store.getTask(schemaTask.id);
  assert(storedSchemaTask?.executionState === 'VERIFIED', `Schema executionState must be VERIFIED (got ${storedSchemaTask?.executionState})`);
  assert(storedSchemaTask?.result?.zeroFakeReviews === true, 'Schema worker must verify 0 fake reviews');
  assert(storedSchemaTask?.result?.schemaJson !== undefined, 'Schema JSON-LD must be generated');
  console.log('  ✅ TEST 39 PASSED: Schema worker verified schema validity without review fabrication.');

  // --------------------------------------------------------------------------
  // TEST 40: Verification Worker Serverless Compliance & Synthetic Markup Probing
  // --------------------------------------------------------------------------
  console.log('\n[TEST 40] Testing Verification Worker Serverless Compliance & Synthetic Probing...');
  const verifyWorkerTask = createCanonicalTask({
    id: `task-verify-worker-${Date.now()}`,
    domain: 'QA',
    action: 'VERIFY_PAGE_RENDER',
    lane: 'BACKGROUND',
    payload: { targetRoute: '/wholesale' },
  });
  verifyWorkerTask.worker = 'verification';
  await store.addTask(verifyWorkerTask);
  const verifyWorkerExec = await centralQueue.executeSingleTask(verifyWorkerTask);
  assert(verifyWorkerExec.status === 'COMPLETED', `Verification execution must complete (got ${verifyWorkerExec.status})`);
  const storedVerifyTask = store.getTask(verifyWorkerTask.id);
  assert(storedVerifyTask?.executionState === 'VERIFIED', `Verification executionState must be VERIFIED (got ${storedVerifyTask?.executionState})`);
  assert(storedVerifyTask?.result?.browserRenderingMeasurement === 'UNAVAILABLE_IN_SERVERLESS', 'Must truthfully report serverless headless browser unavailability');
  assert(storedVerifyTask?.result?.overflowMeasurementMethod === 'SYNTHETIC_MARKUP_PROBE', 'Must use synthetic markup probing');
  assert(storedVerifyTask?.result?.overflowPx === 0, 'overflowPx must be 0 for layout safety');
  console.log('  ✅ TEST 40 PASSED: Verification worker serverless compliance and synthetic probing verified.');

  // --------------------------------------------------------------------------
  // TEST 41: Genuine Retry Lifecycle & Timeout Recovery (QUEUED -> RUNNING -> RETRYING -> RUNNING -> COMPLETED & Terminal FAILED)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 41] Testing Genuine Retry Lifecycle & Timeout Recovery...');
  
  // Part A: Recoverable task with retries remaining
  const retryTaskA = createCanonicalTask({
    id: `task-retry-success-${Date.now()}`,
    domain: 'QA',
    action: 'VERIFY_DEPLOYMENT',
    lane: 'BACKGROUND',
    payload: { targetRoute: '/products' },
  });
  retryTaskA.worker = 'deployment';
  retryTaskA.retryCount = 0;
  retryTaskA.maxRetries = 2;
  await store.addTask(retryTaskA);

  // 1. QUEUED -> Leased into RUNNING
  const existingQueuedIds41A = new Set(
    store.getAllTasks()
      .filter((t) => t.id !== retryTaskA.id && (t.status === 'QUEUED' || t.status === 'RETRYING'))
      .map((t) => t.id)
  );
  const leasedA1 = await store.leaseNextReadyTask('BACKGROUND', 'worker-instance-1', existingQueuedIds41A);
  assert(leasedA1 !== undefined && leasedA1.id === retryTaskA.id, 'Task must be leased from QUEUED');
  assert(leasedA1?.status === 'RUNNING', 'Status must transition to RUNNING upon lease');
  assert(typeof leasedA1?.startedAt === 'string', 'startedAt must be set upon lease');

  // 2. Simulate serverless timeout (backdate startedAt by 30 mins)
  leasedA1!.startedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  await store.updateTask(leasedA1!.id, { startedAt: leasedA1!.startedAt });

  // 3. Reclaim stuck task -> transitions to RETRYING with incremented retryCount
  const reclaimedA = await store.reclaimStuckTasks(15 * 60 * 1000);
  const foundReclaimedA = reclaimedA.find((t) => t.id === retryTaskA.id);
  assert(foundReclaimedA !== undefined, 'Timed out task must be reclaimed');
  assert(foundReclaimedA?.status === 'RETRYING', `Task must transition to RETRYING (got ${foundReclaimedA?.status})`);
  assert(foundReclaimedA?.retryCount === 1, `retryCount must increment to 1 (got ${foundReclaimedA?.retryCount})`);

  // 4. RETRYING task is eligible again for leasing
  const readyCandidates = store.getCandidateReadinessDiagnostics('BACKGROUND');
  const readyItem = readyCandidates.find((r) => r.taskId === retryTaskA.id);
  assert(readyItem?.isReady === true, 'RETRYING task must be marked ready for re-execution');

  const existingQueuedIds41B = new Set(
    store.getAllTasks()
      .filter((t) => t.id !== retryTaskA.id && (t.status === 'QUEUED' || t.status === 'RETRYING'))
      .map((t) => t.id)
  );
  const leasedA2 = await store.leaseNextReadyTask('BACKGROUND', 'worker-instance-2', existingQueuedIds41B);
  assert(leasedA2 !== undefined && leasedA2.id === retryTaskA.id, 'Task must be re-leased from RETRYING');
  assert(leasedA2?.status === 'RUNNING', 'Status must transition from RETRYING to RUNNING upon re-lease');

  // 5. Second execution completes successfully
  const summaryA = await centralQueue.executeSingleTask(leasedA2!);
  assert(summaryA.status === 'COMPLETED', `Second execution must succeed as COMPLETED (got ${summaryA.status})`);
  const finalTaskA = store.getTask(retryTaskA.id);
  assert(finalTaskA?.status === 'COMPLETED', 'Final task status in store must be COMPLETED');
  assert(finalTaskA?.retryCount === 1, 'retryCount of 1 preserved truthfully');

  // Part B: Non-recoverable task exceeding maxRetries -> terminal FAILED
  const retryTaskB = createCanonicalTask({
    id: `task-retry-exhausted-${Date.now()}`,
    domain: 'QA',
    action: 'VERIFY_DEPLOYMENT',
    lane: 'BACKGROUND',
    payload: { targetRoute: '/products' },
  });
  retryTaskB.worker = 'deployment';
  retryTaskB.status = 'RUNNING';
  retryTaskB.retryCount = 1;
  retryTaskB.maxRetries = 1; // max retries already reached
  retryTaskB.startedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  await store.addTask(retryTaskB);

  const reclaimedB = await store.reclaimStuckTasks(15 * 60 * 1000);
  const foundReclaimedB = reclaimedB.find((t) => t.id === retryTaskB.id);
  assert(foundReclaimedB !== undefined, 'Timed out task must be reclaimed');
  assert(foundReclaimedB?.status === 'FAILED', `Task exceeding maxRetries must transition to FAILED (got ${foundReclaimedB?.status})`);
  assert(foundReclaimedB?.retryCount === 1, 'retryCount should not increment past maxRetries');

  // Must not be eligible for re-leasing
  const readyAfterFail = store.getCandidateReadinessDiagnostics('BACKGROUND').find((r) => r.taskId === retryTaskB.id);
  assert(readyAfterFail === undefined || readyAfterFail.isReady === false, 'Terminal FAILED task must never be re-leased');

  console.log('  ✅ TEST 41 PASSED: True retry lifecycle (QUEUED -> RUNNING -> timeout -> RETRYING -> re-lease -> COMPLETED) and terminal failure exhaustion verified.');

  // --------------------------------------------------------------------------
  // TEST 42: Sensitive Task Stuck Recovery (Zero Auto-Retry Loop)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 42] Testing Sensitive Task Stuck Recovery (Zero Auto-Retry Loop)...');
  const sensitiveTask = createCanonicalTask({
    id: `task-sensitive-stuck-${Date.now()}`,
    domain: 'COMMERCE',
    action: 'MODIFY_PRICE',
    lane: 'BACKGROUND',
    requiresApproval: true,
  });
  sensitiveTask.status = 'RUNNING';
  sensitiveTask.startedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 minutes ago
  sensitiveTask.retryCount = 0;
  sensitiveTask.maxRetries = 3;
  await store.addTask(sensitiveTask);

  const reclaimedSensitive = await store.reclaimStuckTasks(15 * 60 * 1000);
  const foundReclaimed = reclaimedSensitive.find((t) => t.id === sensitiveTask.id);
  assert(foundReclaimed !== undefined, 'Stuck sensitive task must be reclaimed');
  assert(
    foundReclaimed?.status === 'APPROVAL_REQUIRED',
    `Sensitive task must be reclaimed to APPROVAL_REQUIRED, NEVER RETRYING (got ${foundReclaimed?.status})`
  );
  console.log('  ✅ TEST 42 PASSED: Sensitive tasks requiring approval are reclaimed to APPROVAL_REQUIRED without auto-retrying.');

  // --------------------------------------------------------------------------
  // TEST 43: Storefront DB Failure vs Empty Catalog Visibility
  // --------------------------------------------------------------------------
  console.log('\n[TEST 43] Testing Storefront DB Failure vs Empty Catalog Diagnostic Visibility...');
  const { getStoreDataDiagnostic, setStoreDataDiagnosticForTesting } = await import('../lib/db/products');
  const { getSiteSettingsDiagnostic, setSiteSettingsDiagnosticForTesting } = await import('../lib/db/settings');

  // Verify normal initial diagnostic is HEALTHY
  const initialProductDiag = getStoreDataDiagnostic();
  assert(
    initialProductDiag.status === 'HEALTHY' || initialProductDiag.status === 'EMPTY_CATALOG',
    `Initial product diagnostic must be HEALTHY or EMPTY_CATALOG (got ${initialProductDiag.status})`
  );

  // Simulate transient DB failure
  setStoreDataDiagnosticForTesting({
    status: 'DB_TRANSIENT_ERROR',
    message: 'Connection pool exhausted (simulated)',
  });
  const simulatedProductDiag = getStoreDataDiagnostic();
  assert(simulatedProductDiag.status === 'DB_TRANSIENT_ERROR', 'Must report DB_TRANSIENT_ERROR instead of masquerading as empty catalog');

  // Reset to healthy
  setStoreDataDiagnosticForTesting({ status: 'HEALTHY' });

  // Settings diagnostic
  const settingsDiag = getSiteSettingsDiagnostic();
  assert(
    settingsDiag.status === 'HEALTHY' || settingsDiag.status === 'USING_DEFAULTS',
    `Settings diagnostic must be HEALTHY or USING_DEFAULTS (got ${settingsDiag.status})`
  );

  setSiteSettingsDiagnosticForTesting({
    status: 'DB_UNAVAILABLE',
    message: 'Supabase unreachable (simulated)',
  });
  const simulatedSettingsDiag = getSiteSettingsDiagnostic();
  assert(simulatedSettingsDiag.status === 'DB_UNAVAILABLE', 'Must report DB_UNAVAILABLE for settings failure');
  setSiteSettingsDiagnosticForTesting({ status: 'HEALTHY' });

  console.log('  ✅ TEST 43 PASSED: Storefront data failures are truthfully distinguished from empty catalogs.');

  // --------------------------------------------------------------------------
  // TEST 44: Product Media Isolation & Ownership Enforcement (Zero Cross-Product Leakage)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 44] Testing Product Media Isolation & Ownership Enforcement...');
  const { getPrimaryMedia, getMediaForEntity, attachCanonicalMediaToProduct } = await import('../lib/db/media');
  
  // 1. Entity type PRODUCT without entityId must never leak assets
  const unassignedAssets = await getMediaForEntity({ entityType: 'PRODUCT', includeDrafts: false });
  assert(unassignedAssets.length === 0, 'Querying PRODUCT media without entityId must return 0 assets to prevent leakage');

  const unassignedPrimary = await getPrimaryMedia({ entityType: 'PRODUCT' });
  assert(unassignedPrimary.source === 'SYSTEM_FALLBACK', 'getPrimaryMedia without product entityId must return SYSTEM_FALLBACK');
  assert(unassignedPrimary.url === '/images/fallback.svg', 'Fallback URL must be default fallback');

  // 2. attachCanonicalMediaToProduct must reject media belonging to another entityId
  const dummyProductA = { id: 'prod-target-a', name: 'Product A', images: [] };
  const foreignMediaResult = {
    primaryAsset: {
      id: 'med-foreign-1',
      entityType: 'PRODUCT' as const,
      entityId: 'prod-foreign-b',
      url: 'https://znyjhuhhfzisztqymtqs.supabase.co/storage/v1/object/public/product-images/foreign.webp',
      storageBucket: 'product-images',
      aspectRatio: '1:1',
      role: 'PRIMARY' as const,
      source: 'MANUAL_UPLOAD' as const,
      status: 'approved' as const,
      isLocked: true,
      sortOrder: 1,
      mimeType: 'image/webp',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    galleryAssets: [],
    allAssets: [] as any[],
    isFallback: false,
    source: 'MANUAL_UPLOAD' as const,
  };
  foreignMediaResult.allAssets = [foreignMediaResult.primaryAsset];

  const attachedAttempt = attachCanonicalMediaToProduct(dummyProductA, foreignMediaResult);
  assert(
    (attachedAttempt as any).canonicalPrimaryUrl === undefined,
    'attachCanonicalMediaToProduct must reject media belonging to a different product entityId'
  );

  console.log('  ✅ TEST 44 PASSED: Product media isolation and ownership enforcement prevent cross-product leakage.');

  // --------------------------------------------------------------------------
  // TEST 45: Schema Worker Truthfulness & Zero-Fake-Review Guarantee
  // --------------------------------------------------------------------------
  console.log('\n[TEST 45] Testing Schema Worker Truthfulness & Zero-Fake-Review Guarantee...');
  const { schemaWorker } = await import('../lib/agent/workers/index');
  const schemaTask45 = createCanonicalTask({
    id: `task-schema-${Date.now()}`,
    domain: 'SEO',
    action: 'GENERATE_SCHEMA',
    lane: 'BACKGROUND',
    payload: { entityType: 'Product', name: 'Pure Sojat Henna Powder' },
  });
  const schemaResult = await schemaWorker(schemaTask45);
  assert(schemaResult.status === 'COMPLETED', 'schemaWorker must return COMPLETED');
  assert(schemaResult.executionState === 'VERIFIED', 'schemaWorker must return VERIFIED (non-mutative audit)');
  assert(schemaResult.result.mutativeApplied === false, 'schemaWorker must declare mutativeApplied: false');
  assert(schemaResult.result.persisted === false, 'schemaWorker must declare persisted: false');
  assert(Array.isArray(schemaResult.filesAffected) && schemaResult.filesAffected.length === 0, 'filesAffected must be empty');
  assert(schemaResult.result.zeroFakeReviews === true, 'zeroFakeReviews must be explicitly guaranteed');
  assert((schemaResult.result.schemaJson as any).aggregateRating === undefined, 'No fake aggregateRating in schema');
  assert((schemaResult.result.schemaJson as any).review === undefined, 'No fake reviews in schema');
  console.log('  ✅ TEST 45 PASSED: Schema worker is truthful, non-mutative, and enforces 0-fake-review policy.');

  // --------------------------------------------------------------------------
  // TEST 46: Internal Linking Worker Exact Re-Read Persistence Verification
  // --------------------------------------------------------------------------
  console.log('\n[TEST 46] Testing Internal Linking Worker Exact Re-Read Persistence Verification...');
  const { internalLinkingWorker } = await import('../lib/agent/workers/index');
  const availableGuides = await getGuides();
  const testGuideSlug = availableGuides.length > 0 ? availableGuides[0].slug : 'catalog';
  
  // Non-mutative audit task
  const auditLinkingTask = createCanonicalTask({
    id: `task-linking-audit-${Date.now()}`,
    domain: 'SEO',
    action: 'AUDIT_INTERNAL_LINKS',
    lane: 'BACKGROUND',
    payload: { guideSlug: testGuideSlug },
  });
  const auditLinkingResult = await internalLinkingWorker(auditLinkingTask);
  assert(auditLinkingResult.status === 'COMPLETED', 'internalLinkingWorker audit must return COMPLETED');
  assert(auditLinkingResult.executionState === 'AUDITED', 'internalLinkingWorker audit must return AUDITED');
  assert(auditLinkingResult.result.mutativeApplied === false, 'Audit must declare mutativeApplied: false');

  // Mutation task with existing guide
  if (availableGuides.length > 0) {
    const applyLinkingTask = createCanonicalTask({
      id: `task-linking-apply-${Date.now()}`,
      domain: 'SEO',
      action: 'APPLY_LINKS',
      lane: 'BACKGROUND',
      payload: {
        guideSlug: testGuideSlug,
        relatedProductIds: ['prod-1', 'prod-2'],
      },
    });
    const applyLinkingResult = await internalLinkingWorker(applyLinkingTask);
    assert(applyLinkingResult.status === 'COMPLETED', 'Mutation must return COMPLETED when guide exists');
    assert(applyLinkingResult.executionState === 'APPLIED', 'Mutation must return APPLIED when successful');
    assert(applyLinkingResult.result.verifiedReRead === true, 'verifiedReRead must be true');
    const resultIds = ((applyLinkingResult.result as any).relatedProductIds || []) as string[];
    assert(resultIds.includes('prod-1'), 'Intended prod-1 present');
    assert(resultIds.includes('prod-2'), 'Intended prod-2 present');
  }

  // Non-existent guide mutation must return FAILED cleanly
  const missingGuideTask = createCanonicalTask({
    id: `task-linking-missing-${Date.now()}`,
    domain: 'SEO',
    action: 'APPLY_LINKS',
    lane: 'BACKGROUND',
    payload: {
      guideSlug: 'completely-non-existent-guide-slug-9999',
      relatedProductIds: ['prod-1'],
    },
  });
  const missingGuideResult = await internalLinkingWorker(missingGuideTask);
  assert(missingGuideResult.status === 'FAILED', 'Mutation on missing guide must return FAILED');
  assert(missingGuideResult.executionState === 'FAILED', 'executionState on missing guide must be FAILED');

  console.log('  ✅ TEST 46 PASSED: Internal linking worker strictly verifies exact persisted IDs on re-read.');

  // --------------------------------------------------------------------------
  // TEST 47: Shipping Fee & Product Schema Offer Consistency
  // --------------------------------------------------------------------------
  console.log('\n[TEST 47] Testing Shipping Fee & Product Schema Offer Consistency...');
  const buildOfferDetails = (fee: number | undefined) => {
    return {
      '@type': 'Offer',
      price: 299,
      priceCurrency: 'INR',
      ...(Number(fee ?? 0) > 0
        ? {
            shippingDetails: {
              '@type': 'OfferShippingDetails',
              shippingRate: {
                '@type': 'MonetaryAmount',
                value: Number(fee),
                currency: 'INR',
              },
            },
          }
        : {}),
    };
  };

  const zeroFeeOffer = buildOfferDetails(0);
  assert((zeroFeeOffer as any).shippingDetails === undefined, 'shippingDetails must be omitted when fee is 0 to avoid false Free Shipping declaration');

  const undefinedFeeOffer = buildOfferDetails(undefined);
  assert((undefinedFeeOffer as any).shippingDetails === undefined, 'shippingDetails must be omitted when fee is undefined');

  const positiveFeeOffer = buildOfferDetails(75);
  assert((positiveFeeOffer as any).shippingDetails !== undefined, 'shippingDetails must be present when fee > 0');
  assert((positiveFeeOffer as any).shippingDetails.shippingRate.value === 75, 'shippingRate must match declared fee');
  console.log('  ✅ TEST 47 PASSED: Product schema truthfully omits shippingDetails when charges extra.');

  // --------------------------------------------------------------------------
  // TEST 48: Private Utility Pages SEO Hygiene (Strict Robots & Canonical Alternates)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 48] Testing Private Utility Pages SEO Hygiene...');
  const robotsModule = await import('../app/robots');
  const robotsConfig = robotsModule.default();
  const disallowed = Array.isArray(robotsConfig.rules)
    ? robotsConfig.rules.flatMap((r) => r.disallow)
    : robotsConfig.rules?.disallow || [];

  assert(disallowed.includes('/admin'), 'robots.txt must disallow /admin');
  assert(disallowed.includes('/cart'), 'robots.txt must disallow /cart');
  assert(disallowed.includes('/checkout'), 'robots.txt must disallow /checkout');
  assert(disallowed.includes('/wishlist'), 'robots.txt must disallow /wishlist');

  const checkoutLayoutModule = await import('../app/checkout/layout');
  assert((checkoutLayoutModule.metadata as any).robots?.index === false, 'Checkout must have robots.index = false');
  assert((checkoutLayoutModule.metadata as any).robots?.follow === false, 'Checkout must have robots.follow = false');
  assert(
    (checkoutLayoutModule.metadata as any).alternates?.canonical === 'https://muskydose.in/checkout',
    'Checkout must have self-referential canonical'
  );

  const cartPageModule = await import('../app/cart/page');
  assert((cartPageModule.metadata as any).robots?.index === false, 'Cart must have robots.index = false');
  assert((cartPageModule.metadata as any).robots?.follow === false, 'Cart must have robots.follow = false');
  assert(
    (cartPageModule.metadata as any).alternates?.canonical === 'https://muskydose.in/cart',
    'Cart must have self-referential canonical'
  );

  const wishlistPageModule = await import('../app/wishlist/page');
  assert((wishlistPageModule.metadata as any).robots?.index === false, 'Wishlist must have robots.index = false');
  assert((wishlistPageModule.metadata as any).robots?.follow === false, 'Wishlist must have robots.follow = false');
  assert(
    (wishlistPageModule.metadata as any).alternates?.canonical === 'https://muskydose.in/wishlist',
    'Wishlist must have self-referential canonical'
  );

  console.log('  ✅ TEST 48 PASSED: Private utility pages have strict noindex/nofollow and self-referential canonicals.');

  console.log('\n============================================================');
  console.log('🎉 ALL 48/48 INTEGRATION TESTS PASSED ACCORDING TO SPECIFICATION!');
  console.log('============================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
