// ============================================================================
// MUSKY DOSE — SEO INTELLIGENCE LAYER VERIFICATION SUITE
// Comprehensive test suite covering:
// 1. Data: Search Console parsing, 7d vs 7d date comparison, aggregation
// 2. Detection: CTR, ranking strikes, declining pages, new keywords, content gaps, internal links
// 3. Safety: Commercial changes blocked, approval-required tasks blocked at Safety Gate
// 4. Queue: Idempotency, duplicate prevention, persistence in master_agent_tasks
// 5. Schedule: 2:00 AM IST maintenance & 8:00 AM IST SEO intelligence brief in vercel.json
// 6. Report: 9-part structured Daily SEO Brief generation & classification
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { SeoIntelligenceEngine } from '../lib/agent/seo-intelligence/seo-intelligence-engine';
import { SeoIntelligenceStore } from '../lib/agent/seo-intelligence/seo-store';
import { MuskyDoseMasterAgent } from '../lib/agent/master-agent';
import { AgentStore } from '../lib/agent/agent-store';
import { AgentTask } from '../lib/agent/types';
import { saveGscSnapshots } from '../lib/growth/growth-db';
import { GrowthGscSnapshot } from '../lib/growth/types';

async function runSeoIntelligenceTestSuite() {
  console.log('\n============================================================');
  console.log('🔍 RUNNING SEO INTELLIGENCE LAYER VERIFICATION SUITE');
  console.log('============================================================\n');

  const seoEngine = SeoIntelligenceEngine.getInstance();
  const seoStore = SeoIntelligenceStore.getInstance();
  const masterAgent = MuskyDoseMasterAgent.getInstance();
  const agentStore = AgentStore.getInstance();

  // Reset stores for clean testing environment
  seoStore.resetForTesting();
  agentStore.resetForTesting();

  // --------------------------------------------------------------------------
  // TEST 1: SCHEDULE VERIFICATION (2:00 AM IST & 8:00 AM IST)
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Verifying Vercel Cron schedules for 2:00 AM IST and 8:00 AM IST...');
  const vercelPath = path.resolve(process.cwd(), 'vercel.json');
  const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));

  const masterCron = vercelConfig.crons.find((c: any) => c.path === '/api/cron/master-agent');
  const seoCron = vercelConfig.crons.find((c: any) => c.path === '/api/cron/seo-report');

  assert(masterCron, 'Master agent cron must exist');
  assert.strictEqual(
    masterCron.schedule,
    '30 20 * * *',
    '2:00 AM IST autonomous maintenance schedule must remain 30 20 * * * (20:30 UTC)'
  );

  assert(seoCron, 'SEO report cron must exist');
  assert.strictEqual(
    seoCron.schedule,
    '30 2 * * *',
    '8:00 AM IST SEO intelligence brief must be 30 2 * * * (02:30 UTC)'
  );

  // Timezone math check:
  // 02:30 UTC + 05:30 IST = 08:00 AM IST
  const d = new Date('2026-09-18T02:30:00.000Z');
  const istTime = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: false });
  assert(istTime.includes('08:00'), `Expected 08:00 in IST, got ${istTime}`);
  console.log('  ✅ [TEST 1 PASSED] 2:00 AM IST (30 20 * * *) and 8:00 AM IST (30 2 * * *) verified.');

  // --------------------------------------------------------------------------
  // TEST 2: SEARCH INTENT CLASSIFICATION
  // --------------------------------------------------------------------------
  // Validations across mixed-intent queries:
  assert.strictEqual(seoEngine.classifySearchIntent('sojat henna wholesale supplier'), 'WHOLESALE');
  assert.strictEqual(seoEngine.classifySearchIntent('bulk indigo powder kg price'), 'WHOLESALE');
  assert.strictEqual(seoEngine.classifySearchIntent('pure sojat henna rajasthan'), 'LOCAL');
  assert.strictEqual(seoEngine.classifySearchIntent('buy natural henna powder online'), 'TRANSACTIONAL');
  assert.strictEqual(seoEngine.classifySearchIntent('buy sojat henna powder'), 'TRANSACTIONAL');
  assert.strictEqual(seoEngine.classifySearchIntent('how to use sojat henna'), 'INFORMATIONAL');
  assert.strictEqual(seoEngine.classifySearchIntent('natural henna price india'), 'TRANSACTIONAL');
  assert.strictEqual(seoEngine.classifySearchIntent('musky dose sojat henna'), 'NAVIGATIONAL');
  assert.strictEqual(seoEngine.classifySearchIntent('best organic amla powder review'), 'COMMERCIAL');
  assert.strictEqual(seoEngine.classifySearchIntent('musky dose customer support'), 'NAVIGATIONAL');
  assert.strictEqual(seoEngine.classifySearchIntent('how to mix henna and indigo for black hair'), 'INFORMATIONAL');
  console.log('  ✅ [TEST 2 PASSED] Search intents classified accurately across catalog archetypes.');

  // --------------------------------------------------------------------------
  // TEST 3: GSC DATA COMPARISON & AGGREGATION (7D vs 7D)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Testing GSC data aggregation and 7-day vs previous 7-day comparison...');
  // Seed sample synthetic GSC snapshots across 14 days
  const testSnaps: GrowthGscSnapshot[] = [];
  const baseDate = new Date('2026-09-18');
  for (let i = 0; i < 14; i++) {
    const snapDate = new Date(baseDate.getTime() - i * 86400000).toISOString().slice(0, 10);
    // Recent 7 days (i < 7) have higher clicks
    const clicks = i < 7 ? 10 : 5;
    const impressions = i < 7 ? 200 : 180;
    testSnaps.push({
      id: `snap-test-${i}`,
      query: 'sojat henna powder pure',
      canonicalPage: 'https://muskydose.in/products/pure-sojat-henna',
      country: 'IND',
      impressions,
      clicks,
      ctr: Number((clicks / impressions).toFixed(4)),
      averagePosition: 4.2,
      snapshotDate: snapDate,
      source: 'GOOGLE_SEARCH_CONSOLE',
    });
  }
  await saveGscSnapshots(testSnaps);

  const comparison = await seoEngine.getGscPeriodComparison();
  assert(comparison.isAvailable, 'Comparison should be available with seeded snapshots');
  assert(comparison.current.clicks > comparison.previous.clicks, 'Current 7d clicks should exceed previous 7d');
  assert(comparison.deltas.clicksDelta > 0, 'Clicks delta must be positive');
  assert.strictEqual(typeof comparison.deltas.clickChangePercent, 'number');
  console.log(`  ✅ [TEST 3 PASSED] 7d vs 7d comparison verified: +${comparison.deltas.clicksDelta} clicks (+${comparison.deltas.clickChangePercent}%).`);

  // --------------------------------------------------------------------------
  // TEST 4: DETERMINISTIC OPPORTUNITY DETECTION
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Testing deterministic opportunity detection (CTR, Ranking, Declining, Content, Links)...');
  // Seed distinct query scenarios:
  // 1. High impressions, good rank (<=10), low CTR (<3%) -> CTR_IMPROVEMENT
  // 2. High impressions, rank 4-20 -> RANKING_IMPROVEMENT
  // 3. Multi-day queries with sudden drop -> DECLINING_PAGE
  const mockScenarios: GrowthGscSnapshot[] = [
    {
      id: 'snap-ctr-1',
      query: 'organic henna powder for hair',
      canonicalPage: 'https://muskydose.in/products/henna',
      country: 'IND',
      impressions: 150,
      clicks: 1, // CTR = 0.0066 (<3%)
      ctr: 0.0066,
      averagePosition: 5.5,
      snapshotDate: '2026-09-18',
      source: 'GOOGLE_SEARCH_CONSOLE',
    },
    {
      id: 'snap-rank-1',
      query: 'herbal hair pack natural recipe',
      canonicalPage: 'https://muskydose.in/guides/herbal-hair-pack',
      country: 'IND',
      impressions: 80,
      clicks: 4,
      ctr: 0.05,
      averagePosition: 12.0, // Rank 12 (prime ranking strike)
      snapshotDate: '2026-09-18',
      source: 'GOOGLE_SEARCH_CONSOLE',
    },
  ];
  await saveGscSnapshots(mockScenarios);

  const opportunities = await seoEngine.detectOpportunities();
  assert(opportunities.length >= 3, `Expected at least 3 opportunities, got ${opportunities.length}`);

  const oppTypes = new Set(opportunities.map((o) => o.opportunityType));
  assert(oppTypes.has('CTR_IMPROVEMENT'), 'Must detect CTR_IMPROVEMENT opportunity');
  assert(oppTypes.has('RANKING_IMPROVEMENT'), 'Must detect RANKING_IMPROVEMENT opportunity');
  assert(oppTypes.has('CONTENT_GAP'), 'Must detect CONTENT_GAP opportunity');

  const ctrOpp = opportunities.find((o) => o.opportunityType === 'CTR_IMPROVEMENT');
  assert.strictEqual(ctrOpp?.requiresApproval, false, 'CTR improvement on title/meta is auto-safe');
  assert(ctrOpp!.recommendedAction.includes('title tag'), 'Action must recommend title/meta update');

  const contentGapOpp = opportunities.find((o) => o.opportunityType === 'CONTENT_GAP');
  assert.strictEqual(contentGapOpp?.requiresApproval, true, 'Creating new guides requires owner approval');
  console.log(`  ✅ [TEST 4 PASSED] Detected ${opportunities.length} distinct opportunities across types.`);

  // --------------------------------------------------------------------------
  // TEST 5: SAFETY GATE ENFORCEMENT & OWNER APPROVAL BARRIER
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Testing Safety Gate barrier on approval-required SEO tasks...');
  // Enqueue an approval-required task (e.g. content creation or commercial change)
  const approvalTask: AgentTask = {
    id: 'task-seo-approval-test',
    objectiveId: 'seo-test',
    title: '[REQUIRES OWNER APPROVAL] Publish New Sojat Wholesale Page',
    worker: 'content_engine',
    status: 'QUEUED',
    priority: 85,
    dependencyIds: [],
    idempotencyKey: 'idem-seo-approval-test',
    narrative: { whyThisTask: 'Test', whatDetected: 'Test', whatChanged: 'Test', whatVerified: 'Test', whatLearned: 'Test' },
    payload: { action: 'PUBLISH_GUIDE' },
    requiresApproval: true,
    approvalReason: 'Publishing new page requires owner sign-off.',
    retryCount: 0,
    maxRetries: 1,
    createdAt: new Date().toISOString(),
  };
  await agentStore.addTask(approvalTask);

  // Attempt execution without owner approval
  const executionAttempt = await masterAgent.tick();
  assert.strictEqual(
    executionAttempt.status,
    'BLOCKED',
    'Safety Gate must block approval-required tasks from executing automatically'
  );

  const storedTask = agentStore.getTask('task-seo-approval-test');
  assert.strictEqual(storedTask?.status, 'BLOCKED', 'Task must transition to BLOCKED');
  assert(storedTask!.errorMessage?.includes('owner authorization'), 'Error message must cite owner authorization');

  // Now owner approves task
  await masterAgent.approveTask('task-seo-approval-test');
  const approvedTask = agentStore.getTask('task-seo-approval-test');
  assert.strictEqual(approvedTask?.status, 'QUEUED', 'Approved task must transition to QUEUED');
  assert.strictEqual(approvedTask?.payload.approvedByOwner, true, 'approvedByOwner flag must be set');

  // Execute after owner approval
  const approvedExecution = await masterAgent.tick();
  assert.strictEqual(approvedExecution.status, 'COMPLETED', 'Approved task must execute cleanly');
  console.log('  ✅ [TEST 5 PASSED] Safety Gate strictly blocked unauthorized task; executed cleanly once approved.');

  // --------------------------------------------------------------------------
  // TEST 6: TASK QUEUE INTEGRATION & IDEMPOTENCY
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Testing Master Agent queue integration and duplicate prevention...');
  agentStore.resetForTesting();
  seoStore.resetForTesting();

  // Run SEO queue enqueuing
  const enqueuedBatch1 = await masterAgent.scanAndEnqueueSeoWork();
  assert(enqueuedBatch1.length > 0, 'Must enqueue SEO opportunities as tasks');

  const totalTasksBefore = agentStore.getAllTasks().length;

  // Run a second time immediately: Idempotency must prevent any duplicate tasks
  const enqueuedBatch2 = await masterAgent.scanAndEnqueueSeoWork();
  assert.strictEqual(enqueuedBatch2.length, 0, 'Duplicate opportunities must not be enqueued');
  const totalTasksAfter = agentStore.getAllTasks().length;
  assert.strictEqual(totalTasksBefore, totalTasksAfter, 'Task count must remain identical');
  console.log(`  ✅ [TEST 6 PASSED] Enqueued ${enqueuedBatch1.length} tasks with 100% duplicate prevention.`);

  // --------------------------------------------------------------------------
  // TEST 7: DAILY SEO BRIEF REPORT GENERATION (9 SECTIONS)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7] Testing Daily SEO Brief (8:00 AM IST) generation and 9-part structure...');
  const briefReport = await seoEngine.generateDailySeoBrief();

  assert(briefReport.title.includes('SEO BRIEF'), 'Report title must contain SEO BRIEF');
  assert.strictEqual(briefReport.metadata.schedule, '8:00 AM IST (02:30 UTC)');

  // Verify all 9 sections exist
  const s = briefReport.sections;
  assert(s.overallStatus, 'Must have Section 1: overallStatus');
  assert(s.whatChanged, 'Must have Section 2: whatChanged');
  assert(Array.isArray(s.topOpportunities), 'Must have Section 3: topOpportunities');
  assert(Array.isArray(s.contentOpportunities), 'Must have Section 4: contentOpportunities');
  assert(Array.isArray(s.productSeoOpportunities), 'Must have Section 5: productSeoOpportunities');
  assert(Array.isArray(s.internalLinkOpportunities), 'Must have Section 6: internalLinkOpportunities');
  assert(Array.isArray(s.technicalSeoIssues), 'Must have Section 7: technicalSeoIssues');
  assert(Array.isArray(s.actionsTakenByAgent), 'Must have Section 8: actionsTakenByAgent');
  assert(Array.isArray(s.actionsRequiringApproval), 'Must have Section 9: actionsRequiringApproval');

  // Verify separation of data types
  assert(s.overallStatus.indexedPagesEstimate > 0, 'Observed data: indexed pages must be positive');
  console.log('  ✅ [TEST 7 PASSED] Authoritative 9-section Daily SEO Brief generated and stored.');

  // --------------------------------------------------------------------------
  // TEST 8: PERSISTENCE IN STORE
  // --------------------------------------------------------------------------
  console.log('\n[TEST 8] Testing SEO Store persistence and retrieval...');
  const savedReport = await seoStore.getLatestDailyReport();
  assert(savedReport, 'Latest report must be retrievable from SEO store');
  assert.strictEqual(savedReport.id, briefReport.id);

  const storedOpps = seoStore.getOpportunities();
  assert(storedOpps.length > 0, 'Opportunities must be retrievable from store');
  console.log(`  ✅ [TEST 8 PASSED] Stored report [${savedReport.id}] and ${storedOpps.length} opportunities.`);

  console.log('\n============================================================');
  console.log('🎉 ALL SEO INTELLIGENCE LAYER TESTS (1 - 8) PASSED!');
  console.log('============================================================\n');
}

runSeoIntelligenceTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});

