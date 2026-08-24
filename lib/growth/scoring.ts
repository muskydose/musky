import { GrowthMarketMetric, ScoreBreakdown } from './types';

export interface RawMarketFactors {
  ordersCount: number;
  revenue: number;
  customersCount: number;
  repeatCustomersCount: number;
  wholesaleLeadsCount: number;
  retailLeadsCount: number;
  artistLeadsCount: number;
  campaignOrdersCount: number;
  campaignRevenue: number;
  unitsSold: number;
  previousPeriodRevenue?: number;
  competitorsInRegion?: number;
}

export function calculateMarketOpportunityScore(factors: RawMarketFactors): {
  score: number;
  breakdown: ScoreBreakdown;
  label: string;
} {
  const {
    ordersCount,
    revenue,
    customersCount,
    repeatCustomersCount,
    wholesaleLeadsCount,
    retailLeadsCount,
    artistLeadsCount,
    campaignOrdersCount,
    campaignRevenue,
    previousPeriodRevenue = 0,
    competitorsInRegion = 0,
  } = factors;

  // 1. Sales Performance (Max 30 pts)
  // Scale against target benchmarks (e.g., 50 orders / ₹50,000 revenue)
  const revPts = Math.min(20, (revenue / 50000) * 20);
  const orderPts = Math.min(10, (ordersCount / 50) * 10);
  const salesScore = Math.round(revPts + orderPts);

  // 2. Customer Growth & Repeat Rate (Max 20 pts)
  let growthPts = 0;
  if (previousPeriodRevenue > 0) {
    const growthRate = (revenue - previousPeriodRevenue) / previousPeriodRevenue;
    growthPts = Math.min(10, Math.max(0, growthRate * 10));
  } else if (revenue > 0) {
    growthPts = 5;
  }
  const repeatRate = customersCount > 0 ? repeatCustomersCount / customersCount : 0;
  const repeatPts = Math.min(10, repeatRate * 10);
  const growthScore = Math.round(growthPts + repeatPts);

  // 3. Lead Volume (Max 15 pts)
  const totalLeads = wholesaleLeadsCount + retailLeadsCount + artistLeadsCount;
  const leadsScore = Math.round(Math.min(15, (totalLeads / 15) * 15));

  // 4. Wholesale Activity (Max 15 pts)
  const wholesaleScore = Math.round(Math.min(15, (wholesaleLeadsCount / 5) * 15));

  // 5. Product Fit (Max 10 pts)
  // Higher AOV or multi-unit orders indicate strong fit
  const aov = ordersCount > 0 ? revenue / ordersCount : 0;
  const productFitScore = Math.round(Math.min(10, (aov / 1000) * 10));

  // 6. Campaign Response (Max 10 pts)
  const campOrdersRatio = ordersCount > 0 ? campaignOrdersCount / ordersCount : 0;
  const campaignResponseScore = Math.round(Math.min(10, campOrdersRatio * 10));

  // 7. Penalties
  const competitionPenalty = Math.round(Math.min(10, competitorsInRegion * 2));

  // Insufficient Data Penalty (if orders < 3 and total leads < 2)
  let insufficientDataPenalty = 0;
  if (ordersCount === 0 && totalLeads === 0) {
    insufficientDataPenalty = 40;
  } else if (ordersCount < 3 && totalLeads < 2) {
    insufficientDataPenalty = 20;
  }

  const rawSum =
    salesScore +
    growthScore +
    leadsScore +
    wholesaleScore +
    productFitScore +
    campaignResponseScore -
    competitionPenalty -
    insufficientDataPenalty;

  const score = Math.max(0, Math.min(100, Math.round(rawSum)));

  let label = 'Low Opportunity';
  if (ordersCount === 0 && totalLeads === 0) {
    label = 'Insufficient Verified Data (Sample size: 0)';
  } else if (ordersCount < 3 && totalLeads < 2) {
    label = `Low Sample Size (${ordersCount} order(s), ${totalLeads} lead(s))`;
  } else if (score >= 75) {
    label = 'High Opportunity';
  } else if (score >= 50) {
    label = 'Moderate Opportunity';
  }

  const breakdown: ScoreBreakdown = {
    salesScore,
    growthScore,
    leadsScore,
    wholesaleScore,
    productFitScore,
    campaignResponseScore,
    competitionPenalty,
    insufficientDataPenalty,
  };

  return { score, breakdown, label };
}
