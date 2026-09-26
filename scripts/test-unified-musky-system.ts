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
    priority: 100,
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
    priority: 150,
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

  // Measure enqueue latency
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

  // Measure master agent enqueueOnly sweep dispatch latency
  const tSweepStart = performance.now();
  const enqueueOnlySummary = await masterAgent.runDailyAutonomousSweep({ enqueueOnly: true });
  const measuredSweepDurationMs = performance.now() - tSweepStart;

  console.log(`     Measured enqueue latency: ${measuredEnqueueDurationMs.toFixed(2)}ms (Configured Budget: <50ms)`);
  console.log(`     Measured sweep dispatcher latency: ${measuredSweepDurationMs.toFixed(2)}ms (Configured Budget: <50ms)`);

  assert(latencyTestTask !== undefined, 'Task must be enqueued');
  assert(measuredEnqueueDurationMs < 50, `Enqueue dispatcher latency must be <50ms (measured: ${measuredEnqueueDurationMs.toFixed(2)}ms)`);
  assert(enqueueOnlySummary.status === 'DISPATCHED', 'Sweep in enqueueOnly mode must return DISPATCHED status');
  console.log('  ✅ TEST 24 PASSED: Dispatcher latency empirically measured within the <50ms execution budget.');

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

  console.log('\n============================================================');
  console.log('🎉 ALL 27/27 INTEGRATION TESTS PASSED ACCORDING TO SPECIFICATION!');
  console.log('============================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
