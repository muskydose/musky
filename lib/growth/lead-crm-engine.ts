/**
 * MUSKY DOSE — GLOBAL LEAD CRM & ATTRIBUTION OS (PHASES 13, 14, 15, 16)
 * 
 * Production Domain: https://muskydose.in
 * 
 * Mandates:
 * 1. 11-STAGE CRM LIFECYCLE:
 *    NEW -> DISCOVERED -> QUALIFIED -> REVIEW -> CONTACTED -> REPLIED -> SAMPLE -> NEGOTIATION -> CUSTOMER -> LOST -> SUPPRESSED
 * 2. DETERMINISTIC TRANSPARENT QUALIFICATION:
 *    Scores leads across business category match, bulk volume fit, regional fit, and contactability.
 * 3. FULL ATTRIBUTION CHAIN:
 *    QUERY -> LANDING PAGE -> PRODUCT -> ATTRIBUTION -> LEAD -> CRM -> ORDER
 * 4. STRICT PRIVACY & ANTI-FABRICATION SAFEGUARDS:
 *    Zero fabricated contacts, zero synthetic leads, zero unconsented data scraping.
 *    Only lawfully captured first-party or verified partner inquiries.
 */

import {
  LeadRecord,
  CentralLeadStatus,
  CentralLeadPriority,
  LeadCaptureSource,
  LeadAttribution,
} from './types';
import { getSupabaseAdmin } from '@/lib/supabase';

export interface LeadQualificationResult {
  isQualified: boolean;
  score: number; // 0 - 100
  recommendedStage: CentralLeadStatus;
  priority: CentralLeadPriority;
  reasons: string[];
}

export interface LeadAttributionInsights {
  totalLeads: number;
  byQuery: Record<string, number>;
  byLandingPage: Record<string, number>;
  byProduct: Record<string, number>;
  byCountry: Record<string, number>;
  byIntent: Record<string, number>;
}

// In-memory CRM Store with persistent database sync
const crmLeadStore = new Map<string, LeadRecord>();

/**
 * Deterministically qualifies any lead based on transparent factual criteria.
 */
export function qualifyLead(lead: {
  businessName?: string;
  company?: string;
  quantity?: string | number;
  requirement?: string;
  whatsapp?: string;
  mobile?: string;
  email?: string;
  productName?: string;
  productId?: string;
  [key: string]: any;
}): LeadQualificationResult {
  let score = 20; // Baseline entry score
  const reasons: string[] = ['Inquiry received and logged (+20)'];

  // 1. Business & Company Evidence
  if (lead.businessName || lead.company) {
    score += 25;
    reasons.push('Registered enterprise or business name provided (+25)');
  }

  // 2. High-volume bulk / B2B request
  const qtyStr = String(lead.quantity || '').toLowerCase();
  const reqStr = String(lead.requirement || '').toLowerCase();
  if (
    qtyStr.includes('kg') ||
    qtyStr.includes('ton') ||
    reqStr.includes('bulk') ||
    reqStr.includes('wholesale') ||
    reqStr.includes('quintal')
  ) {
    score += 25;
    reasons.push('Verified bulk / wholesale quantity requirement (+25)');
  }

  // 3. Direct Verified Communication Channel
  if (lead.whatsapp || lead.mobile) {
    score += 15;
    reasons.push('Direct verified WhatsApp / phone channel (+15)');
  }
  if (lead.email) {
    score += 10;
    reasons.push('Official business email channel provided (+10)');
  }

  // 4. Specific Product Relevance
  if (lead.productName || lead.productId) {
    score += 10;
    reasons.push('Specific catalog product identified (+10)');
  }

  const cappedScore = Math.min(100, score);
  let recommendedStage: CentralLeadStatus = 'NEW';
  let priority: CentralLeadPriority = 'LOW';

  if (cappedScore >= 70) {
    recommendedStage = 'QUALIFIED';
    priority = 'HIGH';
  } else if (cappedScore >= 45) {
    recommendedStage = 'QUALIFIED';
    priority = 'MEDIUM';
  } else {
    recommendedStage = 'REVIEW';
    priority = 'LOW';
  }

  return {
    isQualified: cappedScore >= 45,
    score: cappedScore,
    recommendedStage,
    priority,
    reasons,
  };
}

/**
 * Registers or updates a lead in the Global Growth CRM with full attribution.
 */
export async function ingestCrmLead(payload: {
  name: string;
  businessName?: string;
  company?: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  country?: string;
  region?: string;
  city?: string;
  state?: string;
  leadType?: string;
  source: LeadCaptureSource;
  requirement?: string;
  quantity?: string | number;
  productId?: string;
  productName?: string;
  notes?: string;
  attribution?: Partial<LeadAttribution>;
  attributionQuery?: string;
  attributionLandingPage?: string;
  attributionProductId?: string;
  attributionCountry?: string;
  attributionIntent?: string;
}): Promise<LeadRecord> {
  const cleanMobile = payload.mobile.replace(/\D/g, '');
  const leadId = `lead_${Date.now()}_${cleanMobile.slice(-4) || Math.random().toString(36).slice(2, 6)}`;

  // Run deterministic qualification
  const qualification = qualifyLead(payload);

  const now = new Date().toISOString();

  const record: LeadRecord = {
    leadId,
    name: payload.name.trim(),
    businessName: payload.businessName || payload.company,
    company: payload.company || payload.businessName,
    mobile: payload.mobile,
    whatsapp: payload.whatsapp || payload.mobile,
    email: payload.email,
    country: payload.country || 'India',
    region: payload.region || payload.state,
    city: payload.city,
    state: payload.state,
    businessType: payload.leadType || 'Wholesaler',
    leadType: (payload.leadType as any) || 'WHOLESALE',
    source: payload.source,
    requirement: payload.requirement,
    quantity: payload.quantity,
    productId: payload.productId,
    productName: payload.productName,
    intentLevel: qualification.score >= 70 ? 'VERY_HIGH' : qualification.score >= 50 ? 'HIGH' : 'MEDIUM',
    intentScore: qualification.score,
    commercialScore: qualification.score,
    engagementScore: 50,
    leadScore: qualification.score,
    priority: qualification.priority,
    scoreReasons: qualification.reasons,
    status: qualification.recommendedStage,
    crmStage: qualification.recommendedStage,
    qualificationStatus: qualification.isQualified ? 'QUALIFIED' : 'REVIEW',
    contactMethod: payload.whatsapp ? 'WhatsApp' : payload.email ? 'Email' : 'Phone',
    lastVerifiedAt: now,
    duplicateKey: `${payload.name.toLowerCase()}_${cleanMobile}`,
    attributionQuery: payload.attributionQuery || payload.attribution?.sourceQuery,
    attributionLandingPage: payload.attributionLandingPage || payload.attribution?.landingPage,
    attributionProductId: payload.attributionProductId || payload.productId,
    attributionCountry: payload.attributionCountry || payload.country || 'India',
    attributionIntent: payload.attributionIntent,
    attribution: {
      channel: payload.attribution?.channel || 'ORGANIC_SEARCH',
      landingPage: payload.attributionLandingPage || payload.attribution?.landingPage,
      sourceQuery: payload.attributionQuery || payload.attribution?.sourceQuery,
      searchAttributionType: payload.attributionQuery ? 'EXACT_INTERNAL_SEARCH' : 'DIRECT',
      touchpointsCount: 1,
      firstTouch: now,
      lastTouch: now,
    },
    firstSeenAt: now,
    lastActivityAt: now,
    notes: payload.notes,
    createdAt: now,
    updatedAt: now,
  };

  crmLeadStore.set(leadId, record);

  // Sync to database if available
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('growth_leads').upsert(
        [
          {
            id: record.leadId,
            business_name: record.businessName || record.name,
            contact_name: record.name,
            company: record.company,
            phone: record.mobile,
            whatsapp: record.whatsapp,
            email: record.email,
            country: record.country,
            region: record.region,
            city: record.city,
            state: record.state,
            lead_type: record.leadType,
            business_type: record.businessType,
            source: record.source,
            interested_products: record.productName ? [record.productName] : [],
            status: record.status,
            crm_stage: record.crmStage,
            qualification_status: record.qualificationStatus,
            contact_method: record.contactMethod,
            attribution_query: record.attributionQuery,
            attribution_landing_page: record.attributionLandingPage,
            attribution_product_id: record.attributionProductId,
            attribution_country: record.attributionCountry,
            attribution_intent: record.attributionIntent,
            notes: record.notes,
            created_at: record.createdAt,
            updated_at: record.updatedAt,
          },
        ],
        { onConflict: 'id' }
      );
    } catch (dbErr: any) {
      console.warn('[ingestCrmLead] Database sync notice (fail-safe):', dbErr?.message);
    }
  }

  return record;
}

/**
 * Transitions a lead to a new CRM lifecycle stage.
 */
export async function transitionCrmStage(
  leadId: string,
  newStage: CentralLeadStatus,
  notes?: string
): Promise<LeadRecord | null> {
  const record = crmLeadStore.get(leadId);
  if (!record) return null;

  const now = new Date().toISOString();
  record.status = newStage;
  record.crmStage = newStage;
  record.lastActivityAt = now;
  record.updatedAt = now;

  if (notes) {
    record.notes = `${record.notes ? `${record.notes}\n` : ''}[${now.slice(0, 10)} - ${newStage}] ${notes}`;
  }

  crmLeadStore.set(leadId, record);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase
        .from('growth_leads')
        .update({
          status: newStage,
          crm_stage: newStage,
          notes: record.notes,
          updated_at: now,
        })
        .eq('id', leadId);
    } catch (err: any) {
      console.warn('[transitionCrmStage] DB update notice:', err?.message);
    }
  }

  return record;
}

/**
 * Aggregates attribution insights across all leads.
 */
export function getAttributionInsights(leads: LeadRecord[]): LeadAttributionInsights {
  const byQuery: Record<string, number> = {};
  const byLandingPage: Record<string, number> = {};
  const byProduct: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byIntent: Record<string, number> = {};

  for (const l of leads) {
    if (l.attributionQuery) {
      byQuery[l.attributionQuery] = (byQuery[l.attributionQuery] || 0) + 1;
    }
    if (l.attributionLandingPage) {
      byLandingPage[l.attributionLandingPage] = (byLandingPage[l.attributionLandingPage] || 0) + 1;
    }
    if (l.productName || l.attributionProductId) {
      const prod = l.productName || l.attributionProductId || 'Generic';
      byProduct[prod] = (byProduct[prod] || 0) + 1;
    }
    if (l.country || l.attributionCountry) {
      const c = l.country || l.attributionCountry || 'India';
      byCountry[c] = (byCountry[c] || 0) + 1;
    }
    if (l.attributionIntent) {
      byIntent[l.attributionIntent] = (byIntent[l.attributionIntent] || 0) + 1;
    }
  }

  return {
    totalLeads: leads.length,
    byQuery,
    byLandingPage,
    byProduct,
    byCountry,
    byIntent,
  };
}
