import assert from 'assert';
import {
  saveGscSnapshots,
  getGscSnapshots,
  getGscQueryTrends,
} from '../lib/growth/growth-db';
import {
  normalizeGscCanonicalUrl,
  detectColdStartMode,
  classifyColdStartTier,
  detectDemandOpportunities,
} from '../lib/growth/seo-demand-engine';
import { generateGrowthOpportunities } from '../lib/growth/seo-opportunity-engine';
import { GrowthGscSnapshot, SearchConsoleQuery } from '../lib/growth/types';
import { Product } from '../lib/types';

async function runPhase9gTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 9G COLD-START ACCELERATOR TEST SUITE');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // TEST 1: DEDICATED GSC SNAPSHOT SCHEMA & FIELD STRICTNESS
  // ----------------------------------------------------
  console.log('Test 1: Dedicated GSC Snapshot Schema & Field Strictness');
  const testDate1 = '2026-09-10';
  const testSnapshot1: GrowthGscSnapshot = {
    id: 'test_snap_1',
    query: 'bulk henna powder',
    canonicalPage: 'https://muskydose.in/wholesale',
    country: 'IND',
    impressions: 12,
    clicks: 1,
    ctr: 0.0833,
    averagePosition: 8.4,
    snapshotDate: testDate1,
    source: 'GOOGLE_SEARCH_CONSOLE',
  };

  await saveGscSnapshots([testSnapshot1]);
  const fetchedSnaps = await getGscSnapshots('bulk henna powder');
  assert.ok(fetchedSnaps.length >= 1, 'Snapshot should be saved and retrievable');
  const match = fetchedSnaps.find((s) => s.id === 'test_snap_1');
  assert.ok(match, 'Saved snapshot must match ID');
  assert.strictEqual(match?.query, 'bulk henna powder');
  assert.strictEqual(match?.canonicalPage, 'https://muskydose.in/wholesale');
  assert.strictEqual(match?.country, 'IND');
  assert.strictEqual(match?.impressions, 12);
  assert.strictEqual(match?.clicks, 1);
  assert.strictEqual(match?.averagePosition, 8.4);
  assert.strictEqual(match?.snapshotDate, testDate1);
  assert.strictEqual(match?.source, 'GOOGLE_SEARCH_CONSOLE');

  // Verify Keyword Planner fields are NOT in snapshot object
  assert.strictEqual((match as any).search_volume, undefined, 'search_volume must not exist on GSC snapshot');
  assert.strictEqual((match as any).cpc, undefined, 'cpc must not exist on GSC snapshot');
  assert.strictEqual((match as any).competition, undefined, 'competition must not exist on GSC snapshot');
  console.log('  ✔ GSC snapshot schema verified with typed fields and no Keyword Planner pollution.\n');

  // ----------------------------------------------------
  // TEST 2: IDEMPOTENT DEDUPLICATION & HISTORICAL RETENTION
  // ----------------------------------------------------
  console.log('Test 2: Idempotent Deduplication & Historical Retention');
  // Upsert updated metrics on same date
  const testSnapshot1Updated: GrowthGscSnapshot = {
    id: 'test_snap_1',
    query: 'bulk henna powder',
    canonicalPage: 'https://muskydose.in/wholesale',
    country: 'IND',
    impressions: 15, // updated
    clicks: 2,      // updated
    ctr: 0.1333,
    averagePosition: 7.2,
    snapshotDate: testDate1,
    source: 'GOOGLE_SEARCH_CONSOLE',
  };
  await saveGscSnapshots([testSnapshot1Updated]);
  const snapsAfterUpdate = await getGscSnapshots('bulk henna powder');
  const snap1Updated = snapsAfterUpdate.find((s) => s.id === 'test_snap_1');
  assert.strictEqual(snap1Updated?.impressions, 15, 'Same-day snapshot should update impressions idempotently');
  assert.strictEqual(snap1Updated?.clicks, 2, 'Same-day snapshot should update clicks idempotently');

  // Add historical second date
  const testDate2 = '2026-09-12';
  const testSnapshot2: GrowthGscSnapshot = {
    id: 'test_snap_2',
    query: 'bulk henna powder',
    canonicalPage: 'https://muskydose.in/wholesale',
    country: 'IND',
    impressions: 22,
    clicks: 3,
    ctr: 0.1363,
    averagePosition: 5.8,
    snapshotDate: testDate2,
    source: 'GOOGLE_SEARCH_CONSOLE',
  };
  await saveGscSnapshots([testSnapshot2]);
  const snapsMultiDay = await getGscSnapshots('bulk henna powder');
  const day1 = snapsMultiDay.find((s) => s.snapshotDate === testDate1);
  const day2 = snapsMultiDay.find((s) => s.snapshotDate === testDate2);
  assert.ok(day1 && day2, 'Both historical date snapshots must be preserved');
  console.log('  ✔ Idempotent deduplication and multi-day snapshot retention verified.\n');

  // ----------------------------------------------------
  // TEST 3: CANONICAL URL NORMALIZATION
  // ----------------------------------------------------
  console.log('Test 3: Canonical URL Normalization');
  assert.strictEqual(
    normalizeGscCanonicalUrl('https://www.muskydose.in/wholesale/'),
    'https://muskydose.in/wholesale',
    'normalizeGscCanonicalUrl must strip www and trailing slash'
  );
  assert.strictEqual(
    normalizeGscCanonicalUrl('http://muskydose.in/products/henna/'),
    'https://muskydose.in/products/henna',
    'normalizeGscCanonicalUrl must enforce https and strip trailing slash'
  );
  assert.strictEqual(
    normalizeGscCanonicalUrl('https://muskydose.in/'),
    'https://muskydose.in',
    'Root URL must strip trailing slash'
  );
  assert.strictEqual(
    normalizeGscCanonicalUrl('/wholesale/'),
    'https://muskydose.in/wholesale',
    'Relative path must resolve to canonical host'
  );
  console.log('  ✔ Canonical URL normalization accurately strips www and trailing slashes.\n');

  // ----------------------------------------------------
  // TEST 4: COLD-START DETECTION & CONFIDENCE TIERS
  // ----------------------------------------------------
  console.log('Test 4: Cold-Start Detection & Confidence Tiers');
  const mockGsc = (partial: Partial<SearchConsoleQuery> & { query: string }): SearchConsoleQuery => ({
    id: `gsc_${Math.random().toString(36).slice(2, 9)}`,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 10.0,
    page: 'https://muskydose.in/',
    country: 'IND',
    collectedAt: new Date().toISOString(),
    sourceBadge: 'SEARCH CONSOLE',
    ...partial,
  });

  const lowVolumeQueries: SearchConsoleQuery[] = [
    mockGsc({ query: 'bulk henna powder', page: 'https://muskydose.in/wholesale', impressions: 4, clicks: 0, ctr: 0, position: 12.3 }),
    mockGsc({ query: 'organic indigo powder', page: 'https://muskydose.in/products/indigo', impressions: 6, clicks: 1, ctr: 0.166, position: 8.5 }),
  ];
  assert.strictEqual(
    detectColdStartMode(lowVolumeQueries),
    true,
    'Site with 10 total impressions must activate Cold Start mode'
  );

  const highVolumeQueries: SearchConsoleQuery[] = [
    mockGsc({ query: 'henna', page: 'https://muskydose.in', impressions: 600, clicks: 30, ctr: 0.05, position: 3.2 }),
  ];
  assert.strictEqual(
    detectColdStartMode(highVolumeQueries),
    false,
    'Site with 600 impressions must NOT be in Cold Start mode'
  );

  // Confidence tiers:
  // 1) Single impression non-commercial -> OBSERVED
  const tier1 = classifyColdStartTier({
    impressions: 1,
    clicks: 0,
    position: 42.0,
    intent: 'INFORMATIONAL',
    commercialSignal: 'LOW',
    appearancesCount: 1,
    hasDestinationMismatch: false,
  });
  assert.strictEqual(tier1, 'OBSERVED', 'Single impression non-commercial query must be OBSERVED');

  // 2) Striking distance commercial query with single snapshot -> EMERGING
  const tier2 = classifyColdStartTier({
    impressions: 3,
    clicks: 0,
    position: 14.5,
    intent: 'RETAIL',
    commercialSignal: 'MEDIUM',
    appearancesCount: 1,
    hasDestinationMismatch: false,
  });
  assert.strictEqual(tier2, 'EMERGING', 'Striking distance commercial query must be EMERGING');

  // 3) Multi-appearance high commercial query with clicks/top 10 -> ACTIONABLE
  const tier3 = classifyColdStartTier({
    impressions: 22,
    clicks: 3,
    position: 5.8,
    intent: 'B2B',
    commercialSignal: 'HIGH',
    appearancesCount: 2,
    hasDestinationMismatch: true,
  });
  assert.strictEqual(tier3, 'ACTIONABLE', 'Multi-appearance striking query with clicks must be ACTIONABLE');
  console.log('  ✔ Cold-start mode and confidence tiers (OBSERVED, EMERGING, ACTIONABLE) verified.\n');

  // ----------------------------------------------------
  // TEST 5: HISTORICAL TREND DELTAS (ZERO FABRICATION)
  // ----------------------------------------------------
  console.log('Test 5: Historical Trend Deltas (Zero Fabrication)');
  const trendsMap = await getGscQueryTrends(['bulk henna powder']);
  const trend = trendsMap.get('bulk henna powder');
  assert.ok(trend, 'Trend data for bulk henna powder should exist');
  assert.strictEqual(trend?.appearancesCount, 2, 'Should have 2 distinct snapshot appearances');
  assert.strictEqual(trend?.latestImpressions, 22);
  assert.strictEqual(trend?.latestPosition, 5.8);
  assert.strictEqual(trend?.impressionDelta, 7, '22 - 15 = 7 impression delta');
  assert.strictEqual(trend?.clickDelta, 1, '3 - 2 = 1 click delta');
  assert.strictEqual(trend?.positionDelta, 1.4, '7.2 - 5.8 = +1.4 rank improvement delta');

  // Single snapshot query must have NULL deltas (no fabricated trends)
  const singleSnap: GrowthGscSnapshot = {
    id: 'single_test_snap',
    query: 'pure indigo powder fresh harvest',
    canonicalPage: 'https://muskydose.in/products/pure-indigo-powder',
    country: 'IND',
    impressions: 5,
    clicks: 0,
    ctr: 0,
    averagePosition: 11.2,
    snapshotDate: '2026-09-12',
    source: 'GOOGLE_SEARCH_CONSOLE',
  };
  await saveGscSnapshots([singleSnap]);
  const singleTrendsMap = await getGscQueryTrends(['pure indigo powder fresh harvest']);
  const singleTrend = singleTrendsMap.get('pure indigo powder fresh harvest');
  assert.ok(singleTrend, 'Single trend should exist');
  assert.strictEqual(singleTrend?.appearancesCount, 1);
  assert.strictEqual(singleTrend?.impressionDelta, null, 'Single appearance must have NULL impressionDelta');
  assert.strictEqual(singleTrend?.clickDelta, null, 'Single appearance must have NULL clickDelta');
  assert.strictEqual(singleTrend?.positionDelta, null, 'Single appearance must have NULL positionDelta');
  console.log('  ✔ Trend deltas calculated accurately with null deltas on single appearances.\n');

  // ----------------------------------------------------
  // TEST 6: B2B COMMERCIAL INTENT ROUTING VS RETAIL ROUTING
  // ----------------------------------------------------
  console.log('Test 6: B2B Commercial Intent Routing vs Retail Routing');
  const mockProducts: Product[] = [
    {
      id: 'prod-henna-1',
      name: 'BAQ Henna Powder',
      slug: 'baq-henna-powder',
      categoryName: 'Henna & Mehndi',
      price: 249,
      isActive: true,
      stockStatus: 'in_stock',
    } as any,
  ];

  const testGscQueries: SearchConsoleQuery[] = [
    mockGsc({ query: 'bulk henna', page: 'https://muskydose.in/', impressions: 10, clicks: 0, ctr: 0, position: 9.0 }),
    mockGsc({ query: 'bulk organic indigo', page: 'https://muskydose.in/', impressions: 8, clicks: 0, ctr: 0, position: 12.0 }),
    mockGsc({ query: 'buy henna in bulk', page: 'https://muskydose.in/', impressions: 4, clicks: 0, ctr: 0, position: 15.0 }),
    mockGsc({ query: 'henna powder', page: 'https://muskydose.in/', impressions: 15, clicks: 1, ctr: 0.066, position: 14.0 }),
    mockGsc({ query: 'muskydose', page: 'https://muskydose.in/', impressions: 5, clicks: 2, ctr: 0.4, position: 1.2 }),
  ];

  const opportunities = detectDemandOpportunities({
    gscQueries: testGscQueries,
    products: mockProducts,
    guides: [],
    trendsMap,
  });

  // Verify bulk henna routes to /wholesale
  const bulkHennaOpp = opportunities.find((o) => o.query.includes('bulk henna'));
  assert.ok(bulkHennaOpp, 'bulk henna opportunity should be generated');
  assert.strictEqual(
    bulkHennaOpp?.recommendation.targetUrl,
    '/wholesale',
    'bulk henna must route to /wholesale'
  );
  assert.strictEqual(
    bulkHennaOpp?.recommendation.recommendedAction,
    'ROUTE_TO_WHOLESALE',
    'bulk henna must have ROUTE_TO_WHOLESALE action'
  );

  // Verify bulk organic indigo routes to /wholesale
  const bulkIndigoOpp = opportunities.find((o) => o.query.includes('bulk organic indigo'));
  assert.ok(bulkIndigoOpp, 'bulk organic indigo opportunity should be generated');
  assert.strictEqual(
    bulkIndigoOpp?.recommendation.targetUrl,
    '/wholesale',
    'bulk organic indigo must route to /wholesale'
  );

  // Verify generic henna does NOT route to wholesale
  const genericHennaOpp = opportunities.find((o) => o.query === 'henna powder');
  if (genericHennaOpp) {
    assert.notStrictEqual(
      genericHennaOpp.recommendation.targetUrl,
      '/wholesale',
      'generic henna powder must not route to wholesale'
    );
  }

  // Brand queries should route to homepage
  const brandOpp = opportunities.find((o) => o.query === 'muskydose');
  if (brandOpp) {
    assert.strictEqual(brandOpp.recommendation.targetUrl, '/', 'Brand queries should target homepage /');
  }
  console.log('  ✔ Commercial B2B wholesale routing vs retail catalog routing verified.\n');

  // ----------------------------------------------------
  // TEST 7: END-TO-END OPPORTUNITY GENERATOR ENRICHMENT
  // ----------------------------------------------------
  console.log('Test 7: End-to-End Opportunity Generator with Cold-Start Fields');
  const allOpps = generateGrowthOpportunities(
    mockProducts,
    [],
    testGscQueries,
    [],
    [],
    undefined,
    undefined,
    undefined,
    trendsMap
  );

  const gscOpps = allOpps.filter((o) => o.source === 'GOOGLE SEARCH CONSOLE');
  assert.ok(gscOpps.length > 0, 'Should generate GSC opportunities');

  for (const opp of gscOpps) {
    assert.ok(opp.gscPerformance, 'GSC opportunity must have gscPerformance');
    assert.strictEqual(typeof opp.gscPerformance?.impressions, 'number');
    assert.strictEqual(typeof (opp.gscPerformance?.position ?? 0), 'number');
    assert.ok(opp.coldStartTier, 'GSC opportunity must have coldStartTier populated in cold start mode');
    assert.ok(['OBSERVED', 'EMERGING', 'ACTIONABLE'].includes(opp.coldStartTier!), 'Valid coldStartTier');
  }

  const oppWithTrend = gscOpps.find((o) => o.keyword === 'bulk henna powder' || o.keyword === 'bulk henna');
  if (oppWithTrend?.trendData) {
    assert.strictEqual(typeof oppWithTrend.trendData.appearancesCount, 'number');
  }
  console.log('  ✔ End-to-end opportunity enrichment with gscPerformance, coldStartTier, and trendData verified.\n');

  console.log('====================================================');
  console.log('ALL PHASE 9G COLD-START TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runPhase9gTests().catch((err) => {
  console.error('\n❌ PHASE 9G TEST FAILURE:\n', err);
  process.exit(1);
});
