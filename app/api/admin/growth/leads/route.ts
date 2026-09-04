import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import {
  getAllLeads,
  saveLead,
  updateLeadStatus,
  calculateLeadSummaryMetrics,
  calculateLeadFunnel,
  getLeadFollowUpRecommendation,
  getLeadById,
} from '@/lib/growth/lead-engine';
import { CentralLeadStatus, CentralLeadType, LeadCaptureSource } from '@/lib/growth/types';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as CentralLeadStatus | 'ALL' | null;
    const leadType = searchParams.get('leadType') as CentralLeadType | 'ALL' | null;
    const priority = searchParams.get('priority') as any;
    const search = searchParams.get('search') || undefined;

    const leads = getAllLeads({
      status: status || undefined,
      leadType: leadType || undefined,
      priority: priority || undefined,
      search,
    });

    const allLeads = getAllLeads();
    const summaryMetrics = calculateLeadSummaryMetrics(allLeads);
    const funnel = calculateLeadFunnel(allLeads);

    return NextResponse.json({
      success: true,
      leads,
      summaryMetrics,
      funnel,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch leads.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const body = await req.json();
    if (!body) {
      return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });
    }

    // 1. Follow-Up Recommendation request
    if (body.action === 'GET_FOLLOW_UP' && body.leadId) {
      const lead = getLeadById(body.leadId);
      if (!lead) {
        return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
      }
      const recommendation = getLeadFollowUpRecommendation(lead);
      return NextResponse.json({ success: true, recommendation, lead });
    }

    // 2. Update Lead Status / Workflow / Quote Progression
    if (body.action === 'UPDATE_STATUS' && body.leadId && body.status) {
      const updated = updateLeadStatus(body.leadId, body.status as CentralLeadStatus, {
        notes: body.notes,
        assignedTo: body.assignedTo,
        convertedOrderId: body.convertedOrderId,
        quoteAmount: body.quoteAmount !== undefined ? Number(body.quoteAmount) : undefined,
        quoteNotes: body.quoteNotes,
        priority: body.priority,
      });
      const recommendation = getLeadFollowUpRecommendation(updated);
      return NextResponse.json({ success: true, lead: updated, recommendation });
    }

    // 3. Manual Lead Creation / Update
    const phone = body.phone || body.mobile;
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Contact phone / mobile number is required' },
        { status: 400 }
      );
    }

    const name = (body.name || body.contactName || 'Primary Contact').trim();
    const businessName = body.businessName ? String(body.businessName).trim() : undefined;
    const city = body.city ? String(body.city).trim() : undefined;
    const state = body.state ? String(body.state).trim() : undefined;
    const leadType = (body.leadType as CentralLeadType) || 'WHOLESALE';
    const source = (body.source as LeadCaptureSource) || 'MANUAL_ENTRY';

    const lead = await saveLead({
      name,
      businessName,
      city,
      state,
      mobile: String(phone),
      whatsapp: body.whatsapp ? String(body.whatsapp) : undefined,
      email: body.email ? String(body.email).trim() : undefined,
      leadType,
      source,
      requirement: body.requirement || body.notes || undefined,
      quantity: body.quantity || undefined,
      productId: body.productId || undefined,
      productName: body.productName || (Array.isArray(body.interestedProducts) ? body.interestedProducts[0] : undefined),
      notes: body.notes,
      assignedTo: body.assignedTo,
      quoteAmount: body.quoteAmount !== undefined ? Number(body.quoteAmount) : undefined,
      quoteNotes: body.quoteNotes,
      status: body.status,
      priority: body.priority,
    });

    const recommendation = getLeadFollowUpRecommendation(lead);

    return NextResponse.json({ success: true, lead, recommendation });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to save lead.');
  }
}

