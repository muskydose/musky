import fs from 'fs';

// Safe Environment Loader
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  });
}

import {
  getAutopilotState,
  updateAutopilotState,
  runAutopilotCycle,
  setKillSwitch,
  setAutopilotPaused,
  getAutopilotActions,
  getLearningPatterns,
  rollbackAction,
  rollbackLastAction,
  approveQueuedAction,
  rejectQueuedAction,
  classifyActionRiskLevel,
  saveAutopilotAction,
  AutopilotActionRecord,
} from '../lib/growth/autopilot-engine';

async function runAutopilotTests() {
  console.log('========================================================================');
  console.log('🤖 VERIFYING MUSKY DOSE TRUE AUTOPILOT ENGINE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Initial State & Capability Discovery
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Autopilot Initial State & Capabilities ---');
  const state = await getAutopilotState();
  assert(typeof state.isPaused === 'boolean', 'Autopilot state has boolean isPaused flag');
  assert(typeof state.killSwitchActive === 'boolean', 'Autopilot state has boolean killSwitchActive flag');
  assert(typeof state.totalCyclesExecuted === 'number', 'Autopilot state has numeric totalCyclesExecuted counter');

  // --------------------------------------------------------------------------
  // TEST 2: Risk Level Classification (Autonomous vs Approval Boundary)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Risk Level Classification & Governance Boundary ---');
  assert(classifyActionRiskLevel('SEO_METADATA_UPDATE') === 'LOW', 'SEO_METADATA_UPDATE is classified as LOW risk (Autonomous)');
  assert(classifyActionRiskLevel('SCHEMA_REFRESH') === 'LOW', 'SCHEMA_REFRESH is classified as LOW risk (Autonomous)');
  assert(classifyActionRiskLevel('INTERNAL_LINK_MAINTENANCE') === 'LOW', 'INTERNAL_LINK_MAINTENANCE is classified as LOW risk (Autonomous)');
  assert(classifyActionRiskLevel('FEED_REFRESH') === 'LOW', 'FEED_REFRESH is classified as LOW risk (Autonomous)');
  assert(classifyActionRiskLevel('AI_MEDIA_CANDIDATE') === 'LOW', 'AI_MEDIA_CANDIDATE is classified as LOW risk (Candidate only)');
  assert(classifyActionRiskLevel('SOCIAL_DRAFT') === 'LOW', 'SOCIAL_DRAFT is classified as LOW risk (Draft only)');

  assert(classifyActionRiskLevel('NEW_PUBLIC_PAGE') === 'HIGH', 'NEW_PUBLIC_PAGE is classified as HIGH risk (Approval Required)');
  assert(classifyActionRiskLevel('PUBLISH_AI_MEDIA') === 'HIGH', 'PUBLISH_AI_MEDIA is classified as HIGH risk (Approval Required)');
  assert(classifyActionRiskLevel('LIVE_EXTERNAL_PUBLISH') === 'HIGH', 'LIVE_EXTERNAL_PUBLISH is classified as HIGH risk (Approval Required)');
  assert(classifyActionRiskLevel('CATALOG_ARCHIVE') === 'HIGH', 'CATALOG_ARCHIVE is classified as HIGH risk (Approval Required)');

  // --------------------------------------------------------------------------
  // TEST 3: Emergency Kill Switch Gating
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Emergency Kill Switch Protection ---');
  await setKillSwitch(true);
  const killSwitchState = await getAutopilotState();
  assert(killSwitchState.killSwitchActive === true, 'Kill switch successfully activated');

  const killedCycleResult = await runAutopilotCycle();
  assert(killedCycleResult.status === 'SKIPPED_KILL_SWITCH', 'Cycle was immediately aborted when kill switch is active');
  assert(killedCycleResult.actionsExecuted === 0, 'Zero actions executed while kill switch active');

  // Reset kill switch
  await setKillSwitch(false);
  const restoredState = await getAutopilotState();
  assert(restoredState.killSwitchActive === false, 'Kill switch successfully deactivated');

  // --------------------------------------------------------------------------
  // TEST 4: Pause / Resume Toggle
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Pause & Resume Controls ---');
  await setAutopilotPaused(true);
  const pausedState = await getAutopilotState();
  assert(pausedState.isPaused === true, 'Autopilot successfully paused');

  const pausedCycleResult = await runAutopilotCycle();
  assert(pausedCycleResult.status === 'SKIPPED_PAUSED', 'Cycle was skipped cleanly when paused');

  // Resume
  await setAutopilotPaused(false);
  const resumedState = await getAutopilotState();
  assert(resumedState.isPaused === false, 'Autopilot successfully resumed');

  // --------------------------------------------------------------------------
  // TEST 5: Concurrency Locking Against Overlapping Executions
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Concurrency Lock Protection ---');
  const futureLock = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await updateAutopilotState({ concurrencyLockUntil: futureLock });

  const lockedResult = await runAutopilotCycle();
  assert(lockedResult.status === 'SKIPPED_LOCKED', 'Cycle safely skipped when concurrency lock is held');

  // Release lock
  await updateAutopilotState({ concurrencyLockUntil: null });

  // --------------------------------------------------------------------------
  // TEST 6: Real Execution of Full Autonomous Loop
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Autonomous Cycle Execution (Observe -> Act -> Verify) ---');
  const cycleResult = await runAutopilotCycle({ force: true });
  assert(cycleResult.status === 'COMPLETED', `Cycle completed successfully: ${cycleResult.message}`);
  assert(cycleResult.durationMs >= 0, `Duration recorded: ${cycleResult.durationMs}ms`);

  const updatedState = await getAutopilotState();
  assert(Boolean(updatedState.lastRunAt), 'lastRunAt updated with timestamp');
  assert(Boolean(updatedState.nextScheduledRunAt), 'nextScheduledRunAt scheduled (+4 hours)');
  assert(updatedState.totalCyclesExecuted > 0, `totalCyclesExecuted incremented (got: ${updatedState.totalCyclesExecuted})`);

  // --------------------------------------------------------------------------
  // TEST 7: Actions Audit, Governance & Baseline Capture
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Action Records, Governance & Snapshot Integrity ---');
  const actions = await getAutopilotActions(20);
  assert(actions.length > 0, `Actions recorded in database/memory (found: ${actions.length})`);

  for (const act of actions.slice(0, 5)) {
    assert(Boolean(act.id), `Action has valid ID: ${act.id}`);
    assert(Boolean(act.hypothesis), `Action has grounded hypothesis: ${act.hypothesis.slice(0, 40)}...`);
    assert(!act.hypothesis.toLowerCase().includes('will increase'), 'Hypothesis NEVER claims guaranteed causality ("will increase")');
    assert(act.confidenceScore >= 0 && act.confidenceScore <= 1, 'Action has valid confidence score (0.0 to 1.0)');
    assert(['FACT', 'SIGNAL', 'INFERENCE'].includes(act.learningCategory), `Valid learning category: ${act.learningCategory}`);

    if (act.actionType === 'SEO_METADATA_UPDATE') {
      assert(Boolean(act.provenance), 'SEO action includes verified canonical provenance');
      assert(Boolean(act.epistemicBreakdown), 'SEO action includes separate FACT, SIGNAL, HYPOTHESIS breakdown');
      assert(Boolean(act.epistemicBreakdown?.fact), 'Epistemic breakdown includes verified fact');
      assert(Boolean(act.epistemicBreakdown?.signal), 'Epistemic breakdown includes observed signal');
      assert(Boolean(act.epistemicBreakdown?.hypothesis), 'Epistemic breakdown includes non-guaranteed hypothesis');
      if (act.provenance && !act.provenance.isSojatVerified) {
        assert(
          !act.actionPayload?.newSeoTitle?.includes('Sojat'),
          'Product without verified DB Sojat origin does NOT have Sojat injected into title'
        );
      }
    }

    if (act.riskLevel === 'HIGH') {
      assert(act.status === 'PENDING_APPROVAL', 'High-risk action is STRICTLY queued as PENDING_APPROVAL');
    }
  }

  // --------------------------------------------------------------------------
  // TEST 8: 1-Click Rollback Mechanism
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: 1-Click Rollback & Undo Last Safe Action ---');
  // Create a synthetic test action to verify rollback
  const testRollbackAction: AutopilotActionRecord = {
    id: `test-rollback-${Date.now()}`,
    actionType: 'SEO_METADATA_UPDATE',
    entityType: 'PRODUCT',
    entityId: 'prod-1',
    riskLevel: 'LOW',
    status: 'AUTO_EXECUTED',
    baseline: {
      beforeSnapshot: {
        seoTitle: 'Original Test Henna Title',
        seoDescription: 'Original Test Description 100g',
      },
    },
    hypothesis: 'Test rollback execution hypothesis',
    actionPayload: {
      newSeoTitle: 'New Modified Title',
      newSeoDescription: 'New Modified Description',
    },
    confidenceScore: 0.8,
    learningCategory: 'FACT',
    isRollbackable: true,
    createdAt: new Date().toISOString(),
    executedAt: new Date().toISOString(),
  };

  await saveAutopilotAction(testRollbackAction);

  const rollbackRes = await rollbackAction(testRollbackAction.id);
  assert(rollbackRes.success === true, `Rollback succeeded: ${rollbackRes.message}`);

  const actionsAfterRollback = await getAutopilotActions(20);
  const revertedAction = actionsAfterRollback.find((a) => a.id === testRollbackAction.id);
  assert(revertedAction?.status === 'REVERTED', 'Action status updated to REVERTED');
  assert(Boolean(revertedAction?.rolledBackAt), 'Action has rolledBackAt timestamp');

  // Test Undo Last Action
  const undoRes = await rollbackLastAction();
  assert(typeof undoRes.success === 'boolean', `Undo last action handled gracefully (success: ${undoRes.success})`);

  // --------------------------------------------------------------------------
  // TEST 9: Approval Queue Decision Lifecycle (Approve & Reject)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: Approval Queue Lifecycle (Approve & Reject) ---');
  const testQueuedActionApprove: AutopilotActionRecord = {
    id: `test-queued-app-${Date.now()}`,
    actionType: 'NEW_PUBLIC_PAGE',
    entityType: 'GUIDE',
    entityId: 'guide-test-approval',
    riskLevel: 'HIGH',
    status: 'PENDING_APPROVAL',
    baseline: {},
    hypothesis: 'Approval test hypothesis',
    actionPayload: { title: 'Test Guide for Approval' },
    confidenceScore: 0.7,
    learningCategory: 'INFERENCE',
    isRollbackable: true,
    createdAt: new Date().toISOString(),
  };
  await saveAutopilotAction(testQueuedActionApprove);

  const approveRes = await approveQueuedAction(testQueuedActionApprove.id);
  assert(approveRes.success === true, 'Admin successfully approved queued action');

  const testQueuedActionReject: AutopilotActionRecord = {
    id: `test-queued-rej-${Date.now()}`,
    actionType: 'PUBLISH_AI_MEDIA',
    entityType: 'PRODUCT',
    entityId: 'prod-test-reject',
    riskLevel: 'HIGH',
    status: 'PENDING_APPROVAL',
    baseline: {},
    hypothesis: 'Reject test hypothesis',
    actionPayload: { assetId: 'med-123' },
    confidenceScore: 0.6,
    learningCategory: 'INFERENCE',
    isRollbackable: true,
    createdAt: new Date().toISOString(),
  };
  await saveAutopilotAction(testQueuedActionReject);

  const rejectRes = await rejectQueuedAction(testQueuedActionReject.id);
  assert(rejectRes.success === true, 'Admin successfully rejected queued action');

  // --------------------------------------------------------------------------
  // TEST 10: Self-Learning Patterns & Weight Modifiers
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: Self-Learning Patterns & Outcome Tracking ---');
  const patterns = await getLearningPatterns();
  assert(patterns.length >= 2, `Discovered ${patterns.length} learning patterns (expected at least 2)`);

  const winningPattern = patterns.find((p) => p.patternType === 'WINNING');
  assert(Boolean(winningPattern), 'Found WINNING pattern in learning engine');
  assert(winningPattern?.weightModifier! > 1.0, `Winning pattern has weight modifier > 1.0 (got: ${winningPattern?.weightModifier}x)`);
  assert(Boolean(winningPattern?.patternDescription), 'Pattern has human-readable explanation');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 AUTOPILOT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAutopilotTests().catch((err) => {
  console.error('Autopilot test execution failed:', err);
  process.exit(1);
});

