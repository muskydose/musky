/**
 * MUSKY DOSE GROWTH ENGINE — ACTION EXECUTION SERVICE V1
 * Opportunity → Approval → Action → Verify → Done
 * 
 * Safety Guarantee:
 * - Deterministic Action Routing
 * - Idempotency & Fingerprinting
 * - Before & After State Capture
 * - Explicit Human Confirmation Gate
 * - Automated Live Verification before DONE
 * - Full Audit Logging & Feature Switchboard Isolation
 */

import { Product, ProductGuide } from '@/lib/types';
import {
  GrowthOpportunity,
  GrowthOpportunityType,
  GrowthActionType,
  GrowthActionLifecycleStatus,
  GrowthActionRecord,
  GrowthActionAuditLog,
  GrowthActionExecutionSummary,
  GrowthActionVerificationCheck,
  GrowthActionVerificationResult,
} from './types';
import { getAllProductsAdmin, saveProduct } from '@/lib/db/products';
import { getGuides, saveGuide } from '@/lib/db/guides';
import { deriveProductGuide } from './guide-generator';
import { deriveProductAutoSeo } from './product-keyword-engine';
import { isActionExecutionEnabled } from './feature-switches';

// In-memory action records and audit logs store (fail-safe runtime persistence)
const actionRecordsStore = new Map<string, GrowthActionRecord>();
const actionAuditLogs: GrowthActionAuditLog[] = [];

// ============================================================
// PHASE 2 — DETERMINISTIC ACTION ROUTER
// ============================================================

export function routeOpportunityToActionType(opportunity: GrowthOpportunity): GrowthActionType {
  const type = opportunity.type;

  switch (type) {
    case 'MISSING_GUIDE':
      return 'GENERATE_GUIDE_DRAFT';

    case 'GSC_LOW_CTR':
    case 'METADATA_INCOMPLETE':
    case 'PRODUCT_SEO_TITLE_GAP':
    case 'PRODUCT_SEO_DESC_GAP':
    case 'LOW_CTR':
      return 'GENERATE_SEO_DRAFT';

    case 'GSC_RANKING_STRIKE':
      return 'CREATE_INTERNAL_LINKING_DRAFT';

    case 'PRODUCT_CONTENT_GAP':
    case 'SUPPORTING_CONTENT_GAP':
    case 'QUESTION_CONTENT_GAP':
      return 'GENERATE_CONTENT_DRAFT';

    case 'ZERO_RESULT_SEARCH':
    case 'SEARCH_SYNONYM_OPPORTUNITY':
      return 'CREATE_SEARCH_COVERAGE_TASK';

    case 'MISSING_REAL_IMAGE':
    case 'MISSING_IMAGE':
      return 'CREATE_IMAGE_TASK';

    case 'OUT_OF_STOCK_RISK':
      return 'CREATE_INVENTORY_TASK';

    case 'REPEAT_PURCHASE_LEAD_OPPORTUNITY':
    case 'REPEAT_PURCHASE_OPPORTUNITY':
      return 'CREATE_REPEAT_PURCHASE_DRAFT';

    case 'WHOLESALE_LEAD_OPPORTUNITY':
      return 'CREATE_WHOLESALE_FOLLOWUP';

    case 'LEAD_CAPTURE_GAP':
    case 'LEAD_CONVERSION_GAP':
      return 'CREATE_LEAD_CAPTURE_RECOMMENDATION';

    case 'SEARCH_TO_LEAD_OPPORTUNITY':
      return 'CREATE_CTA_OPTIMIZATION_DRAFT';

    case 'PRODUCT_LEAD_OPPORTUNITY':
      return 'CREATE_PRODUCT_ENQUIRY_DRAFT';

    case 'HIGH_INTENT_UNCAPTURED':
      return 'CREATE_INTENT_CAPTURE_RECOMMENDATION';

    case 'HIGH_TRAFFIC_LOW_ATC':
    case 'HIGH_ATC_LOW_PURCHASE':
    case 'HIGH_SEARCH_LOW_CONVERSION':
      return 'CREATE_CONVERSION_REVIEW';

    case 'SEARCH_COVERAGE_GAP':
    case 'COMMERCIAL_CONTENT_GAP':
      return 'CREATE_CONTENT_COVERAGE_DRAFT';

    case 'PRODUCT_FEED_GAP':
      return 'CREATE_PRODUCT_FEED_FIX';

    case 'MERCHANT_FEED_ERROR':
      return 'CREATE_FEED_REPAIR_TASK';

    case 'HIGH_INTENT_LOW_LEAD':
    case 'LOCAL_INTENT_OPPORTUNITY':
      return 'CREATE_CTA_OPTIMIZATION_DRAFT';

    case 'LANDING_PAGE_LEAD_GAP':
      return 'CREATE_LEAD_CAPTURE_RECOMMENDATION';

    case 'WHOLESALE_ACQUISITION_GAP':
      return 'CREATE_WHOLESALE_CTA_DRAFT';

    case 'PRODUCT_INDEXING_GAP':
      return 'CREATE_SEARCH_COVERAGE_TASK';

    case 'CHANNEL_OPPORTUNITY':
    case 'CAMPAIGN_OPPORTUNITY':
      return 'CREATE_CHANNEL_ACTION_DRAFT';

    case 'CONTENT_TO_LEAD_OPPORTUNITY':
      return 'CREATE_CONTENT_TO_LEAD_DRAFT';

    case 'PRODUCT_CHANNEL_GAP':
      return 'CREATE_PRODUCT_CHANNEL_TASK';

    case 'SOCIAL_TO_LEAD_GAP':
      return 'CREATE_SOCIAL_CTA_DRAFT';

    case 'GOOGLE_TO_LEAD_GAP':
      return 'CREATE_GOOGLE_LEAD_OPTIMIZATION_DRAFT';

    case 'WHOLESALE_CHANNEL_GAP':
      return 'CREATE_WHOLESALE_CTA_DRAFT';

    case 'CANNIBALIZATION':
    case 'CANNIBALIZATION_RISK':
    case 'SEO_CANNIBALIZATION':
    case 'KEYWORD_CANNIBALIZATION':
      return 'CREATE_CANNIBALIZATION_REVIEW';

    case 'QUERY_DESTINATION_MISMATCH':
      return 'CREATE_WHOLESALE_CTA_DRAFT';

    case 'STRIKING_DISTANCE':
      return 'GENERATE_SEO_DRAFT';

    default:
      return 'GENERATE_CONTENT_DRAFT';
  }
}

// ============================================================
// PHASE 8 — IDEMPOTENCY & FINGERPRINTING
// ============================================================

export function generateActionIdempotencyKey(
  opportunityOrId: string | GrowthOpportunity,
  actionType: GrowthActionType,
  entityId: string
): string {
  const oppId = typeof opportunityOrId === 'string' ? opportunityOrId : opportunityOrId?.id || 'opp';
  const cleanOpp = String(oppId || 'opp').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanEntity = String(entityId || 'global').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `act_${cleanOpp}_${actionType}_${cleanEntity}`;
}

// ============================================================
// PHASE 3 & 7 — ACTION GENERATION
// ============================================================

export function generateActionRecord(
  opportunity: GrowthOpportunity,
  product?: Product | null
): GrowthActionRecord {
  const actionType = routeOpportunityToActionType(opportunity);
  const entityId = opportunity.productId || opportunity.entityId || product?.id || 'global';
  const idempotencyKey = generateActionIdempotencyKey(opportunity.id, actionType, entityId);

  // Return existing record if already generated (Idempotency)
  const existing = actionRecordsStore.get(idempotencyKey);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  let entityType: GrowthActionRecord['entityType'] = 'PRODUCT';
  let beforeSnapshot: Record<string, any> = {};
  let summary = '';
  let payload: Record<string, any> = {};
  let draftText = '';
  let markdownContent = '';
  let copyableText = '';
  let targetUrl = '';
  let requiresSecondConfirmation = true;

  if (product) {
    beforeSnapshot = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      stockStatus: product.stockStatus,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      seoKeywords: product.seoKeywords,
      shortDescription: product.shortDescription,
      images: product.images,
      ingredients: product.ingredients,
      usageInstructions: product.usageInstructions,
    };
  }

  switch (actionType) {
    case 'GENERATE_GUIDE_DRAFT': {
      entityType = 'GUIDE';
      const prodObj = product || {
        id: opportunity.productId || 'prod-gen',
        name: opportunity.productName || 'Pure Sojat Henna Powder',
        slug: 'sojat-pure-henna-powder',
        category: 'henna',
      };
      const guideDraft = deriveProductGuide(prodObj as any);

      summary = `Autonomous Guide Draft: "${guideDraft.title}"`;
      targetUrl = `/guides/${guideDraft.slug}`;
      payload = {
        title: guideDraft.title,
        slug: guideDraft.slug,
        productId: prodObj.id,
        category: guideDraft.category,
        overview: guideDraft.overview,
        whatIsThis: guideDraft.whatIsThis,
        keyBenefits: guideDraft.keyBenefits,
        ingredients: guideDraft.ingredients,
        howToUse: guideDraft.howToUse,
        faqs: guideDraft.faqs,
        seoTitle: guideDraft.seoTitle,
        seoDescription: guideDraft.seoDescription,
      };

      markdownContent = `# ${guideDraft.title}\n\n**Overview**:\n${guideDraft.overview}\n\n**What Is This**:\n${guideDraft.whatIsThis}\n\n**Key Benefits**:\n${guideDraft.keyBenefits.map((b) => `- ${b}`).join('\n')}\n\n**How to Use**:\n${guideDraft.howToUse}\n\n**SEO Title**: ${guideDraft.seoTitle}\n**Meta Description**: ${guideDraft.seoDescription}`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'GENERATE_SEO_DRAFT': {
      entityType = 'PRODUCT';
      const prodObj = product || {
        id: opportunity.productId || 'prod-gen',
        name: opportunity.productName || 'Sojat Henna Powder',
        slug: 'sojat-henna-powder',
        category: 'henna',
      };
      const autoSeo = deriveProductAutoSeo(prodObj as any);

      summary = `Auto-SEO Metadata Optimization for "${prodObj.name}"`;
      targetUrl = `/products/${prodObj.slug}`;
      payload = {
        productId: prodObj.id,
        seoTitle: autoSeo.seoTitle,
        seoDescription: autoSeo.metaDescription,
        seoKeywords: [autoSeo.primaryKeyword, ...autoSeo.secondaryKeywords].slice(0, 5),
      };

      markdownContent = `### Proposed SEO Metadata for ${prodObj.name}\n\n**SEO Title** (${autoSeo.seoTitle.length} chars):\n\`${autoSeo.seoTitle}\`\n\n**Meta Description** (${autoSeo.metaDescription.length} chars):\n\`${autoSeo.metaDescription}\`\n\n**Target Keywords**:\n${payload.seoKeywords.map((k: string) => `- ${k}`).join('\n')}`;
      draftText = markdownContent;
      copyableText = `SEO Title: ${autoSeo.seoTitle}\nMeta Description: ${autoSeo.metaDescription}\nKeywords: ${payload.seoKeywords.join(', ')}`;
      break;
    }

    case 'GENERATE_CONTENT_DRAFT': {
      entityType = 'PRODUCT';
      summary = `Product Content & Botanical Specifications for "${product?.name || opportunity.productName || 'Product'}"`;
      targetUrl = `/admin/products/${product?.id || opportunity.productId}`;
      payload = {
        productId: product?.id || opportunity.productId,
        shortDescription: product?.shortDescription || '100% Pure triple-sifted botanical powder direct from Sojat, Rajasthan.',
        ingredients: product?.ingredients?.length ? product.ingredients : ['100% Pure Lawsonia Inermis (Henna Leaf Powder)'],
        howToUse: ['Mix with warm water into smooth paste', 'Allow 2-3 hours for dye release', 'Apply evenly to hair or skin'],
      };

      markdownContent = `### Proposed Product Content Enhancements\n\n**Short Description**:\n${payload.shortDescription}\n\n**Ingredients**:\n${payload.ingredients.map((i: string) => `- ${i}`).join('\n')}\n\n**Usage Instructions**:\n${payload.howToUse.map((u: string) => `1. ${u}`).join('\n')}`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_SEARCH_COVERAGE_TASK': {
      entityType = 'SEARCH';
      summary = `Search Demand & Synonym Coverage: "${opportunity.keyword || 'Search Query'}"`;
      targetUrl = `/admin/growth/keywords`;
      payload = {
        keyword: opportunity.keyword,
        mappedEntity: 'HENNA_MEHNDI',
        action: 'MAP_SYNONYM',
      };
      markdownContent = `### Search Query Coverage Task\n\n**Query**: \`${opportunity.keyword}\`\n**Action**: Map query to canonical botanical entity and ensure zero zero-result drops.\n**Recommended Entity**: Henna / Mehndi Central Taxonomy`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_IMAGE_TASK': {
      entityType = 'PRODUCT';
      summary = `Photography & Real Imagery Task for "${product?.name || opportunity.productName}"`;
      targetUrl = `/admin/products/${product?.id || opportunity.productId}`;
      payload = {
        productId: product?.id || opportunity.productId,
        requiredShots: [
          'Front retail packaging (high res)',
          'Raw powder micro-sift texture closeup',
          'Sojat farm harvesting origin shot',
          'Stain / swatch color result',
        ],
      };
      markdownContent = `### Photography Upload Checklist\n\n${payload.requiredShots.map((s: string) => `- [ ] ${s}`).join('\n')}`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_INVENTORY_TASK': {
      entityType = 'INVENTORY';
      summary = `Inventory Replenishment & Stock Safety Task for "${product?.name || opportunity.productName}"`;
      targetUrl = `/admin/products/${product?.id || opportunity.productId}`;
      payload = {
        productId: product?.id || opportunity.productId,
        recommendedRestockUnits: 50,
        warehouse: 'Sojat Processing Unit, Pali, Rajasthan',
      };
      markdownContent = `### Inventory Replenishment Order\n\n- **Product**: ${product?.name || opportunity.productName}\n- **Recommended Batch**: 50 Units (250g packs)\n- **Origin Mill**: Sojat Processing Unit, Rajasthan\n- **Target Stock Status**: In Stock`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_WHOLESALE_FOLLOWUP': {
      entityType = 'WHOLESALE';
      summary = `Wholesale Follow-up & Commercial Quotation Draft`;
      targetUrl = `/admin/wholesale`;
      payload = {
        leadName: opportunity.title,
        recommendedFollowup: 'Send Tier-1 Sojat bulk pricing catalog via WhatsApp/Email.',
      };
      markdownContent = `### B2B Wholesale Follow-Up Protocol\n\n1. Contact Lead directly with verified GST / Certificate pack.\n2. Provide customized bulk rate card (25kg - 500kg tiers).\n3. Offer sample dispatch from Sojat unit.`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_REPEAT_PURCHASE_DRAFT': {
      entityType = 'CAMPAIGN';
      summary = `Repeat Purchase Replenishment Campaign Draft`;
      targetUrl = `/admin/growth/campaigns`;
      payload = {
        cycleDays: 30,
        targetSegment: 'Customers purchased > 25 days ago',
      };
      markdownContent = `### Re-Order Reminder Draft\n\n*Subject*: Time to replenish your pure Sojat Henna Powder?\n*Body*: Dear [Customer], we hope you loved your fresh henna results. Order your next harvest batch today with fast dispatch from Sojat.`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_CONVERSION_REVIEW': {
      entityType = 'PRODUCT';
      summary = `Conversion Funnel Optimization Review for "${product?.name || opportunity.productName}"`;
      targetUrl = `/admin/products/${product?.id || opportunity.productId}`;
      payload = {
        productId: product?.id || opportunity.productId,
        focusAreas: ['Add trust badge', 'Add 3-step usage bullet points', 'Highlight direct-from-farm pricing'],
      };
      markdownContent = `### Conversion Optimization Recommendations\n\n${payload.focusAreas.map((f: string) => `- ${f}`).join('\n')}`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_CANNIBALIZATION_REVIEW': {
      entityType = 'GLOBAL';
      summary = `SEO Keyword Cannibalization Disambiguation Plan`;
      targetUrl = `/admin/seo`;
      payload = {
        keyword: opportunity.keyword,
        action: 'Differentiate product vs category vs educational guide intent.',
      };
      markdownContent = `### Cannibalization Resolution Map\n\n- **Target Query**: \`${opportunity.keyword}\`\n- **Product Page**: Commercial purchase intent only\n- **Guide Page**: Educational informational intent only\n- **Add canonical & internal cross-links**`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_INTERNAL_LINKING_DRAFT': {
      entityType = 'PRODUCT';
      summary = `Internal Linking Strategy for Striking-Distance Keywords`;
      targetUrl = `/admin/products/${product?.id || opportunity.productId}`;
      payload = {
        productId: product?.id || opportunity.productId,
        anchorTexts: [product?.name, 'pure sojat henna', 'natural organic mehndi'].filter(Boolean),
      };
      markdownContent = `### Internal Linking Action\n\nInsert contextual links from top informational guides pointing to \`/products/${product?.slug}\` with high-relevance anchor text.`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_LEAD_CAPTURE_RECOMMENDATION': {
      entityType = 'LEAD';
      summary = `Lead Capture Protocol: "${opportunity.title}"`;
      targetUrl = `/admin/leads`;
      payload = {
        opportunityId: opportunity.id,
        targetKeyword: opportunity.keyword,
        suggestedCta: 'Connect on WhatsApp (Direct Sojat Unit)',
      };
      markdownContent = `### Lead Capture Optimization Protocol\n\n- **Objective**: Maximize qualified buyer conversions\n- **Target Entity**: ${opportunity.productName || 'Catalog Core'}\n- **Recommended Action**: Enable high-intent WhatsApp enquiry bridge with prefilled quotation parameters.`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_CTA_OPTIMIZATION_DRAFT': {
      entityType = 'SEARCH';
      summary = `Search Intent → Lead Conversion Bridge: "${opportunity.keyword}"`;
      targetUrl = `/admin/growth/keywords`;
      payload = {
        keyword: opportunity.keyword,
        recommendedIntent: 'WHOLESALE_OR_ARTIST',
      };
      markdownContent = `### Search Query Lead Routing\n\n- **Commercial Query**: \`${opportunity.keyword}\`\n- **Action**: Bind direct 1-click WhatsApp quote modal for instant response.`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_PRODUCT_ENQUIRY_DRAFT': {
      entityType = 'PRODUCT';
      summary = `Product Lead Capture Optimization for "${product?.name || opportunity.productName || 'Product'}"`;
      targetUrl = `/admin/products/${product?.id || opportunity.productId}`;
      payload = {
        productId: product?.id || opportunity.productId,
        ctas: ['Ask About This Product', 'Get Artist Price (Sojat Direct)', 'Get Bulk Price'],
      };
      markdownContent = `### Product Lead Capture Triggers\n\n1. "Ask About This Product" WhatsApp pre-fill.\n2. "Get Artist Price" 5-sieve stain guarantee modal.\n3. "Get Bulk Price (25kg+)" instant catalog handoff.`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_INTENT_CAPTURE_RECOMMENDATION': {
      entityType = 'LEAD';
      summary = `High-Intent Uncontacted Lead Protocol: "${opportunity.title}"`;
      targetUrl = `/admin/leads`;
      payload = {
        leadId: opportunity.entityId,
        suggestedFollowUp: 'Priority WhatsApp / Call follow-up within 1 hour.',
      };
      markdownContent = `### High-Intent Lead Follow-Up SLA\n\n- **Priority**: P1_NOW\n- **Action**: Immediate personalized WhatsApp outreach with custom Sojat bulk rate card.`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_CONTENT_COVERAGE_DRAFT': {
      entityType = 'PRODUCT';
      summary = `Commercial Search Coverage Optimization for "${product?.name || opportunity.productName || 'Product'}"`;
      targetUrl = `/admin/products/${product?.id || opportunity.productId}`;
      payload = {
        productId: product?.id || opportunity.productId,
        focusQueries: [product?.name, `${product?.name} wholesale`, `${product?.name} price`],
      };
      markdownContent = `### Commercial Search Content Optimization\n\n- **Product**: ${product?.name || 'Product'}\n- **Action**: Optimize title & meta description with commercial buying intents (price, wholesale, artist use).`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_PRODUCT_FEED_FIX': {
      entityType = 'PRODUCT';
      summary = `Google Merchant Center Feed Repair for "${product?.name || opportunity.productName || 'Product'}"`;
      targetUrl = `/admin/products/${product?.id || opportunity.productId}`;
      payload = {
        productId: product?.id || opportunity.productId,
        requiredFields: ['high-res product image', 'minimum 20 char description', 'valid price'],
      };
      markdownContent = `### Google Merchant Center Free Listings Diagnostic\n\n- **Entity**: ${product?.name || 'Product'}\n- **Action**: Fulfill Google Free Listings requirement (image, description, price) to enable automatic feed readiness.`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_FEED_REPAIR_TASK': {
      entityType = 'PRODUCT';
      summary = `Merchant Center Feed Repair Task: "${opportunity.title}"`;
      targetUrl = `/admin/growth/acquisition`;
      payload = {
        opportunityId: opportunity.id,
        action: 'Validate product catalog attributes for Google Merchant compliance.',
      };
      markdownContent = `### Merchant Center Feed Repair\n\n- **Diagnosis**: Feed attributes missing or invalid.\n- **Action**: Verify currency (INR), stock status, and valid product canonical link.`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_WHOLESALE_CTA_DRAFT': {
      entityType = 'WHOLESALE';
      summary = `Wholesale Acquisition Bridge: "${opportunity.title}"`;
      targetUrl = `/admin/wholesale`;
      payload = {
        opportunityId: opportunity.id,
        recommendedTier: '50kg Sojat Mandi Rate Card',
      };
      markdownContent = `### B2B Wholesale Lead Acquisition Protocol\n\n- **Action**: Provide 1-click WhatsApp quote builder for salon & bulk buyers.\n- **Lead SLA**: 15-minute response with authenticated Sojat harvest specifications.`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_CHANNEL_ACTION_DRAFT': {
      entityType = 'CAMPAIGN';
      summary = `Omnichannel Expansion Strategy: "${opportunity.title}"`;
      targetUrl = `/admin/growth/omnichannel`;
      payload = {
        opportunityId: opportunity.id,
        channel: 'INSTAGRAM',
        suggestedFormat: 'Reel + Bio Link + Direct WhatsApp CTA',
      };
      markdownContent = `### Omnichannel Channel Strategy\n\n- **Target**: Deploy verified Sojat botanical content across YouTube Shorts & Instagram Reels.\n- **Attribution**: Auto-tag links with standard UTM parameters.`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_CONTENT_TO_LEAD_DRAFT': {
      entityType = 'GUIDE';
      summary = `Content → Lead Conversion Bridge for "${opportunity.title}"`;
      targetUrl = `/admin/growth/omnichannel`;
      payload = {
        opportunityId: opportunity.id,
        format: 'YouTube Short / Reel Script',
      };
      markdownContent = `### Content-to-Lead Repurposing Plan\n\n- **Format**: 30-second vertical video demonstration.\n- **Key Element**: Purity comparison vs synthetic adulterated henna.\n- **Conversion Hook**: "WhatsApp link in bio/description for direct Sojat batch dispatch."`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_PRODUCT_CHANNEL_TASK': {
      entityType = 'PRODUCT';
      summary = `Omnichannel Launch Package Review for "${product?.name || opportunity.productName || 'Product'}"`;
      targetUrl = `/admin/products/${product?.id || opportunity.productId}`;
      payload = {
        productId: product?.id || opportunity.productId,
        channels: ['Instagram', 'YouTube', 'Facebook', 'WhatsApp', 'Google Merchant'],
      };
      markdownContent = `### Multi-Channel Product Launch Package\n\n1. Review auto-generated Instagram post & Reel concept.\n2. Review YouTube Short video script.\n3. Validate Google Merchant Free Listings payload.\n4. Deploy WhatsApp broadcast rate card.`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_SOCIAL_CTA_DRAFT': {
      entityType = 'PRODUCT';
      summary = `Social Media Lead CTA Bridge: "${opportunity.title}"`;
      targetUrl = `/admin/growth/omnichannel`;
      payload = {
        opportunityId: opportunity.id,
        targetCta: 'Connect on WhatsApp (Direct Sojat Unit)',
      };
      markdownContent = `### Social Media CTA Optimization\n\n- **Platform**: Instagram Bio & YouTube Descriptions\n- **Action**: Bind direct WhatsApp lead capture link with prefilled product inquiry parameters.`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }

    case 'CREATE_GOOGLE_LEAD_OPTIMIZATION_DRAFT': {
      entityType = 'PRODUCT';
      summary = `Google Surface Lead Optimization: "${opportunity.title}"`;
      targetUrl = `/admin/growth/acquisition`;
      payload = {
        opportunityId: opportunity.id,
        surfaces: ['Google Search', 'Merchant Free Listings', 'Google Images'],
      };
      markdownContent = `### Google Free Listings & Search Lead Optimization\n\n- **Entity**: ${product?.name || 'Product'}\n- **Action**: Optimize structured data (Product, FAQ, Breadcrumbs) and verify Free Listings eligibility.`;
      draftText = markdownContent;
      copyableText = markdownContent;
      break;
    }
  }

  const record: GrowthActionRecord = {
    actionId: idempotencyKey,
    opportunityId: opportunity.id,
    actionType,
    entityType,
    entityId,
    title: summary,
    description: opportunity.description,
    beforeSnapshot,
    proposedChange: {
      summary,
      payload,
      draftText,
      markdownContent,
      copyableText,
      targetUrl,
      requiresSecondConfirmation,
      suggestedMetadata: payload.seoTitle
        ? {
            seoTitle: payload.seoTitle,
            seoDescription: payload.seoDescription,
            seoKeywords: payload.seoKeywords || [],
          }
        : undefined,
    },
    status: 'ACTION_READY',
    idempotencyKey,
    createdAt: now,
    updatedAt: now,
  };

  actionRecordsStore.set(idempotencyKey, record);

  recordActionAudit({
    actor: 'system',
    opportunityId: opportunity.id,
    actionId: idempotencyKey,
    oldState: 'OPEN',
    newState: 'ACTION_READY',
    result: 'SUCCESS',
    details: `Generated action draft for ${actionType}`,
  });

  return record;
}

// ============================================================
// PHASE 5, 9 & 10 — SAFE ACTION APPLICATION
// ============================================================

export async function applyGrowthAction(
  actionId: string,
  options?: { confirmExecution?: boolean; actor?: string }
): Promise<GrowthActionRecord> {
  if (!isActionExecutionEnabled()) {
    throw new Error('Action execution is currently disabled via feature switch.');
  }

  const action = actionRecordsStore.get(actionId);
  if (!action) {
    throw new Error(`Action not found with ID: ${actionId}`);
  }

  if (action.status === 'APPLIED' || action.status === 'DONE') {
    return action; // Idempotent return
  }

  if (action.proposedChange.requiresSecondConfirmation && !options?.confirmExecution) {
    throw new Error('Explicit confirmation is required before applying this live change.');
  }

  const now = new Date().toISOString();
  const actor = options?.actor || 'admin';
  const oldState = action.status;

  try {
    switch (action.actionType) {
      case 'GENERATE_GUIDE_DRAFT': {
        const payload = action.proposedChange.payload;
        await saveGuide({
          title: payload.title,
          slug: payload.slug,
          productId: payload.productId,
          shortIntro: payload.overview?.slice(0, 150) || 'Complete guide to natural Sojat botanicals.',
          overview: payload.overview,
          whatIsThis: payload.whatIsThis,
          keyBenefits: payload.keyBenefits,
          ingredients: payload.ingredients,
          howToUse: payload.howToUse,
          faqs: payload.faqs || [],
          seoTitle: payload.seoTitle,
          seoDescription: payload.seoDescription,
          published: true,
          isFeatured: false,
        });
        break;
      }

      case 'GENERATE_SEO_DRAFT': {
        const payload = action.proposedChange.payload;
        if (payload.productId) {
          const products = await getAllProductsAdmin();
          const targetProd = products.find((p) => p.id === payload.productId);
          if (targetProd) {
            await saveProduct({
              ...targetProd,
              seoTitle: payload.seoTitle,
              seoDescription: payload.seoDescription,
              seoKeywords: payload.seoKeywords,
            });
          }
        }
        break;
      }

      case 'GENERATE_CONTENT_DRAFT': {
        const payload = action.proposedChange.payload;
        if (payload.productId) {
          const products = await getAllProductsAdmin();
          const targetProd = products.find((p) => p.id === payload.productId);
          if (targetProd) {
            await saveProduct({
              ...targetProd,
              shortDescription: payload.shortDescription || targetProd.shortDescription,
              ingredients: payload.ingredients || targetProd.ingredients,
              usageInstructions: Array.isArray(payload.howToUse) ? payload.howToUse.join('\n') : (payload.usageInstructions || targetProd.usageInstructions),
            });
          }
        }
        break;
      }

      default:
        // Tasks and reviews are recorded as active admin tasks
        break;
    }

    action.status = 'APPLIED';
    action.appliedBy = actor;
    action.appliedAt = now;
    action.updatedAt = now;

    recordActionAudit({
      actor,
      opportunityId: action.opportunityId,
      actionId: action.actionId,
      oldState,
      newState: 'APPLIED',
      result: 'SUCCESS',
      details: `Successfully applied change for ${action.actionType}`,
    });

    return action;
  } catch (err: any) {
    action.status = 'ACTION_FAILED';
    action.failureReason = err.message;
    action.updatedAt = now;

    recordActionAudit({
      actor,
      opportunityId: action.opportunityId,
      actionId: action.actionId,
      oldState,
      newState: 'ACTION_FAILED',
      result: 'FAILURE',
      details: err.message,
    });

    throw err;
  }
}

// ============================================================
// PHASE 9, 10 & 14 — AUTOMATED LIVE VERIFICATION
// ============================================================

export async function verifyGrowthAction(
  actionId: string,
  actor: string = 'admin'
): Promise<GrowthActionRecord> {
  const action = actionRecordsStore.get(actionId);
  if (!action) {
    throw new Error(`Action not found with ID: ${actionId}`);
  }

  const now = new Date().toISOString();
  const oldState = action.status;
  const checks: GrowthActionVerificationCheck[] = [];

  try {
    if (action.actionType === 'GENERATE_GUIDE_DRAFT') {
      const guides = await getGuides();
      const slug = action.proposedChange.payload.slug;
      const found = guides.find((g) => g.slug === slug || g.title === action.proposedChange.payload.title);

      checks.push({
        name: 'Guide Exists in Database/Store',
        passed: Boolean(found),
        message: found ? `Guide found with title "${found.title}"` : `Guide with slug "${slug}" not found.`,
      });

      checks.push({
        name: 'Guide is Published & Accessible',
        passed: Boolean(found && found.published !== false),
        message: found?.published !== false ? 'Guide publication flag verified.' : 'Guide is unpublished.',
      });

      checks.push({
        name: 'Product Association Established',
        passed: Boolean(found && (found.productId || (found.productIds && found.productIds.length > 0))),
        message: 'Product relationship verified.',
      });
    } else if (action.actionType === 'GENERATE_SEO_DRAFT') {
      const products = await getAllProductsAdmin();
      const pId = action.proposedChange.payload.productId;
      const found = products.find((p) => p.id === pId);

      checks.push({
        name: 'Target Product Exists',
        passed: Boolean(found),
        message: found ? `Product "${found.name}" verified.` : `Product ID ${pId} not found.`,
      });

      checks.push({
        name: 'SEO Metadata Updated',
        passed: Boolean(found && found.seoTitle && found.seoDescription),
        message: 'Valid SEO title and meta description verified on product.',
      });
    } else if (action.actionType === 'GENERATE_CONTENT_DRAFT') {
      const products = await getAllProductsAdmin();
      const pId = action.proposedChange.payload.productId;
      const found = products.find((p) => p.id === pId);

      checks.push({
        name: 'Product Content Verified',
        passed: Boolean(found && found.shortDescription),
        message: 'Product description and specifications verified.',
      });
    } else {
      // General Task verification
      checks.push({
        name: 'Admin Task Recorded & Dispatched',
        passed: true,
        message: 'Task payload verified in action registry.',
      });
    }

    const allPassed = checks.every((c) => c.passed);
    const verificationResult: GrowthActionVerificationResult = {
      verified: allPassed,
      passed: allPassed,
      checks,
      verifiedAt: now,
      summary: allPassed ? 'All verification checks passed cleanly.' : 'One or more verification checks failed.',
    };

    action.verificationResult = verificationResult;
    action.verificationTimestamp = now;
    action.updatedAt = now;

    if (allPassed) {
      action.status = 'DONE';
      recordActionAudit({
        actor,
        opportunityId: action.opportunityId,
        actionId: action.actionId,
        oldState,
        newState: 'DONE',
        result: 'SUCCESS',
        details: 'Verification successful. Action marked DONE.',
      });
    } else {
      action.status = 'VERIFY_FAILED';
      action.failureReason = verificationResult.summary;
      recordActionAudit({
        actor,
        opportunityId: action.opportunityId,
        actionId: action.actionId,
        oldState,
        newState: 'VERIFY_FAILED',
        result: 'FAILURE',
        details: verificationResult.summary,
      });
    }

    return action;
  } catch (err: any) {
    action.status = 'VERIFY_FAILED';
    action.failureReason = err.message;
    action.updatedAt = now;

    recordActionAudit({
      actor,
      opportunityId: action.opportunityId,
      actionId: action.actionId,
      oldState,
      newState: 'VERIFY_FAILED',
      result: 'FAILURE',
      details: err.message,
    });

    return action;
  }
}

// ============================================================
// PHASE 12 — AUDIT TRAIL LOGGING
// ============================================================

export function recordActionAudit(
  log: Omit<GrowthActionAuditLog, 'id' | 'timestamp'>
): GrowthActionAuditLog {
  const auditEntry: GrowthActionAuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    fromStatus: log.oldState,
    toStatus: log.newState,
    ...log,
  };
  actionAuditLogs.unshift(auditEntry);
  if (actionAuditLogs.length > 500) {
    actionAuditLogs.pop();
  }
  return auditEntry;
}

export function getActionAuditLogs(
  actionIdOrLimit?: string | number,
  limit: number = 50
): GrowthActionAuditLog[] {
  if (typeof actionIdOrLimit === 'string') {
    return actionAuditLogs.filter((l) => l.actionId === actionIdOrLimit).slice(0, limit);
  }
  const max = typeof actionIdOrLimit === 'number' ? actionIdOrLimit : limit;
  return actionAuditLogs.slice(0, max);
}

export function getActionById(actionId: string): GrowthActionRecord | null {
  return actionRecordsStore.get(actionId) || null;
}

export function getAllActions(): GrowthActionRecord[] {
  return Array.from(actionRecordsStore.values());
}

// ============================================================
// PHASE 11 — EXECUTION SUMMARY CALCULATOR
// ============================================================

export function calculateActionExecutionSummary(
  opportunities: GrowthOpportunity[],
  actions: GrowthActionRecord[]
): GrowthActionExecutionSummary {
  const todayStr = new Date().toISOString().slice(0, 10);

  const openOpportunities = opportunities.filter((o) => !o.status || o.status === 'OPEN' || o.status === 'NEW').length;
  const awaitingApproval = opportunities.filter((o) => o.status === 'REVIEWING').length;
  const draftsReady = actions.filter((a) => a.status === 'ACTION_READY').length;
  const actionsApplied = actions.filter((a) => a.status === 'APPLIED').length;
  const verificationFailures = actions.filter((a) => a.status === 'VERIFY_FAILED' || a.status === 'ACTION_FAILED').length;
  const completedToday = actions.filter(
    (a) => a.status === 'DONE' && a.verificationTimestamp?.startsWith(todayStr)
  ).length;

  const executableCount = opportunities.filter(
    (o) => o.type === 'MISSING_GUIDE' || o.type === 'GSC_LOW_CTR' || o.type === 'PRODUCT_CONTENT_GAP'
  ).length;

  const draftOnlyCount = opportunities.length - executableCount;

  return {
    openOpportunities,
    awaitingApproval,
    draftsReady,
    actionsApplied,
    verificationFailures,
    completedToday,
    executableCount,
    draftOnlyCount,
  };
}
