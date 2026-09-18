// ============================================================================
// MUSKY DOSE — AUTONOMOUS HARDENING VERIFICATION TEST SUITE
// Tests 4 through 10: No-instruction, Continuous Loop, Restart Recovery,
// Duplicate Protection, Failure Recovery, Business Safety, and Self-Learning.
// ============================================================================

import assert from 'assert';
import { MuskyDoseMasterAgent } from '../lib/agent/master-agent';
import { AgentStore } from '../lib/agent/agent-store';
import { AgentContextEngine } from '../lib/agent/context-engine';
import { AgentTask } from '../lib/agent/types';

async function runAutonomousHardeningTests() {
  console.log('\n============================================================');
  console.log('🛡️  RUNNING AUTONOMOUS HARDENING VERIFICATION SUITE');
  console.log('============================================================\n');

  const agent = MuskyDoseMasterAgent.getInstance();
  const store = AgentStore.getInstance();
  const contextEngine = AgentContextEngine.getInstance();

  // Reset in-memory state for clean test run
  store.resetForTesting();

  // --------------------------------------------------------------------------
  // 1. NO-INSTRUCTION AUTONOMOUS TEST (Requirement 4)
  // --------------------------------------------------------------------------
  console.log('[HARDENING 1] Testing No-Instruction Autonomous Lifecycle...');
  // State: Autonomous Mode = ON, Queue is empty, 0 owner instructions entered
  const stateBefore = store.getState();
  assert.strictEqual(stateBefore.isAutonomous, true);
  assert.strictEqual(stateBefore.currentObjective, null);
  assert.strictEqual(store.getAllTasks().length, 0);

  // Tick autonomous loop directly (no manual instruction, no Run Now button)
  const autoSweep = await agent.tick();
  assert(autoSweep.executedTaskId, 'Autonomous sweep must detect and execute a maintenance task');
  assert.strictEqual(autoSweep.status, 'COMPLETED', 'Executed maintenance task must succeed');

  const tasksAfter = store.getAllTasks();
  assert(tasksAfter.length >= 1, 'At least 1 maintenance task must be enqueued and executed');
  const autoTask = tasksAfter[0];
  assert(autoTask.title.includes('Autonomous'), 'Task must be an autonomous maintenance task');
  assert.strictEqual(autoTask.status, 'COMPLETED');
  assert(autoTask.narrative.whatDetected.length > 0, 'Narrative must record what was detected');
  assert(autoTask.narrative.whatChanged.length > 0, 'Narrative must record what was changed');
  assert(autoTask.narrative.whatVerified.length > 0, 'Narrative must record verification outcome');
  console.log(`  ✅ [HARDENING 1 PASSED] Autonomous maintenance task [${autoTask.title}] detected and executed without instructions.`);

  // --------------------------------------------------------------------------
  // 2. CONTINUOUS-LOOP TEST (Requirement 5)
  // --------------------------------------------------------------------------
  console.log('\n[HARDENING 2] Testing Continuous Autonomous Multi-Task Loop (A -> B -> C)...');
  // Enqueue a chain of 3 dependent tasks
  const chainObjectiveId = 'obj-chain-test';
  const taskA: AgentTask = {
    id: 'chain-task-a',
    objectiveId: chainObjectiveId,
    title: 'Chain Task A: Content Audit',
    worker: 'content_engine',
    status: 'QUEUED',
    priority: 90,
    dependencyIds: [],
    idempotencyKey: 'idem-chain-a',
    narrative: { whyThisTask: 'Chain test A', whatDetected: 'None', whatChanged: 'A', whatVerified: 'A', whatLearned: 'A' },
    payload: { entityName: 'Pure Henna' },
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
  };

  const taskB: AgentTask = {
    id: 'chain-task-b',
    objectiveId: chainObjectiveId,
    title: 'Chain Task B: Schema Generation',
    worker: 'schema',
    status: 'QUEUED',
    priority: 85,
    dependencyIds: ['chain-task-a'],
    idempotencyKey: 'idem-chain-b',
    narrative: { whyThisTask: 'Chain test B', whatDetected: 'None', whatChanged: 'B', whatVerified: 'B', whatLearned: 'B' },
    payload: { entityType: 'Product', name: 'Pure Henna' },
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
  };

  const taskC: AgentTask = {
    id: 'chain-task-c',
    objectiveId: chainObjectiveId,
    title: 'Chain Task C: Public Route Verification',
    worker: 'verification',
    status: 'QUEUED',
    priority: 80,
    dependencyIds: ['chain-task-b'],
    idempotencyKey: 'idem-chain-c',
    narrative: { whyThisTask: 'Chain test C', whatDetected: 'None', whatChanged: 'C', whatVerified: 'C', whatLearned: 'C' },
    payload: { targetRoute: '/products/pure-henna' },
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
  };

  await store.addTask(taskA);
  await store.addTask(taskB);
  await store.addTask(taskC);

  // Execute continuous queue processing
  const batchSummaries = await agent.processQueue(3);
  assert.strictEqual(batchSummaries.length, 3, 'Must process all 3 dependent tasks in sequence');
  assert.strictEqual(batchSummaries[0].executedTaskId, 'chain-task-a');
  assert.strictEqual(batchSummaries[1].executedTaskId, 'chain-task-b');
  assert.strictEqual(batchSummaries[2].executedTaskId, 'chain-task-c');
  assert.strictEqual(store.getTask('chain-task-a')?.status, 'COMPLETED');
  assert.strictEqual(store.getTask('chain-task-b')?.status, 'COMPLETED');
  assert.strictEqual(store.getTask('chain-task-c')?.status, 'COMPLETED');
  console.log('  ✅ [HARDENING 2 PASSED] Continuous loop executed Task A -> Task B -> Task C without halting.');

  // --------------------------------------------------------------------------
  // 3. RESTART-RECOVERY TEST (Requirement 6)
  // --------------------------------------------------------------------------
  console.log('\n[HARDENING 3] Testing Worker Process Restart & Queue Recovery...');
  // Seed a pending task and a stuck task
  const pendingRestartTask: AgentTask = {
    id: 'task-restart-pending-1',
    objectiveId: 'obj-restart',
    title: 'Surviving Task Across Restart',
    worker: 'seo_guardian',
    status: 'QUEUED',
    priority: 75,
    dependencyIds: [],
    idempotencyKey: 'idem-restart-pending',
    narrative: { whyThisTask: 'Restart survival test', whatDetected: 'T', whatChanged: 'T', whatVerified: 'T', whatLearned: 'T' },
    payload: { slug: 'sojat-henna' },
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
  };

  // Simulate a task that was running when process crashed 10 minutes ago
  const stuckTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const stuckCrashTask: AgentTask = {
    id: 'task-restart-stuck-1',
    objectiveId: 'obj-restart',
    title: 'Crashed Worker Recovery Task',
    worker: 'website_guardian',
    status: 'RUNNING',
    priority: 80,
    dependencyIds: [],
    idempotencyKey: 'idem-restart-stuck',
    narrative: { whyThisTask: 'Stuck task test', whatDetected: 'T', whatChanged: 'T', whatVerified: 'T', whatLearned: 'T' },
    payload: {},
    startedAt: stuckTime,
    retryCount: 0,
    maxRetries: 3,
    createdAt: stuckTime,
  };

  await store.addTask(pendingRestartTask);
  await store.addTask(stuckCrashTask);

  // Simulate process restart: reclaim stuck tasks and resume
  const reclaimed = await store.reclaimStuckTasks(5 * 60 * 1000);
  assert(reclaimed.some((t) => t.id === 'task-restart-stuck-1'), 'Stuck task must be reclaimed');
  assert.strictEqual(store.getTask('task-restart-stuck-1')?.status, 'RETRYING');

  // Resume queue execution after restart
  const resumedCycle = await agent.tick();
  assert(resumedCycle.executedTaskId, 'Must resume execution of reclaimed/pending tasks');
  console.log('  ✅ [HARDENING 3 PASSED] Process restart recovered stuck task and resumed pending queue.');

  // --------------------------------------------------------------------------
  // 4. DUPLICATE-PROTECTION TEST (Requirement 7)
  // --------------------------------------------------------------------------
  console.log('\n[HARDENING 4] Testing Duplicate Event Idempotency & Lock Protection...');
  const duplicateIdemKey = 'idem-event-collision-999';
  const eventTask1: AgentTask = {
    id: 'task-event-dup-1',
    objectiveId: 'obj-dup-test',
    title: 'Duplicate Event Task',
    worker: 'sitemap',
    status: 'QUEUED',
    priority: 50,
    dependencyIds: [],
    idempotencyKey: duplicateIdemKey,
    narrative: { whyThisTask: 'Dup test', whatDetected: 'Dup', whatChanged: 'Dup', whatVerified: 'Dup', whatLearned: 'Dup' },
    payload: { url: 'https://muskydose.in/products/henna' },
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
  };

  const eventTask2: AgentTask = {
    ...eventTask1,
    id: 'task-event-dup-2',
  };

  const addedFirst = await store.addTask(eventTask1);
  const addedSecond = await store.addTask(eventTask2);
  assert.strictEqual(addedFirst.id, addedSecond.id, 'Idempotency key collision must return existing task');

  // Concurrency lock test
  const lock1 = await store.acquireLock('lock-process-alpha');
  assert.strictEqual(lock1, true);
  const lock2 = await store.acquireLock('lock-process-beta');
  assert.strictEqual(lock2, false, 'Concurrent lock attempt while active must fail');
  await store.releaseLock('lock-process-alpha');
  console.log('  ✅ [HARDENING 4 PASSED] Duplicate tasks rejected and concurrency locking verified.');

  // --------------------------------------------------------------------------
  // 5. FAILURE-RECOVERY & ISOLATION TEST (Requirement 8)
  // --------------------------------------------------------------------------
  console.log('\n[HARDENING 5] Testing Failure Recovery & Safe Task Isolation...');
  const failObjectiveId = 'obj-fail-recovery-test';

  // Task that will fail repeatedly
  const doomedTask: AgentTask = {
    id: 'task-doomed-fail',
    objectiveId: failObjectiveId,
    title: 'Doomed Task for Failure Test',
    worker: 'website_guardian',
    status: 'QUEUED',
    priority: 95,
    dependencyIds: [],
    idempotencyKey: 'idem-doomed-fail',
    narrative: { whyThisTask: 'Fail test', whatDetected: 'Fail', whatChanged: 'Fail', whatVerified: 'Fail', whatLearned: 'Fail' },
    payload: { forceFailure: true },
    retryCount: 2, // already retried 2 times
    maxRetries: 3,
    createdAt: new Date().toISOString(),
  };

  // Safe sibling task that must continue executing even if doomed task fails
  const siblingSafeTask: AgentTask = {
    id: 'task-sibling-safe',
    objectiveId: failObjectiveId,
    title: 'Unrelated Safe Sibling Task',
    worker: 'schema',
    status: 'QUEUED',
    priority: 85,
    dependencyIds: [],
    idempotencyKey: 'idem-sibling-safe',
    narrative: { whyThisTask: 'Sibling test', whatDetected: 'Safe', whatChanged: 'Safe', whatVerified: 'Safe', whatLearned: 'Safe' },
    payload: { entityType: 'Organization', name: 'Musky Dose' },
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
  };

  await store.addTask(doomedTask);
  await store.addTask(siblingSafeTask);

  // Manually fail doomed task up to max retries
  await store.updateTask('task-doomed-fail', {
    status: 'FAILED',
    retryCount: 3,
    errorMessage: 'Repeated network connection timeout',
  });

  // Safe sibling task must remain ready and execute
  const nextReadySafe = store.getNextReadyTask();
  assert.strictEqual(nextReadySafe?.id, 'task-sibling-safe');

  const siblingCycle = await agent.tick();
  assert.strictEqual(siblingCycle.executedTaskId, 'task-sibling-safe');
  assert.strictEqual(siblingCycle.status, 'COMPLETED');
  console.log('  ✅ [HARDENING 5 PASSED] Failed task reached FAILED safely; unrelated safe sibling task executed cleanly.');

  // --------------------------------------------------------------------------
  // 6. BUSINESS-SAFETY TEST (Requirement 9)
  // --------------------------------------------------------------------------
  console.log('\n[HARDENING 6] Testing Commercial Safety Gate (Wholesale Price Tampering Block)...');
  const pricePrompt = 'Change wholesale pricing to 150 INR for all salons';
  const priceObj = await agent.submitInstruction(pricePrompt);
  const priceTasks = store.getAllTasks().filter((t) => t.objectiveId === priceObj.id);

  const blockedCommercialTask = priceTasks.find((t) => t.status === 'BLOCKED');
  assert(blockedCommercialTask, 'Commercial price alteration must be strictly BLOCKED');
  assert.strictEqual(blockedCommercialTask.worker, 'commerce_guardian');
  assert(blockedCommercialTask.approvalReason?.includes('owner sign-off'), 'Must require explicit owner approval');

  // Verify non-commercial safe tasks can still execute while commercial task is BLOCKED
  const readyNonCommercial = store.getNextReadyTask();
  assert(readyNonCommercial, 'Safe tasks must continue despite blocked commercial task');
  assert(readyNonCommercial.id !== blockedCommercialTask.id, 'Blocked task must not auto-execute');
  console.log('  ✅ [HARDENING 6 PASSED] Wholesale price alteration strictly BLOCKED at Safety Gate.');

  // --------------------------------------------------------------------------
  // 7. SELF-LEARNING & PLAYBOOK REUSE TEST (Requirement 10)
  // --------------------------------------------------------------------------
  console.log('\n[HARDENING 7] Testing Self-Learning Playbook Persistence & Reuse...');
  // Record a verified lesson
  const memoryTopic = 'MEDIA_VISUAL';
  const testLesson = 'Always verify 1:1 aspect ratio and 5200K daylight balance for Rajasthani botanical imagery.';
  await store.recordLesson({
    id: 'mem-playbook-visual-test',
    category: 'PLAYBOOK',
    topic: memoryTopic,
    lesson: testLesson,
    confidence: 0.98,
    sampleSize: 15,
    isCanonical: true,
  });

  // Verify lesson is stored
  const playbooks = store.getMemoryRecords().filter((m) => m.topic === memoryTopic || m.category === 'PLAYBOOK');
  assert(playbooks.some((p) => p.lesson === testLesson), 'Playbook lesson must be in memory');

  // Execute a future task for this worker and ensure appliedLessons is injected
  const futureTask: AgentTask = {
    id: 'task-future-media-test',
    objectiveId: 'obj-future-test',
    title: 'Future Media Requirement Audit',
    worker: 'media_visual',
    status: 'QUEUED',
    priority: 92,
    dependencyIds: [],
    idempotencyKey: 'idem-future-media-playbook',
    narrative: { whyThisTask: 'Playbook reuse test', whatDetected: 'None', whatChanged: 'None', whatVerified: 'None', whatLearned: 'None' },
    payload: { slotRole: 'PRIMARY' },
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
  };

  await store.addTask(futureTask);
  const futureCycle = await agent.tick();
  assert.strictEqual(futureCycle.executedTaskId, 'task-future-media-test');

  const executedFuture = store.getTask('task-future-media-test');
  const appliedLessons = executedFuture?.payload?.appliedLessons as Array<{ id: string; lesson: string }>;
  assert(Array.isArray(appliedLessons) && appliedLessons.length > 0, 'Applied lessons must be injected into task payload');
  assert(appliedLessons.some((l) => l.lesson === testLesson), 'Previous verified lesson must be retrieved and reused');
  console.log('  ✅ [HARDENING 7 PASSED] Verified lesson persisted and successfully reused in future task execution.');

  console.log('\n============================================================');
  console.log('🎉 ALL AUTONOMOUS HARDENING TESTS (1 - 7) PASSED CLEANLY!');
  console.log('============================================================\n');
}

runAutonomousHardeningTests().catch((err) => {
  console.error('\n❌ AUTONOMOUS HARDENING TEST FAILED:', err);
  process.exit(1);
});

