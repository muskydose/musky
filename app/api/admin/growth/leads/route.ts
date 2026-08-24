import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdminAuthenticated, verifyAdminCsrfAndOrigin } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getLeads, saveLeadRecord } from '@/lib/growth/growth-db';

export async function GET(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }

    const leads = await getLeads();
    return NextResponse.json({ success: true, leads });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch leads.');
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }
    if (!verifyAdminCsrfAndOrigin(req)) {
      return NextResponse.json({ success: false, error: 'Forbidden: CSRF / Origin mismatch' }, { status: 403 });
    }

    const body = await req.json();
    if (!body || !body.businessName || !body.phone) {
      return NextResponse.json({ success: false, error: 'Business name and contact phone are required' }, { status: 400 });
    }

    const cleanPhone = String(body.phone).replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json({ success: false, error: 'Valid phone number required' }, { status: 400 });
    }

    const id = body.id || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const leadRecord = {
      id,
      businessName: String(body.businessName).trim(),
      contactName: String(body.contactName || 'Primary Contact').trim(),
      phone: cleanPhone,
      whatsapp: body.whatsapp ? String(body.whatsapp).replace(/\D/g, '') : cleanPhone,
      email: body.email ? String(body.email).trim() : undefined,
      leadType: body.leadType || 'Wholesaler',
      state: body.state || 'Rajasthan',
      district: body.district || undefined,
      city: body.city || undefined,
      pincode: body.pincode || undefined,
      address: body.address || undefined,
      source: body.source || 'Manual Admin Entry',
      interestedProducts: Array.isArray(body.interestedProducts) ? body.interestedProducts : [],
      status: body.status || 'New',
      priority: body.priority || 'MEDIUM',
      assignedTo: body.assignedTo || undefined,
      notes: body.notes || undefined,
      nextFollowUp: body.nextFollowUp || undefined,
      lastContactedAt: body.lastContactedAt || undefined,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveLeadRecord(leadRecord);
    return NextResponse.json({ success: true, lead: leadRecord });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to save CRM lead.');
  }
}
