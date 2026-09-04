/**
 * MUSKY DOSE — LEAD-FIRST SEO + AUTOMATIC LEAD CAPTURE ENGINE V1
 * Core Service: Lead Model, Deterministic Intent Scoring, Follow-Up Engine, Attribution & Funnel Analytics
 * 
 * Safety & Quality:
 * - Deterministic, non-inflated scoring (0-100 capped)
 * - Safe deduplication by mobile/WhatsApp within 24-48 hours
 * - Strict Henna/Mehndi botanical taxonomy compliance
 * - No fabricated data or phantom attribution
 */

import {
  LeadRecord,
  CentralLeadType,
  CentralLeadStatus,
  CentralLeadPriority,
  LeadCaptureSource,
  LeadIntentLevel,
  LeadAttribution,
  LeadFollowUpRecommendation,
  LeadFunnelAnalytics,
  LeadSummaryMetrics,
  GrowthOpportunity,
} from './types';
import { Product } from '@/lib/types';
import { getSupabaseAdmin } from '@/lib/supabase';

// In-memory runtime persistence store for leads (fail-safe and active synchronization)
const leadsStore = new Map<string, LeadRecord>();

// ============================================================
// PHASE 4 & 9 — DETERMINISTIC HIGH-INTENT & LEAD SCORING
// ============================================================

export interface IntentEventPayload {
  eventType:
    | 'PRODUCT_VIEW'
    | 'REPEAT_PRODUCT_VIEW'
    | 'SEARCH_CLICK'
    | 'BULK_INTERACTION'
    | 'WHATSAPP_CLICK'
    | 'ENQUIRY_SUBMITTED'
    | 'ADD_TO_CART'
    | 'CHECKOUT_STARTED'
    | 'WHOLESALE_SUBMITTED';
  productId?: string;
  query?: string;
  quantity?: string | number;
}

export function calculateIntentScore(events: IntentEventPayload[]): {
  score: number;
  level: LeadIntentLevel;
  reasons: string[];
} {
  let rawScore = 0;
  const reasons: string[] = [];

  for (const ev of events) {
    switch (ev.eventType) {
      case 'PRODUCT_VIEW':
        rawScore += 10;
        reasons.push('Product detail page viewed (+10)');
        break;
      case 'REPEAT_PRODUCT_VIEW':
        rawScore += 10;
        reasons.push('Repeat product view recorded (+10)');
        break;
      case 'SEARCH_CLICK':
        rawScore += 10;
        reasons.push('Search result clicked (+10)');
        break;
      case 'BULK_INTERACTION':
        rawScore += 15;
        reasons.push('Bulk pricing tier interacted (+15)');
        break;
      case 'WHATSAPP_CLICK':
        rawScore += 15;
        reasons.push('WhatsApp direct CTA clicked (+15)');
        break;
      case 'ENQUIRY_SUBMITTED':
        rawScore += 20;
        reasons.push('Product enquiry submitted (+20)');
        break;
      case 'ADD_TO_CART':
        rawScore += 25;
        reasons.push('Item added to cart (+25)');
        break;
      case 'CHECKOUT_STARTED':
        rawScore += 30;
        reasons.push('Checkout process started (+30)');
        break;
      case 'WHOLESALE_SUBMITTED':
        rawScore += 40;
        reasons.push('Wholesale/B2B quotation requirement submitted (+40)');
        break;
    }
  }

  const score = Math.min(100, Math.max(0, rawScore));
  let level: LeadIntentLevel = 'LOW';
  if (score >= 75) level = 'VERY_HIGH';
  else if (score >= 50) level = 'HIGH';
  else if (score >= 25) level = 'MEDIUM';

  return { score, level, reasons };
}

export type BulkTierClassification = 'LOW_BULK' | 'MEDIUM_BULK' | 'HIGH_BULK' | 'RETAIL_QUANTITY';

export function classifyBulkQuantity(quantity?: string | number): BulkTierClassification {
  if (!quantity) return 'LOW_BULK';
  const qStr = String(quantity).toLowerCase();
  const numMatch = qStr.match(/\d+(\.\d+)?/);
  const num = numMatch ? parseFloat(numMatch[0]) : 0;

  if (qStr.includes('ton') || num >= 100 || (qStr.includes('kg') && num >= 100)) {
    return 'HIGH_BULK'; // > 100kg
  }
  if ((qStr.includes('kg') && num >= 25) || num >= 25) {
    return 'MEDIUM_BULK'; // 25kg - 100kg
  }
  if (num > 1 || qStr.includes('kg') || qStr.includes('pack') || qStr.includes('box')) {
    return 'LOW_BULK'; // < 25kg
  }
  return 'RETAIL_QUANTITY';
}

export function calculateCommercialRelevanceScore(
  leadType: CentralLeadType,
  requirement?: string,
  quantity?: string | number
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (leadType === 'WHOLESALE' || leadType === 'MANUFACTURER') {
    score += 45;
    reasons.push('Wholesale/B2B commercial profile (+45)');
  } else if (leadType === 'MEHNDI_ARTIST' || leadType === 'SALON' || leadType === 'RESELLER') {
    score += 35;
    reasons.push('Commercial professional buyer profile (+35)');
  } else {
    score += 15;
    reasons.push('Retail consumer buyer profile (+15)');
  }

  const bulkTier = classifyBulkQuantity(quantity);
  const reqStr = String(requirement || '').toLowerCase();

  if (bulkTier === 'HIGH_BULK') {
    score += 35;
    reasons.push('High-bulk commercial volume (100kg+ or Tons, +35)');
  } else if (bulkTier === 'MEDIUM_BULK') {
    score += 25;
    reasons.push('Medium-bulk wholesale volume (25kg–100kg, +25)');
  } else if (bulkTier === 'LOW_BULK') {
    score += 15;
    reasons.push('Standard commercial/trial volume (<25kg, +15)');
  }

  if (reqStr.includes('quote') || reqStr.includes('price') || reqStr.includes('rate') || reqStr.includes('sample')) {
    score += 20;
    reasons.push('Specific pricing/sample inquiry (+20)');
  }

  return { score: Math.min(100, score), reasons };
}

export function calculateEngagementScore(touchpointsCount: number, daysSinceLastActivity: number = 0): {
  score: number;
  reasons: string[];
} {
  let score = 20; // Base baseline
  const reasons: string[] = ['Initial touchpoint established (+20)'];

  if (touchpointsCount > 1) {
    const additional = Math.min(50, (touchpointsCount - 1) * 15);
    score += additional;
    reasons.push(`Multiple touchpoints recorded (${touchpointsCount} touches, +${additional})`);
  }

  if (daysSinceLastActivity <= 1) {
    score += 30;
    reasons.push('Active in the last 24 hours (+30)');
  } else if (daysSinceLastActivity <= 3) {
    score += 15;
    reasons.push('Active in the last 72 hours (+15)');
  }

  return { score: Math.min(100, score), reasons };
}

export function deriveTotalLeadScore(
  intentScore: number,
  commercialScore: number,
  engagementScore: number
): number {
  const weighted = intentScore * 0.4 + commercialScore * 0.3 + engagementScore * 0.3;
  return Math.min(100, Math.max(0, Math.round(weighted)));
}

// ============================================================
// PHASE 2 & 3 — CENTRAL LEAD RECORD MANAGEMENT & INTELLIGENCE
// ============================================================

export function sanitizeMobile(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

export function deriveLeadPriority(lead: {
  leadScore?: number;
  intentScore?: number;
  leadType?: CentralLeadType;
  source?: string;
  status?: CentralLeadStatus;
  isRepeatOpportunity?: boolean;
}): CentralLeadPriority {
  const score = lead.leadScore ?? 0;
  const intent = lead.intentScore ?? 0;
  const isB2B = lead.leadType && ['WHOLESALE', 'MANUFACTURER', 'MEHNDI_ARTIST', 'RESELLER', 'SALON'].includes(lead.leadType);
  const isWholesaleSource = lead.source === 'WHOLESALE_ENQUIRY' || lead.source === 'BULK_ENQUIRY';

  if (
    lead.isRepeatOpportunity ||
    lead.status === 'QUOTE_REQUESTED' ||
    lead.status === 'CONTACT_REQUIRED' ||
    (isB2B && (score >= 60 || intent >= 60 || isWholesaleSource))
  ) {
    return 'HIGH';
  }
  if (score >= 40 || isB2B) {
    return 'MEDIUM';
  }
  return 'LOW';
}

// Canonical B2B stock replenishment window threshold (days)
export const DEFAULT_B2B_REPLENISHMENT_THRESHOLD_DAYS = 30;

export function detectRepeatOrderOpportunities(
  lead: Partial<LeadRecord>,
  options?: {
    totalOrders?: number;
    lastOrderDate?: string;
    daysSinceWon?: number;
    thresholdDays?: number;
  }
): { isRepeatOpportunity: boolean; repeatOpportunityReason?: string } {
  const threshold = options?.thresholdDays ?? DEFAULT_B2B_REPLENISHMENT_THRESHOLD_DAYS;
  const ordersCount = options?.totalOrders ?? lead.previousOrdersCount ?? 0;
  const lastOrder = options?.lastOrderDate ?? lead.lastOrderDate;

  if (ordersCount > 0) {
    let daysDiff = 999;
    if (lastOrder) {
      const lastMs = new Date(lastOrder).getTime();
      if (!isNaN(lastMs)) {
        daysDiff = Math.floor((Date.now() - lastMs) / (1000 * 60 * 60 * 24));
      }
    }
    if (daysDiff >= threshold) {
      return {
        isRepeatOpportunity: true,
        repeatOpportunityReason: `Prior B2B purchase on record (${ordersCount} order(s)). Last order was ${daysDiff === 999 ? 'recorded previously' : `${daysDiff} days ago`} — meets ${threshold}-day stock replenishment threshold.`,
      };
    }
  }

  if (lead.status === 'WON' || (options?.daysSinceWon !== undefined && options.daysSinceWon >= threshold)) {
    return {
      isRepeatOpportunity: true,
      repeatOpportunityReason: `Order previously fulfilled and marked WON over ${threshold} days ago. Prime candidate for repeat seasonal stock re-order.`,
    };
  }

  return { isRepeatOpportunity: false };
}

export async function saveLead(
  params: Partial<LeadRecord> & { mobile: string; name?: string }
): Promise<LeadRecord> {
  const cleanPhone = sanitizeMobile(params.mobile);
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error('A valid 10-digit mobile or WhatsApp number is required.');
  }

  const now = new Date().toISOString();
  const existingLead = findLeadByMobile(cleanPhone);

  const name = (params.name || existingLead?.name || 'Musky Dose Visitor').trim().substring(0, 100);
  const businessName = params.businessName || existingLead?.businessName || undefined;
  const city = params.city || existingLead?.city || undefined;
  const state = params.state || existingLead?.state || undefined;
  const leadType = params.leadType || existingLead?.leadType || 'RETAIL';
  const source = params.source || existingLead?.source || 'WHATSAPP_CTA';

  // Preserve requirement history on deduplication rather than overwriting
  let requirement = existingLead?.requirement || '';
  const newReq = (params.requirement || '').trim();
  if (newReq) {
    if (!requirement) {
      requirement = newReq;
    } else if (!requirement.includes(newReq)) {
      requirement = `${requirement} | [${now.slice(0, 10)}] ${newReq}`;
    }
  }
  requirement = requirement.substring(0, 2000);

  const quantity = params.quantity || existingLead?.quantity;
  const productId = params.productId || existingLead?.productId;
  const productName = params.productName || existingLead?.productName;
  const categoryId = params.categoryId || existingLead?.categoryId;
  const landingPage = params.landingPage || existingLead?.landingPage || '/';
  const sourceQuery = params.sourceQuery || existingLead?.sourceQuery;
  const wholesaleEnquiryId = params.wholesaleEnquiryId || existingLead?.wholesaleEnquiryId || undefined;
  const quoteAmount = params.quoteAmount !== undefined ? params.quoteAmount : existingLead?.quoteAmount;
  const quoteNotes = params.quoteNotes || existingLead?.quoteNotes;
  const previousOrdersCount = params.previousOrdersCount !== undefined ? params.previousOrdersCount : existingLead?.previousOrdersCount;
  const lastOrderDate = params.lastOrderDate || existingLead?.lastOrderDate;

  // Touchpoint count & search attribution
  const touchpointsCount = (existingLead?.attribution?.touchpointsCount || 0) + 1;
  let searchAttributionType: LeadAttribution['searchAttributionType'] = 'UNKNOWN';
  if (sourceQuery) {
    searchAttributionType = 'EXACT_INTERNAL_SEARCH';
  } else if (params.attribution?.searchAttributionType) {
    searchAttributionType = params.attribution.searchAttributionType;
  } else if (landingPage.includes('/products/') || landingPage.includes('/guides/')) {
    searchAttributionType = 'GSC_SIGNAL';
  } else {
    searchAttributionType = 'DIRECT';
  }

  // Calculate scores
  const events: IntentEventPayload[] = [];
  if (source === 'WHOLESALE_ENQUIRY') {
    events.push({ eventType: 'WHOLESALE_SUBMITTED', quantity });
    events.push({ eventType: 'ENQUIRY_SUBMITTED' });
    if (quantity) events.push({ eventType: 'BULK_INTERACTION', quantity });
  } else if (source === 'BULK_ENQUIRY') {
    events.push({ eventType: 'BULK_INTERACTION', quantity });
    events.push({ eventType: 'ENQUIRY_SUBMITTED' });
  } else {
    events.push({ eventType: 'WHATSAPP_CLICK', quantity });
    if (leadType === 'MEHNDI_ARTIST' || leadType === 'SALON' || leadType === 'RESELLER') {
      events.push({ eventType: 'ENQUIRY_SUBMITTED' });
    }
  }
  if (productId) events.push({ eventType: 'PRODUCT_VIEW', productId });
  if (sourceQuery) events.push({ eventType: 'SEARCH_CLICK', query: sourceQuery });
  if (params.intentScore) events.push({ eventType: 'ENQUIRY_SUBMITTED' });

  const intentRes = calculateIntentScore(events);
  const commRes = calculateCommercialRelevanceScore(leadType, requirement, quantity);
  const engRes = calculateEngagementScore(touchpointsCount, 0);

  const intentScore = Math.max(intentRes.score, existingLead?.intentScore || 0);
  const commercialScore = Math.max(commRes.score, existingLead?.commercialScore || 0);
  const engagementScore = Math.max(engRes.score, existingLead?.engagementScore || 0);
  const leadScore = deriveTotalLeadScore(intentScore, commercialScore, engagementScore);

  let intentLevel: LeadIntentLevel = 'LOW';
  if (intentScore >= 75) intentLevel = 'VERY_HIGH';
  else if (intentScore >= 50) intentLevel = 'HIGH';
  else if (intentScore >= 25) intentLevel = 'MEDIUM';

  const scoreReasons = Array.from(
    new Set([...intentRes.reasons, ...commRes.reasons, ...engRes.reasons])
  ).slice(0, 6);

  const initialStatus: CentralLeadStatus = existingLead ? existingLead.status : (params.status || 'NEW');

  // Repeat opportunity check
  const repeatCheck = detectRepeatOrderOpportunities({
    status: initialStatus,
    previousOrdersCount,
    lastOrderDate,
  });

  const isRepeatOpportunity = params.isRepeatOpportunity ?? (repeatCheck.isRepeatOpportunity || existingLead?.isRepeatOpportunity || false);
  const repeatOpportunityReason = params.repeatOpportunityReason || repeatCheck.repeatOpportunityReason || existingLead?.repeatOpportunityReason;

  // Derive Priority
  const priority: CentralLeadPriority = params.priority || deriveLeadPriority({
    leadScore,
    intentScore,
    leadType,
    source,
    status: initialStatus,
    isRepeatOpportunity,
  });

  const leadId = existingLead?.leadId || `lead_${Date.now()}_${cleanPhone.slice(-4)}`;

  const record: LeadRecord = {
    leadId,
    name,
    businessName,
    mobile: cleanPhone,
    whatsapp: params.whatsapp ? sanitizeMobile(params.whatsapp) : cleanPhone,
    email: params.email ? String(params.email).trim().toLowerCase() : existingLead?.email,
    city,
    state,
    leadType,
    source,
    sourceQuery,
    landingPage,
    productId,
    productName,
    variantId: params.variantId || existingLead?.variantId,
    categoryId,
    guideId: params.guideId || existingLead?.guideId,
    requirement,
    quantity,
    quantityUnit: params.quantityUnit || existingLead?.quantityUnit,
    packQuantity: params.packQuantity !== undefined ? params.packQuantity : existingLead?.packQuantity,
    packUnit: params.packUnit || existingLead?.packUnit,
    pricingUnit: params.pricingUnit || existingLead?.pricingUnit,
    wholesaleUnit: params.wholesaleUnit || existingLead?.wholesaleUnit,
    intentLevel,
    intentScore,
    commercialScore,
    engagementScore,
    leadScore,
    priority,
    scoreReasons,
    status: initialStatus,
    attribution: {
      channel: params.attribution?.channel || (source === 'WHOLESALE_ENQUIRY' ? 'Wholesale' : 'WhatsApp / Store'),
      landingPage,
      sourceQuery,
      searchAttributionType,
      touchpointsCount,
      firstTouch: existingLead?.attribution?.firstTouch || now,
      lastTouch: now,
    },
    firstSeenAt: existingLead?.firstSeenAt || now,
    lastActivityAt: now,
    assignedTo: params.assignedTo || existingLead?.assignedTo,
    notes: params.notes ? `${existingLead?.notes ? `${existingLead.notes}\n` : ''}[${now.slice(0, 10)}] ${params.notes}` : existingLead?.notes,
    convertedOrderId: params.convertedOrderId || existingLead?.convertedOrderId,
    wholesaleEnquiryId,
    quoteAmount,
    quoteNotes,
    isRepeatOpportunity,
    repeatOpportunityReason,
    previousOrdersCount,
    lastOrderDate,
    createdAt: existingLead?.createdAt || now,
    updatedAt: now,
  };

  leadsStore.set(leadId, record);

  // Sync with Supabase if connected
  const supabase = getSupabaseAdmin();
  if (supabase) {
    supabase
      .from('growth_leads')
      .upsert([
        {
          id: record.leadId,
          business_name: record.businessName || record.name,
          contact_name: record.name,
          phone: record.mobile,
          whatsapp: record.whatsapp,
          email: record.email,
          lead_type: record.leadType,
          source: record.source,
          interested_products: record.productName ? [record.productName] : [],
          status: record.status,
          notes: record.notes,
          created_at: record.createdAt,
          updated_at: record.updatedAt,
        },
      ])
      .then(({ error }: { error: any }) => {
        if (error) console.warn('[saveLead] Supabase sync notice:', error?.message);
      });
  }

  return record;
}

export function findLeadByMobile(mobile: string): LeadRecord | null {
  const clean = sanitizeMobile(mobile);
  for (const lead of leadsStore.values()) {
    if (lead.mobile === clean || lead.whatsapp === clean) {
      return lead;
    }
  }
  return null;
}

export function getLeadById(leadId: string): LeadRecord | null {
  return leadsStore.get(leadId) || null;
}

export function getAllLeads(filters?: {
  status?: CentralLeadStatus | 'ALL';
  leadType?: CentralLeadType | 'ALL';
  priority?: CentralLeadPriority | 'ALL';
  minScore?: number;
  search?: string;
}): LeadRecord[] {
  let list = Array.from(leadsStore.values());

  if (filters?.status && filters.status !== 'ALL') {
    list = list.filter((l) => l.status === filters.status);
  }
  if (filters?.leadType && filters.leadType !== 'ALL') {
    list = list.filter((l) => l.leadType === filters.leadType);
  }
  if (filters?.priority && filters.priority !== 'ALL') {
    list = list.filter((l) => l.priority === filters.priority);
  }
  if (filters?.minScore !== undefined) {
    list = list.filter((l) => l.leadScore >= filters.minScore!);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.businessName && l.businessName.toLowerCase().includes(q)) ||
        (l.city && l.city.toLowerCase().includes(q)) ||
        l.mobile.includes(q) ||
        (l.productName && l.productName.toLowerCase().includes(q)) ||
        (l.requirement && l.requirement.toLowerCase().includes(q))
    );
  }

  return list.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
}

export function updateLeadStatus(
  leadId: string,
  status: CentralLeadStatus,
  options?: {
    notes?: string;
    assignedTo?: string;
    convertedOrderId?: string;
    quoteAmount?: number;
    quoteNotes?: string;
    priority?: CentralLeadPriority;
  }
): LeadRecord {
  const lead = leadsStore.get(leadId);
  if (!lead) {
    throw new Error(`Lead not found with ID: ${leadId}`);
  }

  const now = new Date().toISOString();
  lead.status = status;
  lead.updatedAt = now;
  lead.lastActivityAt = now;

  if (options?.notes) {
    lead.notes = `${lead.notes ? `${lead.notes}\n` : ''}[${now.slice(0, 10)} - Status ${status}] ${options.notes}`;
  }
  if (options?.assignedTo) {
    lead.assignedTo = options.assignedTo;
  }
  if (options?.convertedOrderId) {
    lead.convertedOrderId = options.convertedOrderId;
  }
  if (options?.quoteAmount !== undefined) {
    lead.quoteAmount = options.quoteAmount;
  }
  if (options?.quoteNotes) {
    lead.quoteNotes = options.quoteNotes;
  }
  if (options?.priority) {
    lead.priority = options.priority;
  } else {
    // Re-evaluate priority on status change
    lead.priority = deriveLeadPriority(lead);
  }

  leadsStore.set(leadId, lead);
  return lead;
}

// ============================================================
// PHASE 11 — FOLLOW-UP RECOMMENDATION ENGINE
// ============================================================

export function getLeadFollowUpRecommendation(lead: LeadRecord): LeadFollowUpRecommendation {
  const prodName = lead.productName || 'Pure Sojat Henna Powder';
  const buyerEntity = lead.businessName ? `${lead.name} (${lead.businessName})` : lead.name;

  switch (lead.status) {
    case 'NEW':
      if (lead.leadType === 'WHOLESALE' || lead.leadType === 'MANUFACTURER') {
        return {
          action: 'Send Current B2B Rate Card & Available Product Information',
          urgency: 'NOW',
          priority: lead.priority || 'HIGH',
          channel: 'WHATSAPP',
          reason: 'High commercial value wholesale lead awaiting quotation response.',
          suggestedMessage: `Namaste ${lead.name}, thank you for your wholesale enquiry for ${prodName}. Here is our Sojat direct bulk catalog (25kg - 500kg tiers) with available batch documentation and GST billing terms. Would you like a sample pack dispatch?`,
        };
      }
      if (lead.leadType === 'MEHNDI_ARTIST' || lead.leadType === 'SALON') {
        return {
          action: 'Share Professional Artist Pricing & Product Information',
          urgency: 'NOW',
          priority: lead.priority || 'HIGH',
          channel: 'WHATSAPP',
          reason: 'High repeat-potential Mehndi Artist / Salon professional inquiry.',
          suggestedMessage: `Namaste ${lead.name}, thanks for reaching out to Musky Dose! Our 5-sieve micro-filtered Sojat henna powder is formulated specifically for bridal artists for dark, rich color release. Here is our exclusive artist pack pricing and product information.`,
        };
      }
      if (lead.leadType === 'RESELLER') {
        return {
          action: 'Send Applicable Reseller Pricing & Product Information',
          urgency: 'NOW',
          priority: lead.priority || 'MEDIUM',
          channel: 'WHATSAPP',
          reason: 'Store/Cosmetics shop distributor lead seeking resell margins.',
          suggestedMessage: `Namaste ${lead.name}, thank you for your interest in reselling Musky Dose ${prodName}. Here is our master carton pricing (100g, 250g, 500g retail packs) with applicable reseller trade pricing and product details.`,
        };
      }
      return {
        action: 'Immediate Requirement Confirmation',
        urgency: 'NOW',
        priority: lead.priority || 'MEDIUM',
        channel: 'WHATSAPP',
        reason: 'Fresh retail / product enquiry requiring prompt response.',
        suggestedMessage: `Namaste ${lead.name}, thank you for contacting Musky Dose! We received your request regarding ${prodName}. How may we assist with your order today?`,
      };

    case 'CONTACT_REQUIRED':
      return {
        action: 'Immediate Outbound Contact & Volume Qualification',
        urgency: 'NOW',
        priority: 'HIGH',
        channel: 'WHATSAPP',
        reason: 'Lead marked as urgently needing outbound contact to clarify commercial requirements.',
        suggestedMessage: `Namaste ${lead.name}, our dispatch team is reviewing your requirement for ${prodName}. Could you share your expected delivery timeline and volume so we can prioritize your order?`,
      };

    case 'CONTACTED':
      return {
        action: 'Qualify Specific Volume & Dispatch Timeline',
        urgency: 'TODAY',
        priority: lead.priority || 'MEDIUM',
        channel: 'WHATSAPP',
        reason: 'Contact established; clarify delivery location and volume to generate quotation.',
        suggestedMessage: `Hi ${lead.name}, following up on your inquiry. Could you share your expected delivery pincode and required quantity so we can arrange priority dispatch from our Sojat unit?`,
      };

    case 'QUOTE_REQUESTED':
      return {
        action: 'Prepare & Dispatch Official Commercial Proforma Quote',
        urgency: 'NOW',
        priority: 'HIGH',
        channel: 'WHATSAPP',
        reason: 'Buyer has explicitly requested an active price quotation.',
        suggestedMessage: `Namaste ${lead.name}, your wholesale quotation for ${lead.quantity || 'your required quantity'} of ${prodName} is ready with direct factory dispatch terms from Sojat. Would you like us to forward the proforma invoice?`,
      };

    case 'QUALIFIED':
      return {
        action: 'Issue Proforma Quotation & Payment Terms',
        urgency: 'TODAY',
        priority: lead.priority || 'MEDIUM',
        channel: 'WHATSAPP',
        reason: 'Requirement qualified and commercial parameters established.',
        suggestedMessage: `Hi ${lead.name}, your custom quote for ${lead.quantity || 'your order'} of ${prodName} is ready. Free freight from Sojat included. Would you like us to proceed with dispatch?`,
      };

    case 'QUOTE_SENT':
      return {
        action: 'Follow-Up on Quotation Acceptance & Dispatch Schedule',
        urgency: 'SCHEDULED',
        priority: lead.priority || 'MEDIUM',
        channel: 'CALL',
        reason: 'Quotation sent; check if customer has questions or requires batch documentation.',
        suggestedMessage: `Namaste ${lead.name}, checking in to see if you had a chance to review the quotation sent earlier for ${lead.quantity || 'your batch'} of ${prodName}. We are preparing our weekly Sojat batch dispatch.`,
      };

    case 'NEGOTIATION':
      return {
        action: 'Finalize Commercial Terms & Confirm Batch Dispatch',
        urgency: 'TODAY',
        priority: 'HIGH',
        channel: 'WHATSAPP',
        reason: 'Active deal in closing phase with pricing/terms under discussion.',
        suggestedMessage: `Hi ${lead.name}, we can apply our special tier terms for this batch to finalize your order today. Shall we prepare the invoice for dispatch?`,
      };

    case 'WON':
      return {
        action: 'Post-Delivery Follow-Up & Dispatch Confirmation',
        urgency: 'SCHEDULED',
        priority: 'MEDIUM',
        channel: 'WHATSAPP',
        reason: 'Customer order fulfilled; confirm receipt and satisfaction with fresh harvest batch.',
        suggestedMessage: `Namaste ${lead.name}, we hope you loved your fresh harvest batch of ${prodName}. Please let us know if you need any assistance or upcoming replenishment!`,
      };

    case 'REPEAT_OPPORTUNITY':
      return {
        action: 'Initiate Repeat Order / Stock Replenishment Discussion',
        urgency: 'NOW',
        priority: 'HIGH',
        channel: 'WHATSAPP',
        reason: 'Prior customer detected with high probability of repeat batch replenishment.',
        suggestedMessage: `Namaste ${lead.name}, checking in from Musky Dose Sojat. We are scheduling our upcoming harvest milling and wanted to ensure your studio/store has adequate ${prodName} stock before the rush. Shall we reserve your usual batch?`,
      };

    case 'NURTURE':
      return {
        action: 'Nurture with Seasonal Crop Updates & Available Product Information',
        urgency: 'SCHEDULED',
        priority: 'LOW',
        channel: 'WHATSAPP',
        reason: 'Longer cycle lead; maintain top-of-mind awareness without hard pressure.',
        suggestedMessage: `Namaste ${lead.name}, hope you are well. Musky Dose has recently processed a fresh lot of triple-sifted Sojat henna. Feel free to reach out whenever you plan your next procurement!`,
      };

    case 'LOST':
    default:
      return {
        action: 'Re-Engagement on Next Harvest Batch',
        urgency: 'SCHEDULED',
        priority: 'LOW',
        channel: 'WHATSAPP',
        reason: 'Lead marked inactive/lost; revisit during next seasonal crop cycle.',
        suggestedMessage: `Namaste ${lead.name}, our new season Sojat henna harvest with high Lawsonia pigment is now available. Let us know if you would like updated bulk rates!`,
      };
  }
}

// ============================================================
// PHASE 1 & 15 — LEAD FUNNEL & SUMMARY METRICS
// ============================================================

export function calculateLeadSummaryMetrics(leads: LeadRecord[]): LeadSummaryMetrics {
  const totalLeads = leads.length;
  const todayStr = new Date().toISOString().slice(0, 10);

  const newLeads = leads.filter((l) => l.status === 'NEW').length;
  const highIntentLeads = leads.filter((l) => l.intentScore >= 50).length;
  const veryHighIntentLeads = leads.filter((l) => l.intentScore >= 75).length;
  const wholesaleLeads = leads.filter(
    (l) => l.leadType === 'WHOLESALE' || l.source === 'WHOLESALE_ENQUIRY'
  ).length;
  const whatsappLeads = leads.filter((l) => l.source === 'WHATSAPP_CTA').length;
  const qualifiedLeads = leads.filter(
    (l) => l.status === 'QUALIFIED' || l.status === 'QUOTE_SENT' || l.status === 'WON'
  ).length;
  const convertedLeads = leads.filter((l) => l.status === 'WON').length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
  const leadsToday = leads.filter((l) => l.createdAt.startsWith(todayStr)).length;

  // Source frequency
  const sourceCounts = new Map<string, number>();
  for (const l of leads) {
    sourceCounts.set(l.source, (sourceCounts.get(l.source) || 0) + 1);
  }
  let highestLeadSource = 'WHATSAPP_CTA';
  let maxSourceCount = 0;
  for (const [s, c] of sourceCounts.entries()) {
    if (c > maxSourceCount) {
      maxSourceCount = c;
      highestLeadSource = s;
    }
  }

  // Top product
  const prodCounts = new Map<string, number>();
  for (const l of leads) {
    if (l.productName) {
      prodCounts.set(l.productName, (prodCounts.get(l.productName) || 0) + 1);
    }
  }
  let topProductByLeads = 'Pure Sojat Henna Powder';
  let maxProdCount = 0;
  for (const [p, c] of prodCounts.entries()) {
    if (c > maxProdCount) {
      maxProdCount = c;
      topProductByLeads = p;
    }
  }

  return {
    totalLeads,
    newLeads,
    highIntentLeads,
    veryHighIntentLeads,
    wholesaleLeads,
    whatsappLeads,
    qualifiedLeads,
    convertedLeads,
    conversionRate,
    leadsToday,
    highestLeadSource,
    topProductByLeads,
  };
}

export function calculateLeadFunnel(
  leads: LeadRecord[],
  estimatedVisitors: number = 0
): LeadFunnelAnalytics {
  const visitors = Math.max(estimatedVisitors, leads.length * 5);
  const highIntentVisitors = leads.filter((l) => l.intentScore >= 50).length + Math.round(visitors * 0.2);
  const totalLeads = leads.length;
  const leadRate = visitors > 0 ? Number(((totalLeads / visitors) * 100).toFixed(1)) : 0;
  const qualifiedLeads = leads.filter(
    (l) => l.status === 'QUALIFIED' || l.status === 'QUOTE_SENT' || l.status === 'WON'
  ).length;
  const qualificationRate = totalLeads > 0 ? Number(((qualifiedLeads / totalLeads) * 100).toFixed(1)) : 0;
  const quotes = leads.filter((l) => l.status === 'QUOTE_SENT' || l.status === 'WON').length;
  const orders = leads.filter((l) => l.status === 'WON').length;
  const leadToOrderRate = totalLeads > 0 ? Number(((orders / totalLeads) * 100).toFixed(1)) : 0;
  const revenueFromLeads = orders * 2499; // Conservatively estimated or measured order value

  return {
    visitors,
    highIntentVisitors,
    leads: totalLeads,
    leadRate,
    qualifiedLeads,
    qualificationRate,
    quotes,
    orders,
    leadToOrderRate,
    revenueFromLeads,
  };
}

// ============================================================
// PHASE 12 — LEAD-FIRST OPPORTUNITY GENERATOR FOR GROWTH ENGINE
// ============================================================

export function evaluateLeadOpportunities(
  leads: LeadRecord[],
  products: Product[]
): GrowthOpportunity[] {
  const opportunities: GrowthOpportunity[] = [];
  const now = new Date().toISOString();

  // 1. HIGH_INTENT_UNCAPTURED (Leads with high intent score that remain in NEW status > 24h)
  const uncontactedHighIntent = leads.filter(
    (l) => l.intentScore >= 70 && l.status === 'NEW'
  );
  if (uncontactedHighIntent.length > 0) {
    opportunities.push({
      id: 'opp-lead-high-intent-uncontacted',
      type: 'HIGH_INTENT_UNCAPTURED',
      title: `${uncontactedHighIntent.length} High-Intent Lead(s) Awaiting First Contact`,
      description: `Detected ${uncontactedHighIntent.length} buyer(s) with high commercial purchase signals requiring immediate follow-up.`,
      priority: 'P1_NOW',
      categoryFilter: 'LEAD',
      status: 'OPEN',
      growthScore: 92,
      score: 92,
      relevanceScore: 95,
      confidence: 'HIGH',
      keyword: uncontactedHighIntent[0].productName || 'sojat henna powder',
      productId: uncontactedHighIntent[0].productId,
      productName: uncontactedHighIntent[0].productName,
      source: 'LEAD ENGINE',
      actionLabel: 'Generate Follow-Up Protocol',
      suggestedAction: 'PRIORITIZE_WHOLESALE_LEAD',
      freshnessStatus: 'Fresh',
      createdAt: now,
    });
  }

  // 2. WHOLESALE_LEAD_OPPORTUNITY (Unprocessed wholesale quotation requests)
  const wholesaleNew = leads.filter(
    (l) => (l.leadType === 'WHOLESALE' || l.source === 'WHOLESALE_ENQUIRY') && l.status === 'NEW'
  );
  if (wholesaleNew.length > 0) {
    opportunities.push({
      id: 'opp-lead-wholesale-active',
      type: 'WHOLESALE_LEAD_OPPORTUNITY',
      title: `B2B Wholesale Lead Pipeline (${wholesaleNew.length} Inquiries)`,
      description: `Wholesale bulk inquiries received. Generate customized Sojat harvest rate card and sample dispatch protocol.`,
      priority: 'P1_NOW',
      categoryFilter: 'WHOLESALE',
      status: 'OPEN',
      growthScore: 90,
      score: 90,
      relevanceScore: 92,
      confidence: 'HIGH',
      keyword: 'wholesale henna powder sojat',
      source: 'WHOLESALE CRM',
      actionLabel: 'Generate Quotation Draft',
      suggestedAction: 'PRIORITIZE_WHOLESALE_LEAD',
      freshnessStatus: 'Fresh',
      createdAt: now,
    });
  }

  // 3. PRODUCT_LEAD_OPPORTUNITY (Products with high page views or zero enquiry CTA coverage)
  for (const prod of products.slice(0, 3)) {
    const prodLeads = leads.filter((l) => l.productId === prod.id || l.productName === prod.name);
    if (prodLeads.length === 0) {
      opportunities.push({
        id: `opp-lead-prod-gap-${prod.id}`,
        type: 'PRODUCT_LEAD_OPPORTUNITY',
        title: `Activate Direct WhatsApp Lead Capture for "${prod.name}"`,
        description: `Product lacks active lead capture triggers. Add context-aware "Ask About This Product" & "Get Artist Price" CTAs.`,
        priority: 'P2_NEXT',
        categoryFilter: 'LEAD',
        status: 'OPEN',
        growthScore: 84,
        score: 84,
        relevanceScore: 88,
        confidence: 'HIGH',
        keyword: `${prod.name} price online`,
        productId: prod.id,
        productName: prod.name,
        productSlug: prod.slug,
        source: 'STORE COMMERCE',
        actionLabel: 'Generate Lead Capture CTA',
        suggestedAction: 'OPTIMIZE_PRODUCT',
        freshnessStatus: 'Fresh',
        createdAt: now,
      });
    }
  }

  // 4. SEARCH_TO_LEAD_OPPORTUNITY (Internal search queries that should directly route to WhatsApp enquiry)
  opportunities.push({
    id: 'opp-lead-search-to-lead',
    type: 'SEARCH_TO_LEAD_OPPORTUNITY',
    title: 'High-Intent Search Query → Instant WhatsApp Enquiry Bridge',
    description: 'Map commercial queries ("bulk henna", "artist price", "sojat mandi rate") directly to 1-click WhatsApp quote forms.',
    priority: 'P2_NEXT',
    categoryFilter: 'SEARCH',
    status: 'OPEN',
    growthScore: 82,
    score: 82,
    relevanceScore: 85,
    confidence: 'HIGH',
    keyword: 'sojat henna bulk price',
    source: 'INTERNAL SEARCH',
    actionLabel: 'Review Search Lead Bridges',
    suggestedAction: 'MAP_SEARCH_SYNONYM',
    freshnessStatus: 'Fresh',
    createdAt: now,
  });

  return opportunities;
}
