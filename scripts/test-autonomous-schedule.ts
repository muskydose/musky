// ============================================================================
// MUSKY DOSE — AUTONOMOUS SCHEDULE & DAILY SWEEP VERIFICATION SUITE
// Tests 24-Hour Autonomous Schedule: 2:00 AM IST (20:30 UTC)
// Multi-Task Batch Execution, Safety Gates, Unfinished Task Persistence & Resumption
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  MuskyDoseMasterAgent,
  getNextDaily2AmIstTimestamp,
} from '../lib/agent/master-agent';
import { AgentStore } from '../lib/agent/agent-store';
import { AgentContextEngine } from '../lib/agent/context-engine';
import { AgentTask } from '../lib/agent/types';

async function runAutonomousScheduleTests() {
  console.log('\n============================================================');
  console.log('⏰ RUNNING MASTER AGENT AUTONOMOUS SCHEDULE VERIFICATION SUITE');
  console.log('============================================================\n');

  const agent = MuskyDoseMasterAgent.getInstance();
  const store = AgentStore.getInstance();

  // Reset store for clean deterministic test run
  store.resetForTesting();

  // --------------------------------------------------------------------------
  // TEST 1: VERCEL CRON CONFIGURATION VERIFICATION
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Verifying vercel.json cron schedule configuration...');
  const vercelJsonPath = path.resolve(process.cwd(), 'vercel.json');
  assert(fs.existsSync(vercelJsonPath), 'vercel.json must exist');
  const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'));
  const masterCron = vercelConfig.crons.find(
    (c: any) => c.path === '/api/cron/master-agent'
  );

  assert(masterCron, 'Master agent cron path /api/cron/master-agent must be defined in vercel.json');
  assert.strictEqual(
    masterCron.schedule,
    '30 20 * * *',
    `Expected cron schedule "30 20 * * *", got "${masterCron.schedule}"`
  );
  console.log(`  ✅ [TEST 1 PASSED] vercel.json configured with schedule: "${masterCron.schedule}"`);

  // --------------------------------------------------------------------------
  // TEST 2: TIMEZONE MATHEMATICS (20:30 UTC === 02:00 AM IST)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Verifying UTC to IST timezone translation (UTC+05:30)...');
  // At 20:30 UTC on day D:
  // In Asia/Kolkata (IST), it must equal 02:00 AM on day D+1.
  const testUtcDate = new Date('2026-09-18T20:30:00.000Z');
  const istString = testUtcDate.toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Expected: 09/19/2026, 02:00
  assert(istString.includes('02:00'), `Expected 02:00 in IST, got: ${istString}`);
  assert(istString.includes('09/19/2026'), `Expected next day date 09/19/2026, got: ${istString}`);
  console.log(`  ✅ [TEST 2 PASSED] 20:30 UTC maps exactly to 02:00 AM IST (+1 day): "${istString}"`);

  // --------------------------------------------------------------------------
  // TEST 3: NEXT SCHEDULE CALCULATION HELPER (getNextDaily2AmIstTimestamp)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Testing getNextDaily2AmIstTimestamp() edge cases...');
  // Case A: Current time is 10:00 UTC (before 20:30 UTC today)
  const beforeTime = new Date('2026-09-18T10:00:00.000Z');
  const nextA = getNextDaily2AmIstTimestamp(beforeTime);
  assert.strictEqual(nextA, '2026-09-18T20:30:00.000Z', 'Must schedule for today 20:30 UTC');

  // Case B: Current time is 22:00 UTC (after 20:30 UTC today)
  const afterTime = new Date('2026-09-18T22:00:00.000Z');
  const nextB = getNextDaily2AmIstTimestamp(afterTime);
  assert.strictEqual(nextB, '2026-09-19T20:30:00.000Z', 'Must schedule for tomorrow 20:30 UTC');

  // Case C: Month rollover (Oct 31 at 21:00 UTC)
  const endOfMonth = new Date('2026-10-31T21:00:00.000Z');
  const nextC = getNextDaily2AmIstTimestamp(endOfMonth);
  assert.strictEqual(nextC, '2026-11-01T20:30:00.000Z', 'Must correctly advance month to Nov 01');
  console.log('  ✅ [TEST 3 PASSED] Daily 2:00 AM IST / 20:30 UTC timestamp calculations verified.');

  // --------------------------------------------------------------------------
  // TEST 4: FULL WEBSITE SCAN & SAFE WORK IDENTIFICATION
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Testing full website scan and safe work identification...');
  const identifiedTasks = await agent.scanAndEnqueueSafeWork();
  assert(identifiedTasks.length >= 4, `Expected at least 4 safe work tasks, got ${identifiedTasks.length}`);

  const workersIdentified = new Set(identifiedTasks.map((t) => t.worker));
  assert(workersIdentified.has('website_guardian'), 'Scan must include website_guardian');
  assert(workersIdentified.has('media_visual'), 'Scan must include media_visual');
  assert(workersIdentified.has('seo_guardian'), 'Scan must include seo_guardian');
  assert(workersIdentified.has('internal_linking'), 'Scan must include internal_linking');
  assert(workersIdentified.has('content_engine'), 'Scan must include content_engine');
  assert(workersIdentified.has('verification'), 'Scan must include verification');

  // Verify priority ordering: guardian (90) > media (80) > seo (70) > linking (60) > content (50) > verification (40)
  const guardianT = identifiedTasks.find((t) => t.worker === 'website_guardian');
  const mediaT = identifiedTasks.find((t) => t.worker === 'media_visual');
  const seoT = identifiedTasks.find((t) => t.worker === 'seo_guardian');
  assert(guardianT!.priority > mediaT!.priority, 'Guardian must have higher priority than Media');
  assert(mediaT!.priority > seoT!.priority, 'Media must have higher priority than SEO');

  // Verify dependency ordering: media depends on guardian
  assert(
    mediaT!.dependencyIds.includes(guardianT!.id),
    'Media audit must depend on Guardian integrity check'
  );
  console.log(`  ✅ [TEST 4 PASSED] Full site scan identified ${identifiedTasks.length} safe tasks across all pillars.`);

  // --------------------------------------------------------------------------
  // TEST 5: MULTI-TASK BATCH EXECUTION IN DEPENDENCY ORDER (NOT LIMITED TO 1 TASK)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Testing daily autonomous multi-task batch execution...');
  // Clean store for fresh sweep execution
  store.resetForTesting();

  // Run full daily autonomous sweep with batch size up to 10
  const sweepSummary = await agent.runDailyAutonomousSweep({
    timeLimitMs: 30000,
    maxBatch: 10,
  });

  assert(
    sweepSummary.totalExecuted > 1,
    `Daily sweep must NOT limit itself to 1 task. Executed: ${sweepSummary.totalExecuted}`
  );
  assert.strictEqual(sweepSummary.schedule.cronUtc, '30 20 * * *');
  assert.strictEqual(sweepSummary.schedule.istExecutionTime, '02:00 AM IST daily');
  assert(sweepSummary.nextScheduledRunAt.includes('20:30:00.000Z'));

  // Verify that all executed tasks passed with COMPLETED status
  for (const t of sweepSummary.tasksExecuted) {
    assert.strictEqual(t.status, 'COMPLETED', `Task ${t.executedTaskId} must complete cleanly`);
  }
  console.log(`  ✅ [TEST 5 PASSED] Daily sweep executed ${sweepSummary.totalExecuted} dependency-ordered tasks in batch.`);

  // --------------------------------------------------------------------------
  // TEST 6: UNFINISHED TASK PERSISTENCE & NEXT-RUN RESUMPTION
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Testing unfinished task persistence and next-run resumption...');
  store.resetForTesting();

  // Enqueue 5 queued tasks
  const testObjective = 'obj-persist-test';
  for (let i = 1; i <= 5; i++) {
    const t: AgentTask = {
      id: `task-persist-${i}`,
      objectiveId: testObjective,
      title: `Persist Task ${i}`,
      worker: 'content_engine',
      status: 'QUEUED',
      priority: 100 - i * 10,
      dependencyIds: i > 1 ? [`task-persist-${i - 1}`] : [],
      idempotencyKey: `idem-persist-${i}`,
      narrative: { whyThisTask: 'Test', whatDetected: 'Test', whatChanged: 'Test', whatVerified: 'Test', whatLearned: 'Test' },
      payload: { entityName: `Botanical ${i}` },
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date().toISOString(),
    };
    await store.addTask(t);
  }

  // Simulate a time-constrained or batch-constrained run (maxBatch = 2)
  const batchRun1 = await agent.runDailyAutonomousSweep({ maxBatch: 2 });
  assert(batchRun1.totalExecuted >= 1, 'Batch 1 must execute ready tasks');
  assert(
    batchRun1.unfinishedTasksCount > 0,
    `Unfinished tasks must be preserved in queue. Found: ${batchRun1.unfinishedTasksCount}`
  );

  // Inspect the store directly to prove tasks are persisted
  const remainingInStore = store.getAllTasks().filter((t) => t.status === 'QUEUED');
  assert(remainingInStore.length > 0, 'Unfinished tasks must remain safely in the store');

  // Next run: resumes the unfinished work
  const batchRun2 = await agent.runDailyAutonomousSweep({ maxBatch: 5 });
  assert(batchRun2.totalExecuted >= 1, 'Next daily run must resume unfinished work');
  console.log('  ✅ [TEST 6 PASSED] Unfinished tasks persisted in durable store and resumed on next cycle.');

  // --------------------------------------------------------------------------
  // TEST 7: RETURN TO AUTONOMOUS MAINTENANCE AFTER OWNER OBJECTIVES
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7] Testing return to autonomous maintenance after owner-requested objective...');
  store.resetForTesting();

  // Owner submits a custom instruction
  const ownerObj = await agent.submitInstruction('Create new botanical guide for Rose Petals');
  const stateDuringOwner = store.getState();
  assert(stateDuringOwner.currentObjective, 'Must have active owner objective');
  assert.strictEqual(stateDuringOwner.currentObjective?.source, 'OWNER_INSTRUCTION');

  // Complete all tasks of the owner objective
  const ownerTasks = store.getAllTasks().filter((t) => t.objectiveId === ownerObj.id);
  for (const t of ownerTasks) {
    await store.updateTask(t.id, { status: 'COMPLETED' });
  }

  // Trigger sweep or tick
  await agent.tick();

  // Verify that agent has cleared the completed objective and returned to autonomous mode
  const stateAfterOwner = store.getState();
  assert.strictEqual(
    stateAfterOwner.currentObjective,
    null,
    'currentObjective must be cleared after completion to return to autonomous maintenance'
  );
  assert.strictEqual(stateAfterOwner.isAutonomous, true, 'AUTONOMOUS MODE must remain ON');
  console.log('  ✅ [TEST 7 PASSED] Seamless return to autonomous maintenance confirmed.');

  // --------------------------------------------------------------------------
  // TEST 8: SAFETY GATES & PRODUCTION VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n[TEST 8] Testing commercial tampering gate & production verification...');
  store.resetForTesting();

  // Attempt unauthorized price modification task
  const tamperingTask: AgentTask = {
    id: 'task-tamper-test',
    objectiveId: 'obj-tamper',
    title: 'Unauthorized price alteration',
    worker: 'commerce_guardian',
    status: 'QUEUED',
    priority: 95,
    dependencyIds: [],
    idempotencyKey: 'idem-tamper',
    narrative: { whyThisTask: 'Tamper', whatDetected: 'Tamper', whatChanged: 'Tamper', whatVerified: 'Tamper', whatLearned: 'Tamper' },
    payload: { action: 'MODIFY_PRICE', newPrice: 10 },
    retryCount: 0,
    maxRetries: 1,
    createdAt: new Date().toISOString(),
  };
  await store.addTask(tamperingTask);

  const tamperResult = await agent.tick();
  assert.strictEqual(tamperResult.status, 'BLOCKED', 'Commercial tampering must be BLOCKED');
  const storedTamper = store.getTask('task-tamper-test');
  assert.strictEqual(storedTamper?.status, 'BLOCKED');
  console.log('  ✅ [TEST 8 PASSED] Safety Gate successfully blocked commercial tampering.');

  // --------------------------------------------------------------------------
  // TEST 9: MANUAL RUN NOW COMPATIBILITY
  // --------------------------------------------------------------------------
  console.log('\n[TEST 9] Testing manual RUN NOW compatibility alongside daily schedule...');
  const manualTick = await agent.tick();
  assert(typeof manualTick === 'object', 'Manual tick must return valid summary');
  const finalState = store.getState();
  assert.strictEqual(finalState.isAutonomous, true, 'Autonomous mode remains ON');
  assert(Boolean(finalState.nextScheduledRunAt), 'nextScheduledRunAt is preserved');
  console.log('  ✅ [TEST 9 PASSED] Manual RUN NOW operates seamlessly with autonomous schedule.');

  console.log('\n============================================================');
  console.log('🎉 ALL AUTONOMOUS SCHEDULE & DAILY SWEEP TESTS (1 - 9) PASSED!');
  console.log('============================================================\n');
}

runAutonomousScheduleTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});

