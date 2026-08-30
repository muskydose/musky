import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getLeads, saveLeadRecord } from '@/lib/growth/growth-db';
import { GrowthLead, LeadType, LeadStatus } from '@/lib/growth/types';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const leads = await getLeads();
    return NextResponse.json({ success: true, leads });
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
    if (!body || !body.businessName || !body.phone) {
      return NextResponse.json({ success: false, error: 'Business name and contact phone are required' }, { status: 400 });
    }

    const cleanPhone = String(body.phone).replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 15) {
      return NextResponse.json({ success: false, error: 'Valid phone number required (10-15 digits)' }, { status: 400 });
    }

    const id = body.id || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const leadRecord: GrowthLead = {
      id,
      businessName: String(body.businessName).trim().substring(0, 150),
      contactName: String(body.contactName || 'Primary Contact').trim().substring(0, 100),
      phone: cleanPhone,
      whatsapp: body.whatsapp ? String(body.whatsapp).replace(/\D/g, '').substring(0, 15) : cleanPhone,
      email: body.email ? String(body.email).trim().substring(0, 254) : undefined,
      leadType: (body.leadType as LeadType) || 'Wholesaler',
      state: body.state ? String(body.state).substring(0, 100) : 'Rajasthan',
      district: body.district ? String(body.district).substring(0, 100) : undefined,
      city: body.city ? String(body.city).substring(0, 100) : undefined,
      pincode: body.pincode ? String(body.pincode).substring(0, 20) : undefined,
      address: body.address ? String(body.address).substring(0, 500) : undefined,
      source: body.source ? String(body.source).substring(0, 100) : 'Manual Admin Entry',
      interestedProducts: Array.isArray(body.interestedProducts) ? body.interestedProducts.slice(0, 50) : [],
      status: (body.status as LeadStatus) || 'New',
      priority: body.priority ? (String(body.priority) as any) : 'MEDIUM',
      assignedTo: body.assignedTo ? String(body.assignedTo).substring(0, 100) : undefined,
      notes: body.notes ? String(body.notes).substring(0, 2000) : undefined,
      nextFollowUp: body.nextFollowUp ? String(body.nextFollowUp).substring(0, 50) : undefined,
      lastContactedAt: body.lastContactedAt ? String(body.lastContactedAt).substring(0, 50) : undefined,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveLeadRecord(leadRecord);
    return NextResponse.json({ success: true, lead: leadRecord });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to save CRM lead.');
  }
}
