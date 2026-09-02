import { NextRequest, NextResponse } from 'next/server';
import { saveLead } from '@/lib/growth/lead-engine';
import { CentralLeadType, LeadCaptureSource } from '@/lib/growth/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !body.mobile) {
      return NextResponse.json(
        { success: false, error: 'Mobile / WhatsApp number is required' },
        { status: 400 }
      );
    }

    const cleanPhone = String(body.mobile).replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 10-digit mobile number' },
        { status: 400 }
      );
    }

    const name = String(body.name || 'Valued Customer').trim().substring(0, 100);
    const leadType = (body.leadType as CentralLeadType) || 'RETAIL';
    const source = (body.source as LeadCaptureSource) || 'WHATSAPP_CTA';
    const requirement = body.requirement ? String(body.requirement).trim().substring(0, 1000) : undefined;
    const quantity = body.quantity ? String(body.quantity).trim().substring(0, 50) : undefined;
    const productId = body.productId ? String(body.productId).trim() : undefined;
    const productName = body.productName ? String(body.productName).trim() : undefined;
    const categoryId = body.categoryId ? String(body.categoryId).trim() : undefined;
    const landingPage = body.landingPage ? String(body.landingPage).trim() : '/';
    const sourceQuery = body.sourceQuery ? String(body.sourceQuery).trim() : undefined;
    const email = body.email ? String(body.email).trim().substring(0, 254) : undefined;

    const lead = await saveLead({
      name,
      mobile: cleanPhone,
      whatsapp: body.whatsapp ? String(body.whatsapp).replace(/\D/g, '') : cleanPhone,
      email,
      leadType,
      source,
      sourceQuery,
      landingPage,
      productId,
      productName,
      categoryId,
      requirement,
      quantity,
    });

    // Generate prefilled WhatsApp deep link
    const waPhone = '919876543210'; // Default support / sales WhatsApp
    const waText = `Namaste Musky Dose! My name is ${name}. I am interested in ${productName || 'Pure Sojat Henna Powder'}${quantity ? ` (Quantity: ${quantity})` : ''}.${requirement ? ` Requirement: ${requirement}` : ''}`;
    const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`;

    return NextResponse.json({
      success: true,
      leadId: lead.leadId,
      leadScore: lead.leadScore,
      intentLevel: lead.intentLevel,
      status: lead.status,
      whatsappUrl,
    });
  } catch (error: any) {
    console.error('[POST /api/leads/capture] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to capture lead.' },
      { status: 500 }
    );
  }
}

